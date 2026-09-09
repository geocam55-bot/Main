import fs from 'fs';
let serverCode = fs.readFileSync('server.ts', 'utf-8');

const targetPoint = "    let kentUrl = `https://kent.ca/catalogsearch/result/?q=${encodeURIComponent(kentSearchQuery)}`;";

const kentScraperLogic = `    let kentUrl = \`https://kent.ca/catalogsearch/result/?q=\${encodeURIComponent(kentSearchQuery)}\`;

    // Direct Cheerio Scraping for Kent Building Supplies (Halifax - Bayers Lake store)
    try {
      const kentRes = await fetch(kentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Cookie': 'store=bayers_lake; selected_store=10; store_code=10'
        },
        timeout: 8000
      } as any);

      if (kentRes.ok) {
        const kentHtml = await kentRes.text();
        const cheerio = await import('cheerio');
        const $ = cheerio.load(kentHtml);
        
        // Find price elements on Kent
        const priceEls = $('.price, [data-price-amount], .product-item-price, .special-price');
        if (priceEls.length > 0) {
          const priceText = $(priceEls[0]).attr('data-price-amount') || $(priceEls[0]).text();
          const matchPrice = priceText.match(/\\$?([0-9]+\\.[0-9]{2})/);
          if (matchPrice) {
            freshKent = Number(matchPrice[1]);
            console.log(\`[Kent Direct Scraping] Successfully scraped Bayers Lake price for SKU \${product.sku}: $\${freshKent}\`);
          }
        }
        
        // Find product detail link if available
        const productLink = $('.product-item-link').attr('href');
        if (productLink) {
          kentUrl = productLink;
        }
      }
    } catch (scrapingErr: any) {
      console.warn('[Kent Direct Scraping] Direct fetch warning:', scrapingErr.message);
    }`;

if (serverCode.includes(targetPoint)) {
  serverCode = serverCode.replace(targetPoint, kentScraperLogic);
  fs.writeFileSync('server.ts', serverCode);
  console.log("Successfully added direct Cheerio scraping for Kent Building Supplies!");
} else {
  console.error("Target point not found in server.ts!");
}
