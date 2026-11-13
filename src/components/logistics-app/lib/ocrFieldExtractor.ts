export interface PositionedTextItem {
  str: string;
  x: number;
  y: number;
  normX: number;
  normY: number;
  normXEnd: number;
  page: number;
}

export interface TemplateFieldBox {
  label?: string;
  value?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  page?: number;
}

export interface CargoManifestExtractedItem {
  line: number;
  ordered: string;
  units: string;
  sku: string;
  description: string;
  pricePer: string;
  extension: string;
}

const FACTORY_DEFAULT_BOXES: Record<string, { x: number; y: number; w: number; h: number; page: number }> = {
  'Order #': { x: 500, y: 30, w: 125, h: 25, page: 1 },
  'Date': { x: 500, y: 65, w: 125, h: 22, page: 1 },
  'Customer Name': { x: 40, y: 115, w: 220, h: 22, page: 1 },
  'Ship To': { x: 40, y: 145, w: 250, h: 35, page: 1 },
  'SKU BOX': { x: 40, y: 200, w: 570, h: 220, page: 1 },
  'Subtotal': { x: 440, y: 615, w: 160, h: 25, page: 2 },
  'Gross Weight': { x: 440, y: 660, w: 160, h: 25, page: 2 }
};

function isFactoryDefaultBox(fieldKey: string, box?: TemplateFieldBox): boolean {
  if (!box || box.x === undefined || box.y === undefined || box.w === undefined || box.h === undefined) {
    return true;
  }
  const def = FACTORY_DEFAULT_BOXES[fieldKey];
  if (!def) return false;
  return (
    Math.abs(box.x - def.x) <= 2 &&
    Math.abs(box.y - def.y) <= 2 &&
    Math.abs(box.w - def.w) <= 2 &&
    Math.abs(box.h - def.h) <= 2 &&
    (box.page || 1) === def.page
  );
}

export function groupItemsIntoLines(items: PositionedTextItem[], yTolerance = 5): string[] {
  if (!items || items.length === 0) return [];
  const sorted = [...items].sort((a, b) => a.normY - b.normY || a.normX - b.normX);
  const rows: PositionedTextItem[][] = [];

  for (const item of sorted) {
    const lastRow = rows[rows.length - 1];
    if (lastRow && Math.abs(lastRow[0].normY - item.normY) <= yTolerance) {
      lastRow.push(item);
    } else {
      rows.push([item]);
    }
  }

  return rows
    .map(row =>
      row
        .sort((a, b) => a.normX - b.normX)
        .map(r => r.str.trim())
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter(Boolean);
}

function extractLinesInBox(items: PositionedTextItem[], box?: TemplateFieldBox): string[] {
  if (!box || box.x === undefined || box.y === undefined || box.w === undefined || box.h === undefined) {
    return [];
  }
  const targetPage = box.page || 1;
  const bx = box.x;
  const by = box.y;
  const bw = box.w;
  const bh = box.h;

  const matched = items.filter(it => {
    if (it.page !== targetPage) return false;
    const cx = (it.normX + it.normXEnd) / 2;
    const horizCenterInside = cx >= bx - 4 && cx <= bx + bw + 4;
    const horizSpanOverlaps = it.normX <= bx + bw && it.normXEnd >= bx + 6 && it.normX >= bx - 45;
    const vertInside = it.normY >= by + 1 && it.normY <= by + bh + 6;
    return (horizCenterInside || horizSpanOverlaps) && vertInside;
  });

  return groupItemsIntoLines(matched, 5);
}

function isStoreOrHeaderNoise(line: string): boolean {
  const s = line.trim();
  if (!s) return true;
  if (/^(?:SOLD\s*TO|BILL\s*TO|SHIP\s*TO|DELIVER\s*TO|CUSTOMER(?:\s*NAME)?|CUST\s*NO|JOB\s*NO|PURCHASE\s*ORDER|REFERENCE|TERMS|CLERK|DATE\s*\/?\s*TIME|TERMINAL|DEL\.?\s*DATE|SALESPERSON|TAX|ORDER\s*(?:NUMBER|NO|#)?|PHONE)\s*[:#.-]*$/i.test(s)) {
    return true;
  }
  if (/^RONA\s+(?:Inc\.|Elmsdale|Dartmouth|Tantallon|Halifax)/i.test(s)) return true;
  if (/^PHONE:\s*\(\d{3}\)/i.test(s)) return true;
  if (/^(?:CUST\s*NO|JOB\s*NO|TERMINAL|SALESPERSON|DEL\.?\s*DATE|TAX)\b/i.test(s)) return true;
  if (/^\d{3,6}\s+\d{3}$/.test(s)) return true; // e.g. "20961 000" from CUST NO / JOB NO row
  return false;
}

function stripCustomerPrefix(line: string): string {
  return line
    .replace(/^(?:SOLD\s*TO|BILL\s*TO|CUSTOMER(?:\s*NAME)?|SUPPLIER(?:\s*NAME)?|VENDOR|RECIPIENT|MANUFACTURER)\s*[:\-]*\s*/i, '')
    .trim();
}

function stripShipToPrefix(line: string): string {
  return line
    .replace(/^(?:SHIP\s*TO(?:\s*DESTINATION)?|DELIVER\s*TO|DELIVERY\s*ADDRESS|RETURN\s*DESTINATION)\s*[:\-]*\s*/i, '')
    .trim();
}

function extractOrderNumberFromBoxLines(lines: string[]): string {
  const joined = lines.join(' ').trim();
  if (!joined) return '';
  const cleaned = joined
    .replace(/^(?:ORDER\s*(?:NO|NUM|NUMBER|#)?|SALES\s*ORDER|SO\s*#|INVOICE\s*(?:NO|#)?|PO\s*#|RMA\s*#|CREDIT\s*NOTE\s*#)\s*[:#.-]*\s*/i, '')
    .trim();
  const match =
    cleaned.match(/\b([A-Z]{1,4}-\d{3,10}(?:-[A-Z0-9]+)?)\b/i) ||
    cleaned.match(/\b(\d{4,10})\b/) ||
    cleaned.match(/\b([A-Z0-9-]{4,14})\b/);
  if (match && /\d/.test(match[1])) {
    return match[1].trim();
  }
  return '';
}

function extractDateFromText(text: string): string {
  const m =
    text.match(/\b(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\b/) ||
    text.match(/\b(\d{4}-\d{2}-\d{2})\b/) ||
    text.match(/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b/i);
  return m ? m[1].trim() : '';
}

export function extractCargoManifestFromItems(items: PositionedTextItem[], fullRawText: string): CargoManifestExtractedItem[] {
  const parsedManifest: CargoManifestExtractedItem[] = [];

  if (items.length > 0) {
    let headerNormY = -1;
    let headerPage = 1;
    items.forEach(it => {
      if (/\bLINE\b/i.test(it.str) || /\bDESCRIPTION\b/i.test(it.str) || /\bORDERED\b/i.test(it.str)) {
        if (headerNormY === -1 || it.normY < headerNormY) {
          headerNormY = it.normY;
          headerPage = it.page;
        }
      }
    });

    if (headerNormY > 0) {
      const rowsByY = new Map<number, PositionedTextItem[]>();
      items.forEach(it => {
        if (it.page !== headerPage) return;
        if (it.normY <= headerNormY + 4 || it.normY > 790) return;
        const bucketY = Math.round(it.normY / 4) * 4;
        if (!rowsByY.has(bucketY)) rowsByY.set(bucketY, []);
        rowsByY.get(bucketY)!.push(it);
      });

      const sortedYs = Array.from(rowsByY.keys()).sort((a, b) => a - b);
      for (const y of sortedYs) {
        const row = rowsByY.get(y)!.sort((a, b) => a.normX - b.normX);
        const rowText = row.map(r => r.str).join(' ');
        if (/ship\s*via|received\s*by/i.test(rowText)) continue;

        const lineMatch = rowText.match(/^(\d{1,3})\s+(.*)$/);
        if (lineMatch) {
          const lineNum = parseInt(lineMatch[1], 10);
          const rest = lineMatch[2];
          const qtyMatch = rest.match(/^(\d+)\s+(?:([A-Z]{2,4})\s+)?(?:([0-9A-Z]{5,12})\s+)?(.+?)(?:\s+YARD|\s+\$|\s*$)/i);
          parsedManifest.push({
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
  }

  if (parsedManifest.length === 0 && fullRawText) {
    const rawLines = fullRawText.split('\n').map(l => l.trim()).filter(Boolean);
    let afterHeader = false;
    let lineCounter = 1;
    for (const line of rawLines) {
      if (/LINE\s+/i.test(line) || /DESCRIPTION/i.test(line) || /ORDERED/i.test(line)) {
        afterHeader = true;
        continue;
      }
      if (afterHeader) {
        if (/SUBTOTAL|TOTAL|RECEIVED\s+BY|TERMS|DATE/i.test(line)) break;
        const itemMatch = line.match(/^(\d{1,3})?\s*(\d+)\s+([A-Z]{2,4})?\s*([A-Za-z0-9-]{4,12})?\s+(.+)$/i);
        if (itemMatch) {
          parsedManifest.push({
            line: itemMatch[1] ? parseInt(itemMatch[1], 10) : lineCounter++,
            ordered: itemMatch[2] || '1',
            units: itemMatch[3] || 'EA',
            sku: itemMatch[4] || 'N/A',
            description: itemMatch[5].trim(),
            pricePer: 'N/A',
            extension: 'N/A'
          });
        }
      }
    }
  }

  return parsedManifest;
}

function detectOrderNumberHeuristic(items: PositionedTextItem[], fullRawText: string, preferPo = false): string {
  // 1. Look for explicit ORDER / SALES ORDER / INVOICE / SO# / PO# label in positioned items (exclude ORDERED / CUST NO / JOB NO / blank PURCHASE ORDER)
  const orderLabelItems = items.filter(it => {
    if (it.page !== 1) return false;
    if (/\bORDERED\b/i.test(it.str) || /\bCUST\b/i.test(it.str) || /\bJOB\b/i.test(it.str)) return false;
    if (!preferPo && /\bPURCHASE\s*ORDER\b/i.test(it.str)) return false;
    return /\b(?:ORDER|SALES\s*ORDER|SO\s*#|INVOICE)\s*[:#]?/i.test(it.str);
  });

  // Sort so exact "ORDER:" / "ORDER #" comes before other labels
  orderLabelItems.sort((a, b) => {
    const aExact = /^\s*ORDER\s*[:#]/i.test(a.str) ? 0 : 1;
    const bExact = /^\s*ORDER\s*[:#]/i.test(b.str) ? 0 : 1;
    return aExact - bExact || a.normY - b.normY;
  });

  for (const orderLabelItem of orderLabelItems) {
    const inlineMatch = orderLabelItem.str.match(/(?:ORDER|SALES\s*ORDER|SO\s*#|INVOICE(?:\s*NO)?)\s*[:#.-]*\s*([A-Z0-9-]*\d[A-Z0-9-]{2,12})/i);
    if (inlineMatch) {
      return inlineMatch[1].trim();
    }

    // Look to the right on the same visual row (allow 16px tolerance for larger ORDER font)
    const sameRowCandidates = items
      .filter(it =>
        it.page === orderLabelItem.page &&
        it !== orderLabelItem &&
        Math.abs(it.normY - orderLabelItem.normY) <= 16 &&
        it.normX >= orderLabelItem.normXEnd - 4 &&
        it.normX <= orderLabelItem.normXEnd + 240
      )
      .sort((a, b) => a.normX - b.normX);

    for (const cand of sameRowCandidates) {
      const m = cand.str.match(/\b([A-Z]{0,4}-?\d{4,10}(?:-[A-Z0-9]+)?)\b/i);
      if (m && /\d/.test(m[1]) && !/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(cand.str)) return m[1].trim();
    }

    // Look immediately below the label
    const belowCandidates = items
      .filter(it =>
        it.page === orderLabelItem.page &&
        it.normY > orderLabelItem.normY + 2 &&
        it.normY <= orderLabelItem.normY + 28 &&
        Math.abs(it.normX - orderLabelItem.normX) <= 45
      )
      .sort((a, b) => a.normY - b.normY);

    for (const cand of belowCandidates) {
      const m = cand.str.match(/\b([A-Z]{0,4}-?\d{4,10}(?:-[A-Z0-9]+)?)\b/i);
      if (m && /\d/.test(m[1]) && !/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(cand.str)) return m[1].trim();
    }
  }

  // 2. Regex on raw text with explicit label (requiring digits so words like "NUMBER" are never captured)
  const labelMatch =
    fullRawText.match(/\bORDER\s*:\s*([A-Z0-9-]*\d[A-Z0-9-]{2,12})\b/i) ||
    fullRawText.match(/\b(?:Sales\s*Order|SO\s*#|Order\s*(?:No|Num|Number|#)|Invoice\s*(?:No|#))\s*[:#.-]+\s*([A-Z0-9-]*\d[A-Z0-9-]{2,12})\b/i);
  if (labelMatch) {
    return labelMatch[1].trim();
  }

  // 3. Fallback: scan 5-8 digit numbers on page 1 excluding header metadata rows (CUST NO, PHONE, TAX, RT)
  const excludedLines = fullRawText
    .split('\n')
    .filter(l => /\b(?:CUST\s*NO|PHONE|TAX|RT\d+|SKU|CLERK|TERMINAL)\b/i.test(l))
    .join(' ');
  const digitMatches = Array.from(fullRawText.matchAll(/\b(\d{5,8})\b/g)).map(m => m[1]);
  const filtered = digitMatches.filter(num => !excludedLines.includes(num));
  if (filtered.length > 0) {
    return filtered[0];
  }
  return digitMatches[0] || '';
}

function detectCustomerAndShipToHeuristic(
  items: PositionedTextItem[],
  fullRawText: string
): { customer: string; address: string } {
  let detectedCustomer = '';
  let detectedAddress = '';

  if (items.length > 0) {
    const soldToLabel = items.find(it => it.page === 1 && /\b(?:SOLD\s*TO|BILL\s*TO)\b/i.test(it.str));
    const shipToLabel = items.find(it => it.page === 1 && /\b(?:SHIP\s*TO|DELIVER\s*TO)\b/i.test(it.str));

    if (soldToLabel) {
      const maxX =
        shipToLabel && shipToLabel.normX > soldToLabel.normX + 30
          ? shipToLabel.normX - 8
          : soldToLabel.normX + 210;

      const soldToItems = items.filter(it =>
        it.page === soldToLabel.page &&
        it.normX >= soldToLabel.normX - 15 &&
        it.normX <= maxX &&
        it.normY > soldToLabel.normY + 2 &&
        it.normY <= soldToLabel.normY + 80 &&
        !/\b(?:DEL\.?\s*DATE|SALESPERSON|ORDER:|LINE)\b/i.test(it.str)
      );

      const soldLines = groupItemsIntoLines(soldToItems, 5)
        .map(stripCustomerPrefix)
        .filter(l => l && !isStoreOrHeaderNoise(l));

      if (soldLines.length > 0) {
        detectedCustomer = soldLines[0];
      }
    }

    if (shipToLabel) {
      const minX =
        soldToLabel && shipToLabel.normX > soldToLabel.normX + 30
          ? Math.max(shipToLabel.normX - 15, soldToLabel.normX + 30)
          : shipToLabel.normX - 15;

      const shipToItems = items.filter(it =>
        it.page === shipToLabel.page &&
        it.normX >= minX &&
        it.normX <= shipToLabel.normX + 220 &&
        it.normY > shipToLabel.normY + 2 &&
        it.normY <= shipToLabel.normY + 80 &&
        !/\b(?:DEL\.?\s*DATE|SALESPERSON|ORDER:|TAX:|LINE)\b/i.test(it.str)
      );

      const shipLines = groupItemsIntoLines(shipToItems, 5)
        .map(stripShipToPrefix)
        .filter(l => l && !isStoreOrHeaderNoise(l));

      if (shipLines.length > 0) {
        // NEVER steal line 1 of Ship To as Customer Name when Ship To is an address (starts with street number) or SOLD TO exists
        if (!detectedCustomer && shipLines.length > 1 && !/^\d+\s+/.test(shipLines[0])) {
          detectedCustomer = shipLines[0];
          detectedAddress = shipLines.slice(1).join(' ');
        } else {
          detectedAddress = shipLines.join(' ');
        }
      }
    }
  }

  if (!detectedCustomer && fullRawText) {
    const custMatch = fullRawText.match(/(?:Sold\s*To|Bill\s*To|Customer(?:\s*Name)?|Client)\s*[:\-]?\s*([^\n\r]+)/i);
    if (custMatch) {
      const cand = stripCustomerPrefix(custMatch[1].trim()).split(/\s{2,}|\bSHIP\s*TO\b/i)[0].trim();
      if (cand && !isStoreOrHeaderNoise(cand) && !/^\d+\s+[A-Za-z]+\s+(?:Lane|St|Street|Rd|Road|Ave|Avenue|Cres|Cr|Dr|Drive|Hwy|Blvd|Way|Ct|Pl)\b/i.test(cand)) {
        detectedCustomer = cand;
      }
    }
  }

  if (!detectedAddress && fullRawText) {
    const shipMatch = fullRawText.match(/(?:Ship\s*To|Deliver\s*To|Delivery\s*Address)\s*[:\-]?\s*([^\n\r]+(?:\n[^\n\r]+){0,2})/i);
    if (shipMatch) {
      const shipLines = shipMatch[1]
        .split('\n')
        .map(l => stripShipToPrefix(l.trim()))
        .filter(l => l && !isStoreOrHeaderNoise(l) && !/^(?:DEL\.?\s*DATE|SALESPERSON|ORDER:|TAX:|LINE)\b/i.test(l));
      if (shipLines.length > 0) {
        detectedAddress = shipLines.join(' ');
      }
    }
  }

  if (!detectedAddress && fullRawText) {
    const addrMatch = fullRawText.match(/(?:^|[\s,;])(\d{1,5}\s+[A-Za-z]+(?:\s+[A-Za-z0-9]+)*\s+(?:Lane|St|Street|Rd|Road|Ave|Avenue|Cres|Crescent|Cr|Hwy|Highway|Dr|Drive|Way|Blvd|Court|Ct|Pl)\b[A-Za-z0-9\s.,#-]*[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d?)/i);
    if (addrMatch) {
      detectedAddress = addrMatch[1].replace(/\s+(?:TAX|REQUEST|DEL|DATE|TERMS|HST).*$/i, '').trim();
    }
  }

  return { customer: detectedCustomer, address: detectedAddress };
}

export function extractFieldsWithCoordinatesAndHeuristics(params: {
  items: PositionedTextItem[];
  fullRawText: string;
  fieldsToExtract: Record<string, TemplateFieldBox>;
  activeFieldKeys?: string[];
}): {
  extracted: Record<string, string>;
  cargoManifest: CargoManifestExtractedItem[];
} {
  const { items, fullRawText, fieldsToExtract, activeFieldKeys } = params;
  const fieldKeys = activeFieldKeys && activeFieldKeys.length > 0
    ? activeFieldKeys
    : Object.keys(fieldsToExtract || {});

  const parsedManifest = extractCargoManifestFromItems(items, fullRawText);
  const heuristicOrder = detectOrderNumberHeuristic(items, fullRawText);
  const heuristicDate = extractDateFromText(fullRawText);
  const { customer: heuristicCustomer, address: heuristicAddress } = detectCustomerAndShipToHeuristic(items, fullRawText);

  const weightMatch = fullRawText.match(/(\d[\d,]*\s*(?:lbs|lb|kg|tons?))\b/i);
  const heuristicWeight = weightMatch ? weightMatch[1].trim() : '';

  const priceMatch = fullRawText.match(/(?:SUBTOTAL|TOTAL)\s*[:$]?\s*\$?\s*(\d[\d,]*\.\d{2})/i) || fullRawText.match(/\$\s*(\d[\d,]*(?:\.\d{2})?)/);
  const heuristicSubtotal = priceMatch ? `$${priceMatch[1].replace(/^\$/, '')}` : '';

  const extracted: Record<string, string> = {};

  fieldKeys.forEach(fieldKey => {
    const box = fieldsToExtract?.[fieldKey];
    const lower = fieldKey.toLowerCase();
    const labelLower = (box?.label || '').toLowerCase();
    const isCustomBox = !isFactoryDefaultBox(fieldKey, box);
    const boxLines = isCustomBox ? extractLinesInBox(items, box) : [];

    // 1. SKU BOX / Cargo Manifest
    if (lower.includes('sku') || lower.includes('box') || lower.includes('manifest') || lower.includes('items')) {
      extracted[fieldKey] = JSON.stringify(parsedManifest);
      return;
    }

    // 2. Order # / Invoice # / PO# / SO# / RMA# / Credit Note #
    if (
      lower.includes('order') ||
      lower.includes('invoice') ||
      lower.includes('so#') ||
      lower.includes('po#') ||
      lower.includes('purchase order') ||
      lower.includes('rma') ||
      lower.includes('credit note') ||
      labelLower.includes('order number')
    ) {
      const fromBox = boxLines.length > 0 ? extractOrderNumberFromBoxLines(boxLines) : '';
      extracted[fieldKey] = fromBox || heuristicOrder || 'N/A';
      return;
    }

    // 3. Date
    if (lower.includes('date')) {
      const fromBox = boxLines.length > 0 ? extractDateFromText(boxLines.join(' ')) : '';
      extracted[fieldKey] = fromBox || heuristicDate || 'N/A';
      return;
    }

    // 4. Customer Name / Sold To / Supplier / Manufacturer
    if (
      lower.includes('customer') ||
      lower.includes('sold to') ||
      lower.includes('bill to') ||
      lower.includes('supplier') ||
      lower.includes('vendor') ||
      lower.includes('manufacturer') ||
      lower.includes('recipient') ||
      lower.includes('name')
    ) {
      const cleanedBoxLines = boxLines
        .map(stripCustomerPrefix)
        .filter(l => l && !isStoreOrHeaderNoise(l));
      const fromBox = cleanedBoxLines.length > 0 ? cleanedBoxLines[0] : '';
      extracted[fieldKey] = fromBox || heuristicCustomer || 'N/A';
      return;
    }

    // 5. Ship To / Delivery Address / Destination
    if (lower.includes('ship') || lower.includes('address') || lower.includes('destination')) {
      const cleanedBoxLines = boxLines
        .map(stripShipToPrefix)
        .filter(l => l && !isStoreOrHeaderNoise(l));
      const fromBox = cleanedBoxLines.length > 0 ? cleanedBoxLines.join(' ') : '';
      extracted[fieldKey] = fromBox || heuristicAddress || 'N/A';
      return;
    }

    // 6. Gross Weight
    if (lower.includes('weight')) {
      const boxText = boxLines.join(' ');
      const boxWeight = boxText.match(/(\d[\d,]*\s*(?:lbs|lb|kg|tons?))\b/i);
      extracted[fieldKey] = (boxWeight ? boxWeight[1] : '') || heuristicWeight || 'N/A';
      return;
    }

    // 7. Subtotal / Total
    if (lower.includes('subtotal') || lower.includes('total')) {
      const boxText = boxLines.join(' ');
      const boxPrice = boxText.match(/\$?\s*(\d[\d,]*\.\d{2})\b/);
      extracted[fieldKey] = (boxPrice ? `$${boxPrice[1]}` : '') || heuristicSubtotal || 'N/A';
      return;
    }

    // 8. Any custom user-mapped field box
    if (boxLines.length > 0) {
      const cleaned = boxLines.filter(l => !isStoreOrHeaderNoise(l));
      extracted[fieldKey] = cleaned.length > 0 ? cleaned.join(' ') : 'N/A';
    } else {
      extracted[fieldKey] = 'N/A';
    }
  });

  return { extracted, cargoManifest: parsedManifest };
}
