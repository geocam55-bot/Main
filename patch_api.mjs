import fs from 'fs';
let code = fs.readFileSync('src/utils/api.ts', 'utf-8');

code = code.replace(
  /\`\/api\/products\/\$\{productId\}\/competitive-pricing\`/g,
  '\`/api/products/${encodeURIComponent(String(productId))}/competitive-pricing\`'
);

code = code.replace(
  /\`\/api\/products\/\$\{productId\}\/competitive-pricing\/refresh\`/g,
  '\`/api/products/${encodeURIComponent(String(productId))}/competitive-pricing/refresh\`'
);

code = code.replace(
  /\`\/api\/products\/\$\{productId\}\/competitive-pricing\/history\`/g,
  '\`/api/products/${encodeURIComponent(String(productId))}/competitive-pricing/history\`'
);

fs.writeFileSync('src/utils/api.ts', code);
console.log('Fixed URL encoding in api.ts');
