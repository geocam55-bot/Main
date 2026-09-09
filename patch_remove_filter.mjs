import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

const target = `      // Filter by search
      if (search && typeof search === 'string') {
        const s = search.toLowerCase();
        dashboardItems = dashboardItems.filter(
          (i) =>
            i.sku.toLowerCase().includes(s) ||
            i.name.toLowerCase().includes(s) ||
            (i.description && i.description.toLowerCase().includes(s)) ||
            (i.lowestCompetitorName && i.lowestCompetitorName.toLowerCase().includes(s))
        );
      }`;

if (code.includes(target)) {
  code = code.replace(target, "");
  fs.writeFileSync('server.ts', code);
  console.log("Patched server.ts to remove manual search filter!");
} else {
  console.log("Not found");
}
