import fetch from 'node-fetch';
import cheerio from 'cheerio';

async function testKent() {
  const url = 'https://kent.ca/catalogsearch/result/?q=999011853081';
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
    console.log('Kent fetch status:', res.status);
    const html = await res.text();
    console.log('HTML length:', html.length);
    const $ = cheerio.load(html);
    const prices = [];
    $('.price, [data-price-amount], .product-item-price').each((i, el) => {
      prices.push($(el).text().trim());
    });
    console.log('Found prices:', prices.slice(0, 10));
    console.log('Page title:', $('title').text());
  } catch (err) {
    console.error('Error:', err);
  }
}

testKent();
