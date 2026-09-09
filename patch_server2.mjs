import fs from 'fs';
let serverCode = fs.readFileSync('server.ts', 'utf-8');

// Remove the wrongly placed import
serverCode = serverCode.replace("import { buildInventoryAndSearchClause } from './src/utils/inventory-keywords';", "");

// Add it to the top
serverCode = "import { buildInventoryAndSearchClause } from './src/utils/inventory-keywords';\n" + serverCode;

fs.writeFileSync('server.ts', serverCode);
