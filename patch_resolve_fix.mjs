import fs from 'fs';
let serverCode = fs.readFileSync('server.ts', 'utf-8');

const badQuery = ".or(`sku.eq.${pidStr},upc.eq.${pidStr},supplier_sku.eq.${pidStr},mfg_part_number.eq.${pidStr}`)";
const goodQuery = ".or(`sku.eq.${pidStr},upc.eq.${pidStr},supplier_sku.eq.${pidStr}`)";

if (serverCode.includes(badQuery)) {
  serverCode = serverCode.replace(badQuery, goodQuery);
  fs.writeFileSync('server.ts', serverCode);
  console.log("Fixed resolveProductRecord query!");
} else {
  console.log("badQuery not found!");
}
