import puppeteer from 'puppeteer-core';
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
  
  if (comp.name.toLowerCase().includes('kent')) {
    console.log(`\n--- [KENT DIAGNOSTIC START] ---`);
    console.log(`[1] SENDING QUERY: "${query}"`);
    try {
      await page.goto('https://kent.ca', { waitUntil: 'networkidle2', timeout: 45000 });
      
      const searchSelector = '#search';
      await page.waitForSelector(searchSelector, { timeout: 10000 });
      
      await page.evaluate(() => { document.querySelector('#search').value = ''; });
      await page.type(searchSelector, query);
      
      // Press enter and wait for navigation as a single Promise.all block
      // to avoid race conditions with detached frames
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
        page.keyboard.press('Enter')
      ]);

      console.log(`[2] POST-SEARCH URL: ${page.url()}`);

      // Wait for real product data to load (avoiding skeleton loaders) or PDP
      try {
        await page.waitForFunction(() => {
          // Check for actual product prices in grid
          const priceEls = document.querySelectorAll('.product-item .price-box .price');
          for (const el of Array.from(priceEls)) {
            if (el.textContent && el.textContent.trim().length > 0 && el.textContent.includes('$')) {
              const val = parseFloat(el.textContent.replace(/[^0-9.]/g, ''));
              if (val > 0) return true;
            }
          }
          // Check for PDP (Product Detail Page) price - broad search
          const pdpPriceEls = document.querySelectorAll('.price, [data-price-type="finalPrice"], .product-info-price');
          for (const el of Array.from(pdpPriceEls)) {
             if (el.textContent && el.textContent.includes('$')) {
                const val = parseFloat(el.textContent.replace(/[^0-9.]/g, ''));
                if (val > 0 && val < 50000) return true;
             }
          }
          
          // Or check for a "no results" message
          const notice = document.querySelector('.message.notice, .message.info.empty');
          if (notice && notice.textContent && notice.textContent.trim().length > 0) {
            return true;
          }
          return false;
        }, { timeout: 15000 });
      } catch (e) {
        console.log(`[!] Timeout waiting for real product data, price > 0, or notice.`);
      }
      
      // Extract diagnostic info directly from the page
      const diag = await page.evaluate(() => {
        // Filter out skeleton loaders which typically lack an href in their link or have no price > 0
        const items = Array.from(document.querySelectorAll('.product-item')).filter(item => {
          const priceEl = item.querySelector('.price');
          if (!priceEl || !priceEl.textContent || !priceEl.textContent.includes('$')) return false;
          const val = parseFloat(priceEl.textContent.replace(/[^0-9.]/g, ''));
          return val > 0;
        });
        
        const isPDP = !!document.querySelector('.product-info-main');
        const notice = document.querySelector('.message.notice, .message.info.empty');
        let firstText = 'N/A';
        let firstHtml = 'N/A';
        let foundPrices = [];
        
        if (items.length > 0) {
          firstText = items[0].innerText.replace(/\s+/g, ' ').trim();
          firstHtml = items[0].innerHTML.substring(0, 300); // snippet
        } else if (isPDP) {
           const titleEl = document.querySelector('h1.page-title, .product-title');
           
           // Aggressively hunt for any valid price on the page
           const allPriceNodes = document.querySelectorAll('.price, span[id*="product-price"], [data-price-amount]');
           allPriceNodes.forEach(node => {
              if (node.textContent && node.textContent.includes('$')) {
                  const val = parseFloat(node.textContent.replace(/[^0-9.]/g, ''));
                  if (val > 0 && val < 50000) foundPrices.push(val);
              }
           });
           
           firstText = `[PDP] Title: ${titleEl ? titleEl.innerText : 'Unknown'} | Prices found: ${foundPrices.join(', ')}`;
           firstHtml = document.querySelector('.product-info-main') ? document.querySelector('.product-info-main').innerHTML.substring(0, 300) : 'N/A';
        }
        
        return {
          title: document.title,
          itemCount: items.length,
          isPDP,
          foundPrices,
          noticeText: notice ? notice.innerText.trim() : 'None',
          firstText,
          firstHtml
        };
      });

      console.log(`[3] SEARCH RETURNED: ${diag.itemCount} grid items found. Is PDP? ${diag.isPDP}`);
      if (diag.itemCount === 0 && !diag.isPDP) {
        console.log(`[4] PAGE NOTICE: ${diag.noticeText}`);
        console.log(`[4] PAGE TITLE: ${diag.title}`);
      } else {
        console.log(`[4] ITEM RAW TEXT: ${diag.firstText}`);
        console.log(`[5] ITEM HTML SNIPPET: ${diag.firstHtml}...`);
      }
      
      const match = await page.evaluate((fallbackPrices) => {
        const isPDP = !!document.querySelector('.product-info-main');
        
        if (isPDP) {
           const titleEl = document.querySelector('h1.page-title, .product-title');
           let price = null;
           
           // Primary extraction
           const priceEl = document.querySelector('.product-info-price .price, .price-box.price-final_price .price, [data-price-type="finalPrice"] .price, span[id*="product-price"]');
           if (priceEl && priceEl.textContent) {
             const text = priceEl.textContent.trim();
             const pMatch = text.match(/\$?\s*(\d+[.,]\d{2})/);
             if (pMatch) {
               const parsed = parseFloat(pMatch[1].replace(',', '.'));
               if (parsed > 0) price = parsed;
             }
           }
           
           // Fallback to the aggressively scraped prices if primary fails
           if (!price && fallbackPrices && fallbackPrices.length > 0) {
               // Use the lowest non-zero price found on the PDP (usually the sale/final price)
               price = Math.min(...fallbackPrices);
           }
           
           if (price && !isNaN(price) && price > 0) {
             return {
               sellingPrice: price,
               productTitle: titleEl ? titleEl.innerText.trim() : document.title,
               productUrl: window.location.href,
               availability: 'IN_STOCK'
             };
           }
           return null;
        }

        const productCards = Array.from(document.querySelectorAll('.product-item'));
        const realCard = productCards.find(item => {
          const price = item.querySelector('.price');
          if (!price || !price.textContent || !price.textContent.includes('$')) return false;
          const val = parseFloat(price.textContent.replace(/[^0-9.]/g, ''));
          return val > 0;
        });
        
        if (!realCard) return null;
        
        const titleEl = realCard.querySelector('.product-item-link');
        const gridPriceEl = realCard.querySelector('.price-box .price, .price');
        
        let gridPrice = null;
        if (gridPriceEl && gridPriceEl.textContent) {
          const text = gridPriceEl.textContent.trim();
          const pMatch = text.match(/\$?\s*(\d+[.,]\d{2})/);
          if (pMatch) {
            gridPrice = parseFloat(pMatch[1].replace(',', '.'));
          }
        }
        
        if (gridPrice && !isNaN(gridPrice) && gridPrice > 0) {
          return {
            sellingPrice: gridPrice,
            productTitle: titleEl ? titleEl.innerText.trim() : document.title,
            productUrl: titleEl && titleEl.href ? titleEl.href : window.location.href,
            availability: 'IN_STOCK'
          };
        }
        return null;
      }, diag.foundPrices);
      
      if (match) {
        console.log(`[6] MATCH SUCCESS: Parsed $${match.sellingPrice} for "${match.productTitle}"`);
      } else {
        console.log(`[6] MATCH FAILED: Could not parse a valid price/title from the first item.`);
      }
      
      console.log(`--- [KENT DIAGNOSTIC END] ---\n`);
      return match;
    } catch (e) {
      console.error(`[!] ERROR during Kent UI search:`, e.message);
      console.log(`--- [KENT DIAGNOSTIC END] ---\n`);
      return null;
    }
  }

  // Fallback for other competitors
  const searchUrl = comp.search_url_template.replace('{query}', encodeURIComponent(query));
  console.log(`Searching ${comp.name} for "${query}"...`);
  try {
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
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
          const pMatch = text.match(/\$?\s*(\d+[.,]\d{2})/);
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
        const priceMatches = textText.match(/\$\s*(\d+[.,]\d{2})/g);
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
    if (e.message.includes('net::ERR_HTTP2_PROTOCOL_ERROR')) {
       console.log(`[!] HTTP2 error searching ${comp.name} for ${query} (Ignoring due to target server restriction).`);
    } else {
       console.error(`Error searching ${comp.name}:`, e.message);
    }
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

  console.log(`Found ${inventory.length} inventory items and ${competitors.length} active competitors.`);

  const browserWSEndpoint = `wss://chrome.browserless.io?token=${PUPPETEER_API_KEY}`;
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
    console.log(`\nAnalyzing ${item.sku} - ${item.name} (${item.description || ''})...`);

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
        try {
          match = await extractPricing(page, comp, query);
        } catch (e) {
          console.error(`[!] Global search error for ${comp.name}: ${e.message}`);
          // If the page crashes or detaches, try to recreate it
          if (e.message.includes('detached Frame') || e.message.includes('Session closed')) {
            try {
              await page.close();
              page = await browser.newPage();
              await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            } catch (createErr) {
              console.error(`Failed to recreate page: ${createErr.message}`);
            }
          }
        }
        if (match) break;
      }

      if (match) {
        console.log(`Found match on ${comp.name}: $${match.sellingPrice}`);

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
        console.log(`No valid matches found on ${comp.name} for ${item.sku}.`);
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
