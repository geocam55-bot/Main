const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  `        matchingCriteria: {
          upc: product.upc,
          mfgPartNumber: product.mfgPartNumber,
          description: product.description,
        },`,
  `        matchingCriteria: {
          upc: product.upc,
          mfgPartNumber: product.mfgPartNumber,
          productName: product.productName,
          description: product.description,
        },`
);

fs.writeFileSync('server.ts', code);
console.log("Updated server.ts matchingCriteria successfully!");
