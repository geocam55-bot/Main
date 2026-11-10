import { GoogleGenAI, Type } from '@google/genai';

const FALLBACK_API_KEY = process.env.GEMINI_API_KEY || '';

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { fileData, docType, fieldsToExtract } = req.body || {};
    if (!fileData) {
      return res.status(400).json({ error: "No file data has been supplied." });
    }

    const parts = fileData.match(/^data:(.*);base64,(.*)$/);
    if (!parts) {
      return res.status(400).json({ error: "Format error: Provided data URI is malformed." });
    }

    const mimeType = parts[1];
    const base64Data = parts[2];

    const apiKey = process.env.GEMINI_API_KEY || FALLBACK_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "" && apiKey.trim() !== "undefined") {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: { 'User-Agent': 'aistudio-build' }
          }
        });

        const fieldListPrompt = Object.entries(fieldsToExtract || {})
          .map(([key, fObj]: [string, any]) => `- "${key}" (${fObj.label || key}): Extract the exact value found in the document.`)
          .join("\n");

        const hasSkuBox = Object.keys(fieldsToExtract || {}).some(k => k.toLowerCase().includes("sku box") || (fieldsToExtract[k]?.label || "").toLowerCase().includes("sku box"));

        const prompt = `You are a high-precision corporate logistics document OCR parser.
Extract the exact values for the requested fields from this document.
The document type is: ${docType || 'Sales Order / Invoice'}

Requested fields to extract:
${fieldListPrompt}

CRITICAL RULES:
1. DO NOT add, infer, or hallucinate any information that is not explicitly visible in the document.
2. DO NOT return any extra fields that are not in the "Requested fields to extract" list.
3. For any requested fields that are missing, unavailable, or cannot be parsed directly from the document text, you MUST reply with "N/A" rather than a blank or simulated value.
4. Ensure all textual items match the document exactly without changing spelling or casing where editable. 
${hasSkuBox ? `5. SPECIAL INSTRUCTION FOR "SKU BOX":
When extracting the "SKU BOX" field, this represents the Cargo Manifest table of items for the sales order invoice.
Extract the line items from the SKU Box table columns going Left to Right:
LINE (line index), ORDERED (quantity ordered), SKU (product item code), DESCRIPTION (item description/specs), UNITS (UOM e.g. PC, EA, SHT, BAG, BOX, LF), PRICE/ PER (unit price), EXTENSION (extended total price).
Return the result for "SKU BOX" as a valid JSON stringified array of objects:
[{"line": 1, "ordered": "40", "sku": "...", "description": "...", "units": "PC", "pricePer": "$21.45", "extension": "$858.00"}]
If no items table is found, return an empty array string "[]".` : ''}
Return the structured results in the required JSON format.`;

        const properties = {};
        const requiredFields = [];
        Object.keys(fieldsToExtract || {}).forEach((fieldKey) => {
          properties[fieldKey] = {
            type: Type.STRING,
            description: `Extracted string content for "${fieldKey}"`
          };
          requiredFields.push(fieldKey);
        });

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data
                }
              },
              {
                text: prompt
              }
            ]
          },
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties,
              required: requiredFields
            },
            temperature: 0.1
          }
        });

        const textResult = response.text;
        if (textResult) {
          const parsedJson = JSON.parse(textResult);
          let extractedCargoManifest = [];
          if (parsedJson["SKU BOX"]) {
            try {
              const rawSkuBox = parsedJson["SKU BOX"];
              if (typeof rawSkuBox === 'string') {
                extractedCargoManifest = JSON.parse(rawSkuBox);
              } else if (Array.isArray(rawSkuBox)) {
                extractedCargoManifest = rawSkuBox;
              }
            } catch (e) {}
          }

          return res.status(200).json({
            success: true,
            data: parsedJson,
            cargoManifest: extractedCargoManifest.length > 0 ? extractedCargoManifest : undefined,
            source: 'gemini_vision_ocr'
          });
        }
      } catch (geminiErr) {
        console.warn("[Serverless OCR] Gemini Vision extraction failed, using fallback parser:", geminiErr);
      }
    }

    // Real PDF text extraction fallback if Gemini is not configured or failed
    if (mimeType.includes("pdf") || base64Data.startsWith("JVBER")) {
      try {
        const buffer = Buffer.from(base64Data, 'base64');
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const doc = await pdfjsLib.getDocument({
          data: new Uint8Array(buffer),
          isEvalSupported: false,
          useSystemFonts: true
        }).promise;

        let fullRawText = '';
        const allItems = [];
        for (let p = 1; p <= doc.numPages; p++) {
          const page = await doc.getPage(p);
          const content = await page.getTextContent();
          content.items.forEach(it => {
            if (it.str && it.str.trim()) {
              allItems.push({
                str: it.str.trim(),
                x: it.transform ? it.transform[4] : 0,
                y: it.transform ? it.transform[5] : 0
              });
            }
          });
          const pageStr = content.items.map(it => it.str).join(' ');
          fullRawText += (fullRawText ? '\n' : '') + pageStr;
        }

        if (fullRawText.trim().length > 10) {
          // Find Header Y for items table
          let headerY = -1;
          allItems.forEach(it => {
            if (/LINE/i.test(it.str) || /DESCRIPTION/i.test(it.str) || /ORDERED/i.test(it.str)) {
              if (headerY === -1 || it.y > headerY) headerY = it.y;
            }
          });

          // Group table items below header
          const manifestItems = [];
          if (headerY > 0) {
            const rowsByY = new Map();
            allItems.forEach(it => {
              if (it.y >= headerY - 4 || it.y < 70) return;
              const bucketY = Math.round(it.y / 4) * 4;
              if (!rowsByY.has(bucketY)) rowsByY.set(bucketY, []);
              rowsByY.get(bucketY).push(it);
            });

            const sortedYs = Array.from(rowsByY.keys()).sort((a, b) => b - a);
            for (const y of sortedYs) {
              const row = rowsByY.get(y).sort((a, b) => a.x - b.x);
              const rowText = row.map(r => r.str).join(' ');
              if (rowText.toLowerCase().includes('ship via') || rowText.toLowerCase().includes('received by')) continue;

              const lineMatch = rowText.match(/^(\d{1,3})\s+(.*)$/);
              if (lineMatch) {
                const lineNum = parseInt(lineMatch[1]);
                const rest = lineMatch[2];
                const qtyMatch = rest.match(/^(\d+)\s+(?:([A-Z]{2,4})\s+)?(?:([0-9A-Z]{5,12})\s+)?(.+?)(?:\s+YARD|\s+\$|\s*$)/i);
                manifestItems.push({
                  line: lineNum,
                  ordered: qtyMatch ? (qtyMatch[1] || '1') : '1',
                  units: qtyMatch ? (qtyMatch[2] || 'EA') : 'EA',
                  sku: qtyMatch ? (qtyMatch[3] || 'N/A') : 'N/A',
                  description: (qtyMatch ? (qtyMatch[4] || rest) : rest).replace(/\s+(YARD|AISLE|STORE)\s*.*$/i, '').trim(),
                  pricePer: 'N/A',
                  extension: 'N/A'
                });
              }
            }
          }

          // Semantic extraction of fields
          const extractedData = {};
          
          // Order #
          let detectedOrder = '';
          const orderNumCandidates = allItems.filter((it) => 
            it.y >= 500 && /^\d{5,8}$/.test(it.str)
          );
          if (orderNumCandidates.length > 0) {
            detectedOrder = orderNumCandidates[orderNumCandidates.length - 1].str;
          } else {
            const orderMatch = fullRawText.match(/\b(?:SO#?|Sales\s*Order|REQUEST:?)\s*[:#\.-]?\s*([A-Za-z0-9-]{4,12})\b/i);
            if (orderMatch) detectedOrder = orderMatch[1];
            else {
              const digitMatch = fullRawText.match(/\b(\d{5,8})\b/);
              if (digitMatch) detectedOrder = digitMatch[1];
            }
          }

          // Date
          let detectedDate = '';
          const dateMatch = fullRawText.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/) || fullRawText.match(/\b(\d{4}-\d{2}-\d{2})\b/);
          if (dateMatch) detectedDate = dateMatch[1];

          // Customer and Ship To
          let detectedCustomer = '';
          let detectedAddress = '';

          // Look for SHIP TO section
          const shipToLabel = allItems.find(it => /SHIP\s*TO/i.test(it.str));
          if (shipToLabel) {
            const shipToItems = allItems.filter(it => 
              it.x >= shipToLabel.x - 10 && 
              it.x <= shipToLabel.x + 130 && 
              it.y < shipToLabel.y - 2 && 
              it.y >= shipToLabel.y - 50
            );
            shipToItems.sort((a, b) => (Math.abs(a.y - b.y) > 3 ? b.y - a.y : a.x - b.x));
            if (shipToItems.length > 0) {
              detectedCustomer = shipToItems[0].str;
              detectedAddress = shipToItems.slice(1).map(s => s.str).join(' ');
            }
          }

          if (!detectedCustomer) {
            const custMatch = fullRawText.match(/(?:Customer|Sold\s*To|Deliver\s*To|Client)\s*[:\-]?\s*([A-Za-z0-9\s.,&'-]+)/i);
            if (custMatch) detectedCustomer = custMatch[1].split('\n')[0].trim();
          }

          if (!detectedAddress) {
            const addrMatch = fullRawText.match(/(?:^|[\s,;])(\d{1,5}\s+[A-Za-z]+(?:\s+[A-Za-z0-9]+)*\s+(?:Lane|St|Street|Rd|Road|Ave|Avenue|Hwy|Highway|Dr|Drive|Way|Blvd|Court|Ct|Pl)\b[A-Za-z0-9\s.,#-]*[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d?)/i);
            if (addrMatch) detectedAddress = addrMatch[1].replace(/\s+(?:TAX|REQUEST|DEL|DATE|TERMS|HST).*$/i, '').trim();
          }

          // Populate requested fields
          Object.keys(fieldsToExtract || {}).forEach((fieldKey) => {
            const lower = fieldKey.toLowerCase();
            if (lower.includes("sku box") || lower.includes("manifest") || lower.includes("items")) {
              extractedData[fieldKey] = JSON.stringify(manifestItems);
            } else if (lower.includes('order') || lower.includes('invoice') || lower.includes('so#')) {
              extractedData[fieldKey] = detectedOrder || 'N/A';
            } else if (lower.includes('date')) {
              extractedData[fieldKey] = detectedDate || 'N/A';
            } else if (lower.includes('customer') || lower.includes('name')) {
              extractedData[fieldKey] = detectedCustomer || 'N/A';
            } else if (lower.includes('ship') || lower.includes('address')) {
              extractedData[fieldKey] = detectedAddress || 'N/A';
            } else {
              extractedData[fieldKey] = 'N/A';
            }
          });

          return res.status(200).json({
            success: true,
            data: extractedData,
            cargoManifest: manifestItems.length > 0 ? manifestItems : undefined,
            source: "serverless_pdf_extraction"
          });
        }
      } catch (pdfErr) {
        console.warn("[Serverless OCR] Real PDF extraction exception:", pdfErr);
      }
    }

    // Signal to the client to run real in-browser OCR on the actual document
    return res.status(200).json({
      success: false,
      fallbackToBrowserOcr: true,
      message: "Serverless AI OCR unconfigured. Performing client-side OCR extraction directly in browser."
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "OCR error", fallbackToBrowserOcr: true });
  }
}
