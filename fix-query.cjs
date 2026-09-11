const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  `    const kentSearchQuery = cleanDesc || effectiveDesc || effectiveName || cleanQuery || customQuery || effectiveUpc || effectiveMfg || broadSearchQuery || product.sku;
    const hdSearchQuery = cleanDesc || effectiveDesc || effectiveName || cleanQuery || customQuery || effectiveMfg || effectiveUpc || broadSearchQuery || product.sku;`,
  `    const kentSearchQuery = effectiveName || cleanQuery || customQuery || effectiveUpc || effectiveMfg || cleanDesc || effectiveDesc || broadSearchQuery || product.sku;
    const hdSearchQuery = effectiveName || cleanQuery || customQuery || effectiveMfg || effectiveUpc || cleanDesc || effectiveDesc || broadSearchQuery || product.sku;`
);

fs.writeFileSync('server.ts', code);
console.log("Updated query priority successfully!");
