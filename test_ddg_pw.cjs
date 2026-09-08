const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  const term = "SPF 2X4X8 LUMBER #2 & BETTER";
  
  await page.goto(`https://lite.duckduckgo.com/lite/`);
  await page.fill('input[name="q"]', `site:kent.ca ${term}`);
  await page.click('input[type="submit"]');
  
  // Find first result link
  const link = await page.locator('.result-snippet, .result-url, a').filter({ hasText: 'kent.ca' }).first().getAttribute('href', { timeout: 5000 }).catch(() => null);
  
  console.log("DDG Page title:", await page.title());
  console.log("Found DDG link:", link);

  await browser.close();
})();
