const fs = require('fs');
const file = 'src/components/inventory/ShoppingListSubModule.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add replacementCost to ShoppingListItem interface
content = content.replace(
  '  cost: number; // Avg Cost\n  unitPrice: number; // Retail Price',
  '  cost: number; // Avg Cost\n  replacementCost?: number; // Replacement Cost\n  unitPrice: number; // Retail Price'
);

// 2. Add costViewMode state to ShoppingListSubModule
content = content.replace(
  '  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>(',
  '  const [costViewMode, setCostViewMode] = useState<"avg_cost" | "replacement_cost">("avg_cost");\n  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>('
);

// 3. Update mapDbRowToInventoryItem to extract replacementCost
content = content.replace(
  '  const rawCost = rawItem.cost ?? 0;\n  \n  // Database stores unit_price and cost in cents for raw SQL rows',
  `  const rawCost = rawItem.cost ?? 0;
  const rawReplacementCost = rawItem.replacement_cost ?? rawItem.replacementCost ?? null;
  // Database stores unit_price and cost in cents for raw SQL rows`
);

content = content.replace(
  '    : (typeof rawCost === \'number\' && rawCost > 0 && Number.isInteger(rawCost) ? rawCost / 100 : Number(rawCost || 0));\n\n  return {\n    id: rawItem.id',
  `    : (typeof rawCost === 'number' && rawCost > 0 && Number.isInteger(rawCost) ? rawCost / 100 : Number(rawCost || 0));
    
  const replacementCost = rawItem.replacementCostInDollars !== undefined 
    ? Number(rawItem.replacementCostInDollars) 
    : (typeof rawReplacementCost === 'number' && rawReplacementCost > 0 && Number.isInteger(rawReplacementCost) ? rawReplacementCost / 100 : Number(rawReplacementCost || 0)) || cost;

  return {
    id: rawItem.id`
);

content = content.replace(
  '    cost: Number(cost || 0),\n    unitPrice: Number(unitPrice || 0),',
  '    cost: Number(cost || 0),\n    replacementCost: Number(replacementCost || cost || 0),\n    unitPrice: Number(unitPrice || 0),'
);

// 4. Calculate ourCostTotal using costViewMode
content = content.replace(
  '      ourCostTotal += (item.cost || 0) * qty;',
  '      const costToUse = costViewMode === "replacement_cost" ? (item.replacementCost || item.cost || 0) : (item.cost || 0);\n      ourCostTotal += costToUse * qty;'
);

// 5. Update UI in ShoppingListSubModule

// Header button - Add Toggle right after "Search Competitor Prices" button
const toggleHtml = `
          <div className="flex bg-muted p-1 rounded-md ml-2 border">
            <button
              onClick={() => setCostViewMode('avg_cost')}
              className={\`px-3 py-1 text-xs font-medium rounded-sm transition-all \${costViewMode === 'avg_cost' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}\`}
            >
              Avg Cost
            </button>
            <button
              onClick={() => setCostViewMode('replacement_cost')}
              className={\`px-3 py-1 text-xs font-medium rounded-sm transition-all \${costViewMode === 'replacement_cost' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}\`}
            >
              Rep. Cost
            </button>
          </div>
`;
content = content.replace(
  '              </>\n            )}\n          </Button>\n          <div className="flex items-center gap-1 border-l pl-2">',
  '              </>\n            )}\n          </Button>' + toggleHtml + '\n          <div className="flex items-center gap-1 border-l pl-2">'
);

// Table Header
content = content.replace(
  '<th className="py-3 px-3 text-right">Avg Cost</th>',
  '<th className="py-3 px-3 text-right">{costViewMode === "replacement_cost" ? "Rep. Cost" : "Avg Cost"}</th>'
);

// Table Row Data
content = content.replace(
  '                      {/* Avg Cost */}\n                      <td className="py-3 px-3 text-right font-medium text-muted-foreground">\n                        ${Number(item.cost || 0).toFixed(2)}\n                      </td>',
  '                      {/* Avg Cost / Rep Cost */}\n                      <td className="py-3 px-3 text-right font-medium text-muted-foreground">\n                        ${Number(costViewMode === "replacement_cost" ? (item.replacementCost || item.cost || 0) : (item.cost || 0)).toFixed(2)}\n                      </td>'
);

// Totals Bar
content = content.replace(
  '<span>Avg Cost: <strong className="text-foreground">${totals.ourCostTotal.toFixed(2)}</strong></span>',
  '<span>{costViewMode === "replacement_cost" ? "Rep. Cost" : "Avg Cost"}: <strong className="text-foreground">${totals.ourCostTotal.toFixed(2)}</strong></span>'
);

// Export CSV - using costViewMode for export? Actually CSV probably just needs to include it, or we could leave CSV mapping alone. Let's update CSV to include it if it's there.
content = content.replace(
  'item.cost.toFixed(2),',
  'item.cost.toFixed(2),\n      (item.replacementCost || item.cost || 0).toFixed(2),'
);
content = content.replace(
  '\'Avg Cost (CAD)\',',
  '\'Avg Cost (CAD)\',\n      \'Replacement Cost (CAD)\','
);

// Detail Modal
content = content.replace(
  '<span>Avg Cost: ${selectedDetailItem.cost.toFixed(2)}</span>',
  '<span className="capitalize">{costViewMode.replace("_", " ")}: ${(costViewMode === "replacement_cost" ? (selectedDetailItem.replacementCost || selectedDetailItem.cost || 0) : selectedDetailItem.cost).toFixed(2)}</span>'
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed shopping list module.');
