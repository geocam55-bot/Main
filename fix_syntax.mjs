import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace('[itemprop="price\'', '[itemprop="price"]');
fs.writeFileSync('server.ts', code);
console.log("Fixed quote syntax in server.ts!");
