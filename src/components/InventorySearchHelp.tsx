import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Sparkles,
  Search,
  Zap,
  MessageSquare,
  DollarSign,
  Package,
  AlertTriangle,
  X,
} from 'lucide-react';

interface SearchHelpProps {
  onExampleClick: (query: string) => void;
}

export function InventorySearchHelp({ onExampleClick }: SearchHelpProps) {
  const [isOpen, setIsOpen] = useState(false);

  const examples = [
    {
      category: 'Natural Language',
      icon: MessageSquare,
      color: 'purple',
      queries: [
        { text: 'Show me all tools under $50', description: 'Price-based filtering' },
        { text: 'red paint in stock', description: 'Color + availability' },
        { text: 'find cheap materials', description: 'Semantic search' },
        { text: 'items running low', description: 'Low stock detection' },
      ],
    },
    {
      category: 'Fuzzy Matching',
      icon: Zap,
      color: 'blue',
      queries: [
        { text: 'scrw', description: 'Finds "screw" despite typo' },
        { text: 'hamr', description: 'Finds "hammer"' },
        { text: 'wrnch', description: 'Finds "wrench"' },
        { text: 'paont', description: 'Finds "paint"' },
      ],
    },
    {
      category: 'Semantic Understanding',
      icon: Sparkles,
      color: 'green',
      queries: [
        { text: 'fasteners', description: 'Finds screws, bolts, nails' },
        { text: 'cheap items', description: 'Finds affordable, budget, economical' },
        { text: 'heavy equipment', description: 'Finds massive, substantial items' },
        { text: 'timber', description: 'Finds wood, lumber, plywood' },
      ],
    },
    {
      category: 'Price Queries',
      icon: DollarSign,
      color: 'yellow',
      queries: [
        { text: 'under $25', description: 'Items less than $25' },
        { text: 'over $100', description: 'Items more than $100' },
        { text: 'between $10 and $50', description: 'Items in price range' },
        { text: 'around $30', description: 'Items approximately $30' },
      ],
    },
    {
      category: 'Inventory Status',
      icon: Package,
      color: 'indigo',
      queries: [
        { text: 'in stock items', description: 'Available items' },
        { text: 'out of stock', description: 'Zero quantity items' },
        { text: 'low stock alert', description: 'Below reorder level' },
        { text: 'active products', description: 'Active status only' },
      ],
    },
  ];

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-xs"
      >
        <Sparkles className="h-3 w-3 mr-1" />
        Search Examples
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                AI-Powered Search Guide
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Try these example searches to see the power of advanced search
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {examples.map((section) => {
            const Icon = section.icon;
            return (
              <div key={section.category}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className={`h-5 w-5 text-${section.color}-600`} />
                  <h3 className="font-medium text-foreground">{section.category}</h3>
                  <Badge
                    variant="outline"
                    className={`bg-${section.color}-50 text-${section.color}-700 border-${section.color}-200`}
                  >
                    {section.queries.length} examples
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {section.queries.map((query, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        onExampleClick(query.text);
                        setIsOpen(false);
                      }}
                      className="text-left p-3 bg-muted hover:bg-muted rounded-lg border border-border hover:border-purple-300 transition-all"
                    >
                      <div className="flex items-start gap-2">
                        <Search className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {query.text}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {query.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h4 className="font-medium text-purple-900 mb-2">How It Works</h4>
            <ul className="space-y-2 text-sm text-purple-800">
              <li className="flex items-start gap-2">
                <span className="font-semibold">🎯 Exact Match:</span>
                <span>When your search matches exactly</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">✨ Fuzzy Match:</span>
                <span>Handles typos and misspellings automatically</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">🧠 Semantic Match:</span>
                <span>Understands synonyms and related terms</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">📝 Partial Match:</span>
                <span>Finds items with partial text matches</span>
              </li>
            </ul>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
