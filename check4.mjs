import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('http://localhost:3000/logistics', { waitUntil: 'networkidle0' });
  
  await new Promise(r => setTimeout(r, 2000));
  
  const rootHTML = await page.evaluate(() => document.getElementById('root')?.innerHTML);
  console.log("ROOT HTML LENGTH:", rootHTML?.length);
  if (rootHTML?.length < 1000) {
      console.log("ROOT HTML:", rootHTML);
  } else {
      console.log("ROOT HTML (start):", rootHTML?.substring(0, 500));
  }
  
  await browser.close();
})();
