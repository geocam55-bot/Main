const fs = require('fs');
let code = fs.readFileSync('src/components/inventory/CompetitivePricingPanel.tsx', 'utf8');

code = code.replace(
  `<span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 font-medium truncate max-w-[240px]">
                  Description: {data?.description || description || productName}
                </span>`,
  `<span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 font-medium truncate max-w-[240px]">
                  Item Name: {data?.productName || productName}
                </span>`
);

fs.writeFileSync('src/components/inventory/CompetitivePricingPanel.tsx', code);
console.log("Updated CompetitivePricingPanel.tsx successfully!");
