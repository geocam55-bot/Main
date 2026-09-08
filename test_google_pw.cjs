const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  const term = "SPF 2X4X8 LUMBER #2 & BETTER";
  
  await page.goto(`https://www.google.com/search?q=${encodeURIComponent('site:kent.ca ' + term)}`);
  console.log("Page title:", await page.title());
  // Find first kent.ca result link
  const link = await page.locator('a[href*="kent.ca/"]').first().getAttribute('href', { timeout: 5000 }).catch(() => null);
  console.log("Found Google link:", link);

  await browser.close();
})();
