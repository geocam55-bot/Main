const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `    if (freshKent === 0) {
      kentConf = 'NOT_FOUND';
    }
    if (freshHd === 0) {
      hdConf = 'NOT_FOUND';
    }`;

const replacement = `    // Price Sanity Check: if competitor price deviates wildly (>4x or <0.2x of your price) without exact UPC match, reject as outlier/mismatch
    const yourP = product.yourPrice || 0;
    if (yourP > 0) {
      if (freshKent > 0 && kentMethod !== 'UPC' && (freshKent > yourP * 4 || freshKent < yourP * 0.2)) {
        console.log(\`[Price Sanity] Rejecting Kent price $\${freshKent} for SKU \${product.sku} (deviates too much from your price $\${yourP})\`);
        freshKent = 0;
        kentConf = 'NOT_FOUND';
      }
      if (freshHd > 0 && hdMethod !== 'UPC' && (freshHd > yourP * 4 || freshHd < yourP * 0.2)) {
        console.log(\`[Price Sanity] Rejecting Home Depot price $\${freshHd} for SKU \${product.sku} (deviates too much from your price $\${yourP})\`);
        freshHd = 0;
        hdConf = 'NOT_FOUND';
      }
    }

    if (freshKent === 0) {
      kentConf = 'NOT_FOUND';
    }
    if (freshHd === 0) {
      hdConf = 'NOT_FOUND';
    }`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('server.ts', code);
  console.log("Added price sanity check successfully!");
} else {
  console.error("Target not found!");
}
