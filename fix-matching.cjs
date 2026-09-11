const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// 1. Update scoreAndPickBestProduct to return null if bestScore is too low
code = code.replace(
  `    if (score > bestScore) {
        bestScore = score;
        bestItem = item;
      }
    }
    return bestItem;`,
  `    if (score > bestScore) {
        bestScore = score;
        bestItem = item;
      }
    }
    if (bestScore < 5) {
      return null;
    }
    return bestItem;`
);

// 2. Remove || productItems[0] and || products[0] fallbacks in Kent and Home Depot scraping
code = code.replace(
  `const matchedItem = scoreAndPickBestProduct(productItems, effectiveDesc || cleanDesc || kentSearchQuery) || productItems[0];`,
  `const matchedItem = scoreAndPickBestProduct(productItems, effectiveDesc || cleanDesc || kentSearchQuery);`
);

code = code.replace(
  `const matchedProd = scoreAndPickBestProduct(products, effectiveDesc || cleanDesc || hdSearchQuery) || products[0];`,
  `const matchedProd = scoreAndPickBestProduct(products, effectiveDesc || cleanDesc || hdSearchQuery);`
);

fs.writeFileSync('server.ts', code);
console.log("Applied matching fix successfully!");
