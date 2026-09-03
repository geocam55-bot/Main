import fs from 'fs';
let content = fs.readFileSync('src/components/inventory/ShoppingListSubModule.tsx', 'utf-8');

content = content.replace(/sku\?: string;/g, 'sku?: string;\n      modelNumber?: string;');

fs.writeFileSync('src/components/inventory/ShoppingListSubModule.tsx', content);
