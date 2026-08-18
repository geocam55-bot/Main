import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  // Wait a bit just in case
  await new Promise(r => setTimeout(r, 2000));
  
  const content = await page.content();
  console.log("BODY CONTAINS:", content.substring(0, 500));
  
  if (content.includes('Something went wrong')) {
      console.log('Error boundary is visible.');
      const errText = await page.evaluate(() => document.querySelector('.bg-red-50 p.font-mono')?.textContent);
      console.log('Error text:', errText);
  }
  
  await browser.close();
})();
