const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const term = "SPF 2X4X8 LUMBER #2 & BETTER";
  
  // Search DuckDuckGo for kent.ca
  await page.goto(`https://html.duckduckgo.com/html/?q=${encodeURIComponent('site:kent.ca ' + term)}`);
  
  // Find first result link
  const link = await page.locator('.result__url').first().innerText({ timeout: 5000 }).catch(() => null);
  console.log("Found DDG link:", link);

  await browser.close();
})();
