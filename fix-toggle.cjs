const fs = require('fs');
const file = 'src/components/inventory/ShoppingListSubModule.tsx';
let content = fs.readFileSync(file, 'utf8');

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
  new RegExp('</Button>\\s*<div className="flex items-center gap-1 border-l pl-2">'),
  '</Button>\n' + toggleHtml + '\n          <div className="flex items-center gap-1 border-l pl-2">'
);

fs.writeFileSync(file, content, 'utf8');
