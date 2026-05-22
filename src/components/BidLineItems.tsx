import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Trash2, ShoppingCart, Search } from 'lucide-react';
import { useDebounce } from '../utils/useDebounce';

interface LineItem {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  cost: number;
  discount: number;
  total: number;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  description: string;
  cost: number;
  priceTier1: number;
  price_tier_1?: number;
  priceTier2?: number;
  price_tier_2?: number;
  priceTier3?: number;
  price_tier_3?: number;
  priceTier4?: number;
  price_tier_4?: number;
  priceTier5?: number;
  price_tier_5?: number;
}

interface BidLineItemsProps {
  isOpen: boolean;
  onClose: () => void;
  inventoryItems: InventoryItem[];
  currentItems: LineItem[];
  onAddItem: (item: LineItem) => void;
  priceTier?: number; // Price tier to use for pricing (1-5, defaults to 1)
}

export function BidLineItems({ isOpen, onClose, inventoryItems: propsInventoryItems, currentItems, onAddItem, priceTier = 1 }: BidLineItemsProps) {
  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [unitPrice, setUnitPrice] = useState(0);
  const [cost, setCost] = useState(0);

  // 🚀 Debounce search query (200ms delay for fast typing)
  const debouncedSearchQuery = useDebounce(searchQuery, 200);

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const frame = requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  // Instant client-side filtering + API fallback
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!debouncedSearchQuery.trim()) {
        setInventoryItems(propsInventoryItems.slice(0, 100));
        return;
      }
      
      const query = debouncedSearchQuery.toLowerCase();
      // First try to filter locally
      const localFiltered = propsInventoryItems.filter(item => (
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      ));

      if (localFiltered.length > 0) {
        setInventoryItems(localFiltered.slice(0, 100));
      } else {
        // If not found locally, try hitting the API
        try {
          setIsSearching(true);
          const { inventoryAPI } = await import('../utils/api');
          const results = await inventoryAPI.search({ search: debouncedSearchQuery });
          if (results && results.items) {
            const apiItems = results.items.slice(0, 100);
            setInventoryItems(apiItems);
          }
        } catch (err) {
          // Search failed
        } finally {
          setIsSearching(false);
        }
      }
    };
    
    fetchSearchResults();
  }, [debouncedSearchQuery, propsInventoryItems]);

  const filteredInventory = inventoryItems;

  // Helper function to get price for the given tier
  const getPriceForTier = (item: InventoryItem): number => {
    const tierKey = `priceTier${priceTier}` as keyof InventoryItem;
    const snakeKey = `price_tier_${priceTier}` as keyof InventoryItem;
    
    if (tierKey in item && typeof item[tierKey] === 'number') {
      return item[tierKey] as number;
    }
    if (snakeKey in item && typeof item[snakeKey] === 'number') {
      return item[snakeKey] as number;
    }
    // Fallback to tier 1
    return item.priceTier1 || item.price_tier_1 || 0;
  };

  // Auto-populate unit price when inventory item is selected
  useEffect(() => {
    if (selectedInventoryId) {
      const item = inventoryItems.find(i => i.id === selectedInventoryId);
      if (item) {
        setUnitPrice(getPriceForTier(item));
        setCost(item.cost || 0);
      }
    }
  }, [selectedInventoryId, inventoryItems, priceTier]);

  const handleAdd = () => {
    if (!selectedInventoryId) return;

    const selectedItem = inventoryItems.find(i => i.id === selectedInventoryId);
    if (!selectedItem) return;

    const total = quantity * unitPrice * (1 - discount / 100);

    const lineItem: LineItem = {
      id: Date.now().toString(),
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      sku: selectedItem.sku,
      quantity,
      unitPrice, // Use the editable unitPrice state
      cost,
      discount,
      total,
    };

    onAddItem(lineItem);
    setSelectedInventoryId('');
    setQuantity(1);
    setDiscount(0);
    setSearchQuery('');
    setUnitPrice(0);
    setCost(0);
  };

  const selectedItem = inventoryItems.find(i => i.id === selectedInventoryId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background">
        <DialogHeader>
          <DialogTitle>Add Line Item from Inventory</DialogTitle>
          <DialogDescription>
            Select a product from inventory and specify quantity and discount.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div>
            <Label>Search Inventory</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Type to search by name, SKU, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                ref={searchInputRef}
                className="pl-10"
              />
            </div>
            {searchQuery && (
              <p className="text-xs text-muted-foreground mt-1">
                {filteredInventory.length} {filteredInventory.length === 1 ? 'item' : 'items'} found
                {filteredInventory.length >= 100 && ' (showing first 100)'}
              </p>
            )}
            {!searchQuery && inventoryItems.length > 100 && (
              <p className="text-xs text-muted-foreground mt-1">
                Showing first 100 items. Use search to find specific products.
              </p>
            )}
          </div>

          <div>
            <Label>Select Product *</Label>
            <Select value={selectedInventoryId} onValueChange={setSelectedInventoryId}>
              <SelectTrigger>
                <SelectValue placeholder={filteredInventory.length > 0 ? "Choose from results below" : "Search above to find products"} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                {filteredInventory.length > 0 ? (
                  filteredInventory.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      <div className="flex items-center justify-between gap-4 w-full">
                        <div className="flex flex-col items-start text-left overflow-hidden">
                          <div>
                            <span className="font-medium">{item.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">({item.sku})</span>
                          </div>
                          {item.description && (
                            <span className="text-xs text-muted-foreground truncate w-full max-w-[300px] block" title={item.description}>
                              {item.description}
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground whitespace-nowrap ml-2">${item.priceTier1.toFixed(2)}</span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-items" disabled>
                    {isSearching ? 'Searching database...' : (searchQuery ? 'No items found' : 'Type above to search')}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {selectedItem && (
              <div className="mt-2 p-3 bg-blue-50 rounded text-xs text-blue-700">
                {selectedItem.description}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Quantity *</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Cost</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(Number(e.target.value))}
                placeholder="From inventory"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Reference only - not shown to customer
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Selling Price (Unit Price) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
                placeholder="Auto-populated"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Auto-populated, but you can override
              </p>
            </div>
            <div>
              <Label>Line Discount (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
              />
            </div>
          </div>

          {selectedItem && unitPrice > 0 && (
            <div className="border rounded-lg p-4 bg-muted">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Unit Price:</span>
                <span className="text-foreground">${unitPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Quantity:</span>
                <span className="text-foreground">{quantity}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Discount ({discount}%):</span>
                  <span className="text-red-600">
                    -${(quantity * unitPrice * (discount / 100)).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-border">
                <span className="text-foreground">Line Total:</span>
                <span className="text-foreground">
                  ${(quantity * unitPrice * (1 - discount / 100)).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!selectedInventoryId}>
              <Plus className="h-4 w-4 mr-2" />
              Add to Bid
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface LineItemsTableProps {
  items: LineItem[];
  onRemove: (id: string) => void;
  editable?: boolean;
  taxRate?: number;
}

export function LineItemsTable({ items, onRemove, editable = false, taxRate = 0 }: LineItemsTableProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 bg-muted rounded-lg">
        <ShoppingCart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
        <p className="text-sm text-muted-foreground">No items added yet</p>
        <p className="text-xs text-muted-foreground mt-1">Click "Add Line Item" to select products</p>
      </div>
    );
  }

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="py-2 px-4 text-left">Item</th>
            <th className="py-2 px-4 text-center">SKU</th>
            <th className="py-2 px-4 text-right">Qty</th>
            <th className="py-2 px-4 text-right">Unit Price</th>
            <th className="py-2 px-4 text-right">Discount</th>
            <th className="py-2 px-4 text-right">Total</th>
            {editable && <th className="py-2 px-4"></th>}
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id} className="border-t">
              <td className="py-2 px-4">
                <p className="text-foreground">{item.itemName}</p>
              </td>
              <td className="py-2 px-4 text-center">
                <p className="text-xs text-muted-foreground">{item.sku}</p>
              </td>
              <td className="py-2 px-4 text-right">
                <p className="text-foreground">{item.quantity}</p>
              </td>
              <td className="py-2 px-4 text-right">
                <p className="text-foreground">${item.unitPrice.toFixed(2)}</p>
              </td>
              <td className="py-2 px-4 text-right">
                <p className="text-foreground">{item.discount}%</p>
              </td>
              <td className="py-2 px-4 text-right">
                <p className="text-foreground">${item.total.toFixed(2)}</p>
              </td>
              {editable && (
                <td className="py-2 px-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(item.id)}
                  >
                    <Trash2 className="h-3 w-3 text-red-600" />
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-muted border-t-2">
          <tr>
            <td colSpan={editable ? 5 : 5} className="py-2 px-4 text-right">
              <span className="text-foreground">Subtotal:</span>
            </td>
            <td className="py-2 px-4 text-right">
              <span className="text-foreground">
                ${subtotal.toFixed(2)}
              </span>
            </td>
            {editable && <td></td>}
          </tr>
          {taxRate > 0 && (
            <>
              <tr>
                <td colSpan={editable ? 5 : 5} className="py-2 px-4 text-right">
                  <span className="text-muted-foreground">Tax ({taxRate}%):</span>
                </td>
                <td className="py-2 px-4 text-right">
                  <span className="text-foreground">
                    ${taxAmount.toFixed(2)}
                  </span>
                </td>
                {editable && <td></td>}
              </tr>
              <tr className="border-t">
                <td colSpan={editable ? 5 : 5} className="py-2 px-4 text-right">
                  <span className="font-semibold text-foreground">Total:</span>
                </td>
                <td className="py-2 px-4 text-right">
                  <span className="font-semibold text-foreground">
                    ${total.toFixed(2)}
                  </span>
                </td>
                {editable && <td></td>}
              </tr>
            </>
          )}
        </tfoot>
      </table>
    </div>
  );
}