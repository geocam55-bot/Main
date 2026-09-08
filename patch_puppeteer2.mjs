import fs from 'fs';
let serverCode = fs.readFileSync('server.ts', 'utf-8');

const startStr = "// 2. Scrape the found URLs using Playwright";
const endStr = "await browser.close();";

const startIndex = serverCode.indexOf(startStr);
const endIndex = serverCode.indexOf(endStr, startIndex) + endStr.length;

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `// 2. Scrape the found URLs using Puppeteer
      const puppeteer = await import('puppeteer');
      const browser = await puppeteer.default.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // Kent Scrape
      try {
         console.log(\`[Puppeteer] Scraping Kent: \${targetKentUrl}\`);
         await page.goto(targetKentUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
         const priceText = await page.evaluate(() => {
           const el = document.querySelector('.price-wrapper .price, .price-box .price, .price');
           return el ? el.textContent : null;
         });
         if (priceText) {
            freshKent = Number(priceText.replace(/[^0-9.]/g, ''));
            kentConf = 'HIGH';
            kentUrl = targetKentUrl;
            console.log(\`[Puppeteer] Found Kent Price: \${freshKent}\`);
         }
      } catch (e: any) {
         console.error('[Puppeteer] Kent scrape failed', e.message);
      }

      // Home Depot Scrape
      try {
         console.log(\`[Puppeteer] Scraping HD: \${targetHdUrl}\`);
         await page.goto(targetHdUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
         const priceText = await page.evaluate(() => {
           const el = document.querySelector('.acl-price__value, span[itemprop="price'], .price__format, .price');
           return el ? el.textContent : null;
         });
         if (priceText) {
            freshHd = Number(priceText.replace(/[^0-9.]/g, ''));
            hdConf = 'HIGH';
            hdUrl = targetHdUrl;
            console.log(\`[Puppeteer] Found HD Price: \${freshHd}\`);
         }
      } catch (e: any) {
         console.error('[Puppeteer] HD scrape failed', e.message);
      }

      await browser.close();`;

  serverCode = serverCode.substring(0, startIndex) + replacement + serverCode.substring(endIndex);
  fs.writeFileSync('server.ts', serverCode);
  console.log("Successfully replaced Playwright block with Puppeteer!");
} else {
  console.error("Could not find start or end index for replacement.");
}
