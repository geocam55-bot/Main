const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  await page.goto('https://kent.ca/catalogsearch/result/?q=drill', { waitUntil: 'domcontentloaded' });
  const kentTitle = await page.title();
  console.log('Kent Title:', kentTitle);
  
  await page.goto('https://www.homedepot.ca/en/home/search.html?q=drill', { waitUntil: 'domcontentloaded' });
  const hdTitle = await page.title();
  console.log('HD Title:', hdTitle);
  
  await browser.close();
})();
