import fs from 'fs';
let code = fs.readFileSync('src/scripts/pricing-agent.ts', 'utf-8');

// Replace extractPricing function with more robust selector & text fallback
const oldExtract = `async function extractPricing(page, comp, query) {  if (!query) return null;    const searchUrl = comp.search_url_template.replace('{query}', encodeURIComponent(query));  console.log(\`Searching \${comp.name} for "\${query}"...\`);    try {    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });        // Wait a moment for dynamic content    await new Promise(r => setTimeout(r, 3000));        const match = await page.evaluate(() => {      const textText = document.body.innerText;      const priceMatches = textText.match(/\\$\\s*(\\d+[.,]\\d{2})/g);            let price = null;      if (priceMatches && priceMatches.length > 0) {         const cleanPrice = priceMatches[0].replace(/[^0-9.]/g, '');         price = parseFloat(cleanPrice);      }            const title = document.title || '';            if (price && !isNaN(price)) {         return { sellingPrice: price, productTitle: title, productUrl: window.location.href, availability: 'IN_STOCK' };      }      return null;    });    return match;  } catch (e) {    console.error(\`Error searching \${comp.name}:\`, e.message);    return null;  }}`;

const newExtract = `async function extractPricing(page, comp, query) {
  if (!query) return null;
  const searchUrl = comp.search_url_template.replace('{query}', encodeURIComponent(query));
  console.log(\`Searching \${comp.name} for "\${query}"...\`);
  try {
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));
    
    const match = await page.evaluate(() => {
      const priceSelectors = [
        '.price', '[data-testid*="price"]', '.regular-price', '.product-price',
        'span[class*="price"]', 'div[class*="price"]', '.pricing', '.su-price'
      ];
      let price = null;
      let productTitle = document.title || '';
      let productUrl = window.location.href;

      for (const sel of priceSelectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent) {
          const text = el.textContent.trim();
          const pMatch = text.match(/\\$?\\s*(\\d+[.,]\\d{2})/);
          if (pMatch) {
            const clean = pMatch[1].replace(',', '.');
            const val = parseFloat(clean);
            if (!isNaN(val) && val > 0 && val < 10000) {
              price = val;
              break;
            }
          }
        }
      }

      if (!price) {
        const textText = document.body.innerText;
        const priceMatches = textText.match(/\\$\\s*(\\d+[.,]\\d{2})/g);
        if (priceMatches && priceMatches.length > 0) {
          const cleanPrice = priceMatches[0].replace(/[^0-9.]/g, '');
          price = parseFloat(cleanPrice);
        }
      }

      if (price && !isNaN(price)) {
        return { sellingPrice: price, productTitle, productUrl, availability: 'IN_STOCK' };
      }
      return null;
    });
    return match;
  } catch (e) {
    console.error(\`Error searching \${comp.name}:\`, e.message);
    return null;
  }
}`;

if (code.includes('async function extractPricing')) {
  // Let's replace the whole file content or specific sections cleanly
}

// Instead, let's just rewrite the query options and extractPricing completely
const updatedFullCode = `import puppeteer from 'puppeteer-core';
import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const PUPPETEER_API_KEY = "2VDuIJVugfPh8IXc0400c7ace6aa3023befc2f3a70bac3c4a";

async function extractPricing(page, comp, query) {
  if (!query) return null;
  const searchUrl = comp.search_url_template.replace('{query}', encodeURIComponent(query));
  console.log(\`Searching \${comp.name} for "\${query}"...\`);
  try {
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));
    
    const match = await page.evaluate(() => {
      const priceSelectors = [
        '.price', '[data-testid*="price"]', '.regular-price', '.product-price',
        'span[class*="price"]', 'div[class*="price"]', '.pricing', '.su-price'
      ];
      let price = null;
      let productTitle = document.title || '';
      let productUrl = window.location.href;

      for (const sel of priceSelectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent) {
          const text = el.textContent.trim();
          const pMatch = text.match(/\\$?\\s*(\\d+[.,]\\d{2})/);
          if (pMatch) {
            const clean = pMatch[1].replace(',', '.');
            const val = parseFloat(clean);
            if (!isNaN(val) && val > 0 && val < 10000) {
              price = val;
              break;
            }
          }
        }
      }

      if (!price) {
        const textText = document.body.innerText;
        const priceMatches = textText.match(/\\$\\s*(\\d+[.,]\\d{2})/g);
        if (priceMatches && priceMatches.length > 0) {
          const cleanPrice = priceMatches[0].replace(/[^0-9.]/g, '');
          price = parseFloat(cleanPrice);
        }
      }

      if (price && !isNaN(price)) {
        return { sellingPrice: price, productTitle, productUrl, availability: 'IN_STOCK' };
      }
      return null;
    });
    return match;
  } catch (e) {
    console.error(\`Error searching \${comp.name}:\`, e.message);
    return null;
  }
}

async function runCompetitivePricing() {
  console.log("Starting Competitive Pricing Agent with Puppeteer (Remote Browser)...");
  
  const { data: competitors, error: compErr } = await supabase.from('competitors').select('*').eq('active', true);
  if (compErr || !competitors || competitors.length === 0) {
    console.error("Failed to fetch active competitors", compErr);
    return;
  }

  const { data: inventory, error: invErr } = await supabase.from('inventory').select('*');
  if (invErr || !inventory) {
    console.error("Failed to fetch inventory", invErr);
    return;
  }

  console.log(\`Found \${inventory.length} inventory items and \${competitors.length} active competitors.\`);

  const browserWSEndpoint = \`wss://chrome.browserless.io?token=\${PUPPETEER_API_KEY}\`;
  console.log("Connecting to remote browser...");
  let browser;
  try {
    browser = await puppeteer.connect({ browserWSEndpoint });
  } catch (err) {
    console.error("Failed to connect to remote browser:", err.message);
    return;
  }

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  for (const item of inventory) {
    console.log(\`\\nAnalyzing \${item.sku} - \${item.name} (\${item.description || ''})...\`);

    // Matching strictly on: UPC, MFG# (supplier_sku or mfg_part_number), DESCRIPTION, SKU, and NAME
    let queryOptions = [
      item.upc,
      item.supplier_sku,
      item.mfg_part_number,
      item.description,
      item.sku,
      item.name
    ].filter(Boolean);

    for (const comp of competitors) {
      let match = null;

      for (const query of queryOptions) {
        match = await extractPricing(page, comp, query);
        if (match) break;
      }

      if (match) {
        console.log(\`Found match on \${comp.name}: $\${match.sellingPrice}\`);

        let compProductId = null;
        const { data: existingCp } = await supabase
          .from('competitor_products')
          .select('id')
          .eq('competitor_id', comp.id)
          .eq('product_url', match.productUrl)
          .maybeSingle();

        if (existingCp) {
          compProductId = existingCp.id;
        } else {
          const { data: newCp } = await supabase
            .from('competitor_products')
            .insert({
              competitor_id: comp.id,
              product_url: match.productUrl,
              product_name: match.productTitle,
              availability: match.availability
            })
            .select('id')
            .single();
          compProductId = newCp?.id;
        }

        if (compProductId) {
          await supabase.from('product_matches').upsert({
            product_id: item.id,
            competitor_product_id: compProductId,
            match_confidence: 'HIGH'
          }, { onConflict: 'product_id, competitor_product_id' });

          await supabase.from('competitor_prices').insert({
            competitor_product_id: compProductId,
            current_price: match.sellingPrice,
            normalized_unit_price: match.sellingPrice,
            availability: match.availability,
          });

          await supabase.from('price_history').insert({
            product_id: item.id,
            competitor_id: comp.id,
            competitor_product_id: compProductId,
            price: match.sellingPrice,
            normalized_unit_price: match.sellingPrice,
          });
        }
      } else {
        console.log(\`No valid matches found on \${comp.name} for \${item.sku}.\`);
      }
    }
  }

  await browser.close();
  console.log("Competitive Pricing Agent finished.");
  
  await supabase.from("Notifications").insert([{
    Type: "Scraper Alert",
    Message: "The Competitive Pricing Agent has finished scraping all competitors.",
    IsRead: false,
    CreatedAt: new Date().toISOString()
  }]);
}

runCompetitivePricing();
`;

fs.writeFileSync('src/scripts/pricing-agent.ts', updatedFullCode);
console.log("Updated pricing-agent.ts with proper description, MFG#, and UPC query matching!");
