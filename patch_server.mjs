import fs from 'fs';
let serverCode = fs.readFileSync('server.ts', 'utf-8');

const importStatement = "import { buildInventoryAndSearchClause } from './src/utils/inventory-keywords';\n";

if (!serverCode.includes('buildInventoryAndSearchClause')) {
  // Add import after other imports
  const lastImportIndex = serverCode.lastIndexOf('import ');
  const endOfLastImport = serverCode.indexOf('\n', lastImportIndex);
  serverCode = serverCode.slice(0, endOfLastImport + 1) + importStatement + serverCode.slice(endOfLastImport + 1);
}

// 1. Patch /api/competitive-pricing/dashboard
const dashboardSearchOld = `      if (search && typeof search === 'string') {
        const s = search.toLowerCase();
        itemsQuery = itemsQuery.or(\`sku.ilike.%\${s}%,name.ilike.%\${s}%,description.ilike.%\${s}%\`);
      }`;
const dashboardSearchNew = `      if (search && typeof search === 'string') {
        const andClause = buildInventoryAndSearchClause(search);
        if (andClause) {
          itemsQuery = itemsQuery.or(andClause);
        } else {
          itemsQuery = itemsQuery.eq('id', '00000000-0000-0000-0000-000000000000');
        }
      }`;
      
if (serverCode.includes(dashboardSearchOld)) {
  serverCode = serverCode.replace(dashboardSearchOld, dashboardSearchNew);
  console.log("Patched dashboard search!");
} else {
  console.log("Failed to find dashboardSearchOld");
}

// 2. Patch /api/inventory
const inventorySearchOld = `      if (searchQuery) {
        // Multi-field search
        query = query.or(\`sku.ilike.%\${searchQuery}%,name.ilike.%\${searchQuery}%,description.ilike.%\${searchQuery}%,upc.ilike.%\${searchQuery}%,supplier_sku.ilike.%\${searchQuery}%,search_keywords.ilike.%\${searchQuery}%\`);
      }`;
const inventorySearchNew = `      if (searchQuery) {
        const andClause = buildInventoryAndSearchClause(searchQuery);
        if (andClause) {
          query = query.or(andClause);
        } else {
          query = query.eq('id', '00000000-0000-0000-0000-000000000000');
        }
      }`;

if (serverCode.includes(inventorySearchOld)) {
  serverCode = serverCode.replace(inventorySearchOld, inventorySearchNew);
  console.log("Patched inventory search!");
} else {
  console.log("Failed to find inventorySearchOld");
}

fs.writeFileSync('server.ts', serverCode);
