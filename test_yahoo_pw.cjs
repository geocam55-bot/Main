const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const term = "SPF 2X4X8 LUMBER #2 & BETTER";
  
  await page.goto(`https://search.yahoo.com/search?p=${encodeURIComponent('site:kent.ca ' + term)}`);
  
  const link = await page.locator('a[href*="kent.ca/en/"]').first().getAttribute('href', { timeout: 5000 }).catch(() => null);
  console.log("Found Yahoo link:", link);

  await browser.close();
})();
