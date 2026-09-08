import fs from 'fs';
let serverCode = fs.readFileSync('server.ts', 'utf-8');

const targetMap = `        if (matches) {
          for (const m of matches) {
            const prodId = String(m.product_id);
            if (!matchesMap.has(prodId)) {
              matchesMap.set(prodId, []);
            }
            matchesMap.get(prodId).push(m);
          }
        }`;

const replacementMap = `        if (matches) {
          for (const m of matches) {
            const prodId = String(m.product_id);
            if (!matchesMap.has(prodId)) {
              matchesMap.set(prodId, []);
            }
            matchesMap.get(prodId).push(m);
          }
        }`;

// And for the lookup:
const targetLookup = `const prodMatches = matchesMap.get(String(p.id)) || [];`;
const replacementLookup = `const prodMatches = matchesMap.get(String(p.id)) || matchesMap.get(p.sku) || matchesMap.get(p.supplier_sku) || [];`;

if (serverCode.includes(targetLookup)) {
  serverCode = serverCode.replace(targetLookup, replacementLookup);
  fs.writeFileSync('server.ts', serverCode);
  console.log("Patched server.ts matches lookup successfully!");
} else {
  console.error("Target lookup not found!");
}
