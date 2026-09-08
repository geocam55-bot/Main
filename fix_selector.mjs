import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace('span[itemprop="price"]]', 'span[itemprop="price"]');
fs.writeFileSync('server.ts', code);
console.log("Fixed invalid CSS selector in server.ts!");
