import fs from 'fs';
let serverCode = fs.readFileSync('server.ts', 'utf-8');

const targetPlaywrightCode = `      // 2. Scrape the found URLs using Playwright
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
            // Kent Scrape
      try {
         const page = await context.newPage();
         console.log(\`[Playwright] Scraping Kent: \${targetKentUrl}\`);
         await page.goto(targetKentUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
                  const priceText = await page.locator('.price-wrapper .price, .price-box .price').first().innerText({ timeout: 5000 }).catch(() => null);
         if (priceText) {
            freshKent = Number(priceText.replace(/[^0-9.]/g, ''));
            kentConf = 'HIGH';
            kentUrl = targetKentUrl;
            console.log(\`[Playwright] Found Kent Price: \${freshKent}\`);
         }
         await page.close();
      } catch (e: any) {
         console.error('[Playwright] Kent scrape failed', e.message);
      }
            // Home Depot Scrape
      try {
         const page = await context.newPage();
         console.log(\`[Playwright] Scraping HD: \${targetHdUrl}\`);
         await page.goto(targetHdUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
                  const priceText = await page.locator('.acl-price__value, span[itemprop="price"], .price__format').first().innerText({ timeout: 5000 }).catch(() => null);
         if (priceText) {
            freshHd = Number(priceText.replace(/[^0-9.]/g, ''));
            hdConf = 'HIGH';
            hdUrl = targetHdUrl;
            console.log(\`[Playwright] Found HD Price: \${freshHd}\`);
         }
         await page.close();
      } catch (e: any) {
         console.error('[Playwright] HD scrape failed', e.message);
      }
            await browser.close();`;

const replacementPuppeteerCode = `      // 2. Scrape the found URLs using Puppeteer
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
           const el = document.querySelector('.acl-price__value, span[itemprop="price"], .price__format, .price');
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

if (serverCode.includes(targetPlaywrightCode)) {
  serverCode = serverCode.replace(targetPlaywrightCode, replacementPuppeteerCode);
  fs.writeFileSync('server.ts', serverCode);
  console.log("Successfully replaced Playwright with Puppeteer in server.ts!");
} else {
  console.error("Target playwright code block not found exactly!");
}
