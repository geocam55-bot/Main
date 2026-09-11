const fs = require('fs');
let code = fs.readFileSync('src/components/Inventory.tsx', 'utf8');

const target = `            <CompetitivePricingDashboard
              onSelectProduct={(productId) => {
                const item = items.find((i) => i.id === productId || i.sku === productId);
                if (item) {
                  handleOpenDialog(item);
                }
              }}
            />`;

const replacement = `            <CompetitivePricingDashboard
              onSelectProduct={async (productId) => {
                let item = items.find((i) => i.id === productId || i.sku === productId);
                if (!item) {
                  try {
                    const res = await fetch(\`/api/inventory/\${productId}\`);
                    if (res.ok) {
                      const data = await res.json();
                      if (data) {
                        item = {
                          id: data.id,
                          sku: data.sku,
                          name: data.name,
                          description: data.description,
                          category: data.category,
                          unitOfMeasure: data.unit_of_measure || data.unitOfMeasure || 'EA',
                          quantityOnHand: data.quantity_on_hand || data.quantityOnHand || 0,
                          quantityOnOrder: data.quantity_on_order || data.quantityOnOrder || 0,
                          reorderLevel: data.reorder_level || data.reorderLevel || 0,
                          unitPrice: data.unit_price || data.unitPrice || 0,
                          supplier: data.supplier || '',
                          supplierSKU: data.supplier_sku || data.supplierSKU || '',
                          mfgPartNumber: data.mfg_part_number || data.mfgPartNumber || '',
                          upc: data.upc || data.barcode || '',
                        };
                      }
                    }
                  } catch (e) {
                    console.error('Failed to fetch product for inspection:', e);
                  }
                }
                if (item) {
                  handleOpenDialog(item);
                } else {
                  handleOpenDialog({
                    id: String(productId),
                    sku: String(productId),
                    name: String(productId),
                    category: 'General',
                    quantityOnHand: 0,
                    reorderLevel: 0,
                    unitPrice: 0,
                  } as any);
                }
              }}
            />`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/components/Inventory.tsx', code);
  console.log("Updated Inspect handler successfully!");
} else {
  console.error("Target not found in Inventory.tsx!");
}
