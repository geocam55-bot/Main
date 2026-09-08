const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto(`https://kent.ca/catalogsearch/result/?q=2x4x8`);
  const html = await page.content();
  console.log("HTML length:", html.length);
  if (html.includes("Incapsula") || html.includes("captcha") || html.includes("Access Denied")) {
    console.log("Blocked by Kent!");
  } else {
    console.log("Title:", await page.title());
  }

  await browser.close();
})();
