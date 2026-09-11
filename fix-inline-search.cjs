const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Remove import of buildInventoryAndSearchClause
code = code.replace("import { buildInventoryAndSearchClause } from './src/utils/inventory-keywords';", "// import buildInventoryAndSearchClause inlined");

// Define buildInventoryAndSearchClause directly in server.ts
const inlineFunc = `
// Inlined robust search clause builder
function buildInventoryAndSearchClause(query: string): string {
  const trimmed = String(query || '').trim();
  if (!trimmed) return '';
  const clean = trimmed.toLowerCase().replace(/[%,()]/g, ' ').replace(/\\s+/g, ' ').trim();
  if (!clean) return '';
  const fields = ['name', 'sku', 'description', 'category', 'supplier'];
  return fields.map(f => \`\${f}.ilike.%\${clean}%\`).join(',');
}
`;

code = inlineFunc + '\n' + code;

fs.writeFileSync('server.ts', code);
console.log("Inlined buildInventoryAndSearchClause in server.ts successfully!");
