import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown, Search, Sparkles, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { useDebounce } from '../utils/useDebounce';
import { advancedSearch } from '../utils/advanced-search';

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category?: string;
  description?: string;
  cost?: number;
  priceTier1?: number;
  status?: string;
}

interface InventoryComboboxProps {
  items: InventoryItem[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}

export function InventoryCombobox({
  items,
  value,
  onChange,
  placeholder = "Select inventory item...",
  id,
}: InventoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [useAdvancedSearch, setUseAdvancedSearch] = useState(true);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const focusSearchInput = () => {
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    });
  };

  useEffect(() => {
    if (!open) return;

    focusSearchInput();
  }, [open]);

  // Debounce search query for better performance
  const debouncedSearch = useDebounce(searchQuery, 300);

  // AI-Powered search with advanced-search.ts engine
  const filteredItems = useMemo(() => {
    if (!debouncedSearch.trim()) {
      // Show first 100 items when search is empty (prevents rendering thousands of items)
      return items.slice(0, 100);
    }

    const runBasicSearch = () => {
      const searchLower = debouncedSearch.toLowerCase().trim();
      const searchWords = searchLower.split(/\s+/).filter(word => word.length > 0);

      const matches = items.filter(item => {
        const searchableText = [
          item.name || '',
          item.sku || '',
          item.category || '',
          item.description || ''
        ].join(' ').toLowerCase();

        return searchWords.every(word => searchableText.includes(word));
      });

      const scoredMatches = matches.map(item => {
        let score = 0;
        const itemName = (item.name || '').toLowerCase();
        const itemSKU = (item.sku || '').toLowerCase();

        searchWords.forEach(word => {
          if (itemName === word) score += 1000;
          if (itemSKU === word) score += 900;
          if (itemName.startsWith(word)) score += 500;
          if (itemSKU.startsWith(word)) score += 400;
          if (itemName.includes(word)) score += 100;
          if (itemSKU.includes(word)) score += 80;
          if ((item.category || '').toLowerCase().includes(word)) score += 50;
          if ((item.description || '').toLowerCase().includes(word)) score += 30;
        });

        if (searchWords.every(word => itemName.includes(word))) {
          score += 200;
        }

        return { item, score };
      });

      return scoredMatches
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return (a.item.name || '').localeCompare(b.item.name || '');
        })
        .slice(0, 100)
        .map(x => x.item);
    };

    if (useAdvancedSearch) {
      try {
        const results = advancedSearch(items as any, debouncedSearch, {
          fuzzyThreshold: 0.7,
          minScore: 0.3,
          maxResults: 100,
          sortBy: 'relevance',
        });

        return results.map(r => r.item);
      } catch (error) {
        console.error('Advanced inventory search failed. Falling back to basic search.', error);
      }
    }

    return runBasicSearch();
  }, [debouncedSearch, items, useAdvancedSearch]);

  // Find the selected item
  const selectedItem = items.find((item) => item.id === value);
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-[40px] py-2 text-foreground bg-background"
        >
          <div className="flex flex-col items-start text-left flex-1 min-w-0">
            {value === 'none' ? (
              <span className="truncate text-foreground">None</span>
            ) : selectedItem ? (
              <>
                <span className="truncate w-full font-medium text-foreground">{selectedItem.name}</span>
                {selectedItem.description && (
                  <span className="text-xs text-muted-foreground truncate w-full">{selectedItem.description}</span>
                )}
                <span className="text-xs text-muted-foreground">SKU: {selectedItem.sku}</span>
              </>
            ) : value ? (
              <>
                <span className="truncate w-full font-medium text-amber-700">Saved item not found</span>
                <span className="text-xs text-amber-600 truncate w-full">ID: {value}</span>
              </>
            ) : (
              <span className="truncate text-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[400px] p-0 z-[9999]"
        align="start"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          focusSearchInput();
        }}
      >
        <div className="flex flex-col">
          {/* Search Header with AI Badge and Toggle */}
          <div className="p-2 border-b space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground">Search</span>
                {useAdvancedSearch && (
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs py-0 h-5">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI-Powered
                  </Badge>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUseAdvancedSearch(!useAdvancedSearch)}
                className="text-xs h-6 px-2"
              >
                {useAdvancedSearch ? (
                  <>
                    <Zap className="h-3 w-3 mr-1" />
                    Advanced: ON
                  </>
                ) : (
                  'Basic Search'
                )}
              </Button>
            </div>
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={useAdvancedSearch 
                  ? "Try: 'treated brown', 'deck board'..." 
                  : "Search by name, SKU..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                ref={searchInputRef}
                className="pl-8 text-foreground bg-background"
              />
            </div>
            {debouncedSearch && (
              <p className="text-xs text-muted-foreground">
                {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} found
              </p>
            )}
            {!debouncedSearch && items.length > 100 && (
              <p className="text-xs text-muted-foreground">
                Showing first 100 items. Type to search all {items.length.toLocaleString()} items.
              </p>
            )}
          </div>

          {/* Items List */}
          <ScrollArea className="h-[300px]">
            <div className="p-2">
              {/* None Option */}
              <button
                onClick={() => {
                  onChange('none');
                  setOpen(false);
                  setSearchQuery('');
                }}
                className="w-full flex items-center px-2 py-2 text-sm rounded-md hover:bg-accent transition-colors"
              >
                <Check
                  className={`mr-2 h-4 w-4 ${
                    value === 'none' ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                <span className="text-foreground">None</span>
              </button>

              {/* Filtered Items */}
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  // Determine which price to show (prefer priceTier1, fallback to cost)
                  const price = item.priceTier1 ?? item.cost;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onChange(item.id);
                        setOpen(false);
                        setSearchQuery('');
                      }}
                      className="w-full flex items-start px-2 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                    >
                      <Check
                        className={`mr-2 h-4 w-4 mt-0.5 flex-shrink-0 ${
                          value === item.id ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                      <div className="flex flex-col items-start text-left flex-1">
                        <span className="text-foreground">{item.name}</span>
                        {item.description && (
                          <span className="text-xs text-muted-foreground line-clamp-1">{item.description}</span>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>SKU: {item.sku}</span>
                          {price !== undefined && price !== null && (
                            <>
                              <span>•</span>
                              <span className="font-medium text-green-600">
                                ${typeof price === 'number' ? price.toFixed(2) : price}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="px-2 py-4 text-sm text-center text-muted-foreground">
                  No inventory items found
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}