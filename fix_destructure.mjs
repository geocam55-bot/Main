import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf-8');

const regex = /unitPrice,\s*market,\s*competitorName,\s*competitor,\s*storeLocation,\s*productDescription,\s*unit\s*\} = req.body;/;
const replacement = `unitPrice,
      market,
      competitors,
      competitorName,
      competitor,
      storeLocation,
      productDescription,
      unit
    } = req.body;`;

if (content.match(regex)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync('server.ts', content);
    console.log("Fixed destructuring");
} else {
    console.log("Regex not found");
}
