import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import {
  ShoppingCart,
  Search,
  Plus,
  Trash2,
  Download,
  Printer,
  Save,
  FolderOpen,
  RefreshCw,
  ExternalLink,
  Info,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowUpDown,
  TrendingDown,
  TrendingUp,
  Package,
  Layers,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { createClient } from '../../utils/supabase/client';
import { competitivePricingAPI } from '../../utils/api';
import type { ProductCompetitivePricing } from '../../types/competitive-pricing';
import { PriceHistoryModal } from './PriceHistoryModal';
import { searchInventoryClient } from '../../utils/inventory-client';

export interface ShoppingListItem {
  id: string;
  inventoryId?: string;
  inventoryItemId?: string;
  name: string;
  sku?: string;
  modelNumber?: string;
  mfgPartNumber?: string;
  manufacturer?: string;
  description?: string;
  category?: string;
  unitOfMeasure?: string;
  quantity: number;
  quantityOnHand?: number;
  cost: number; // Avg Cost
  replacementCost?: number; // Replacement Cost
  unitPrice: number; // Retail Price
  supplier?: string;
  supplierSKU?: string;
  upc?: string;
  barcode?: string;
  competitorData?: {
    status?: string;
    bestDeal?: 'prospaces' | 'competitor' | 'kent' | 'homeDepot' | 'tie';
    kent?: {
      price: number;
      storeName?: string;
      storeLocation?: string;
      productTitle?: string;
      url?: string;
      inStock?: boolean;
      matchConfidence?: string;
      matchConfidencePct?: number;
      notes?: string;
    };
    homeDepot?: {
      price: number;
      storeName?: string;
      storeLocation?: string;
      productTitle?: string;
      url?: string;
      inStock?: boolean;
      matchConfidence?: string;
      matchConfidencePct?: number;
      notes?: string;
    };
    lastChecked?: string;
    marketRecommendation?: string;
  };
  notes?: string;
}

export interface SavedShoppingListRecord {
  id: string;
  name: string;
  description?: string;
  organization_id?: string;
  items: ShoppingListItem[];
  totals?: any;
  created_at?: string;
  updated_at?: string;
}

const LOCAL_STORAGE_ACTIVE_KEY = 'prospaces_active_shopping_list';
const DEFAULT_ORG_ID = '34638283-7b3d-47e2-bec8-a9e600e28c4a';

/**
 * Intelligent title & description resolver that mirrors Inventory.tsx and server.ts logic.
 * Swaps generic category headings (e.g. "BUILDING MATERIALS", "FRAME MATERIALS", "PORTABLE ELECTRIC")
 * with the actual specific product name contained in description.
 */
export function resolveInventoryTitles(rawName: string = '', rawDescription: string = '', category: string = '') {
  let parsedDescription = rawDescription ? String(rawDescription).trim() : '';

  // Strip embedded <!--metadata:...--> tags if present
  const markerStart = "<!--metadata:";
  const markerEnd = "-->";
  const startIndex = parsedDescription.lastIndexOf(markerStart);
  if (startIndex !== -1) {
    const endIndex = parsedDescription.indexOf(markerEnd, startIndex + markerStart.length);
    if (endIndex !== -1) {
      parsedDescription = parsedDescription.substring(0, startIndex).trim();
    }
  }

  let finalName = rawName ? String(rawName).trim() : '';
  let finalDescription = parsedDescription;
  const cleanNameLower = finalName.toLowerCase();

  const genericCategoryKeywords = [
    'accessories for',
    'pipes, fittings',
    'hooks, squares',
    'insulating materials',
    'paint types',
    'lawn, garden',
    'lawn equipment',
    'gutters',
    'tree, plant',
    'electric heating',
    'tools accesso',
    'repair parts',
    'electric acc.',
    'coverings',
    'cables and accesso',
    'furniture, bbq',
    'electrical appliances',
    'wall and floor',
    'portable electric',
    'chains, steel',
    'motorized lawn',
    'building materials',
    'fasteners',
    'hand tools',
    'power tools',
    'plumbing',
    'lighting',
    'seasonal',
    'hardware',
    'outlets,boxes',
    'fuses,outlets',
    'ventilation',
    'heating and cooling',
    'home decor',
    'outdoor living',
    'building product',
    'tools & hardware',
    'electrical & lighting',
    'paint & decor',
    'frame materials'
  ];

  const hasGenericKeyword = genericCategoryKeywords.some(keyword => cleanNameLower.includes(keyword));
  const isGenericOrEmpty = !finalName || 
    finalName === '' || 
    finalName.toUpperCase() === 'UNDEFINED' ||
    (category && finalName.toLowerCase() === category.trim().toLowerCase()) ||
    hasGenericKeyword;

  if (isGenericOrEmpty && parsedDescription && parsedDescription !== '') {
    finalName = parsedDescription;
    finalDescription = rawName || '';
  }

  return {
    title: finalName || parsedDescription || rawName || 'Product',
    description: finalDescription || '',
  };
}

/**
 * Normalizes any ShoppingListItem or DB record ensuring the real product name is displayed.
 */
export const normalizeShoppingListItem = (item: any): ShoppingListItem => {
  const { title, description } = resolveInventoryTitles(
    item.name || item.productName || item.title || '',
    item.description || '',
    item.category || ''
  );

  return {
    ...item,
    name: title,
    description: description || item.description || '',
  };
};

export const mapDbRowToInventoryItem = (rawItem: any) => {
  const rawCost = rawItem.cost ?? 0;
  const rawReplacementCost = rawItem.replacement_cost ?? rawItem.replacementCost ?? null;
  // Database stores unit_price and cost in cents for raw SQL rows
  const rawUnitPrice = rawItem.unit_price ?? rawItem.unitPrice ?? 0;
  const unitPrice = rawItem.unitPriceInDollars !== undefined 
    ? Number(rawItem.unitPriceInDollars) 
    : (typeof rawUnitPrice === 'number' && rawUnitPrice > 0 && Number.isInteger(rawUnitPrice) ? rawUnitPrice / 100 : Number(rawUnitPrice || 0));
  const cost = rawItem.costInDollars !== undefined 
    ? Number(rawItem.costInDollars) 
    : (typeof rawCost === 'number' && rawCost > 0 && Number.isInteger(rawCost) ? rawCost / 100 : Number(rawCost || 0));
    
  const replacementCost = rawItem.replacementCostInDollars !== undefined 
    ? Number(rawItem.replacementCostInDollars) 
    : (typeof rawReplacementCost === 'number' && rawReplacementCost > 0 && Number.isInteger(rawReplacementCost) ? rawReplacementCost / 100 : Number(rawReplacementCost || 0)) || cost;

  const { title, description } = resolveInventoryTitles(
    rawItem.name || rawItem.title || rawItem.productName || '',
    rawItem.description || '',
    rawItem.category || ''
  );

  return {
    id: rawItem.id,
    inventoryId: rawItem.id,
    name: title,
    sku: rawItem.sku || '',
    modelNumber: rawItem.model_number || rawItem.modelNumber || rawItem.mfg_part_number || '',
    mfgPartNumber: rawItem.mfg_part_number || rawItem.mfgPartNumber || '',
    manufacturer: rawItem.manufacturer || rawItem.brand || '',
    description: description || rawItem.description || '',
    category: rawItem.category || 'General',
    quantityOnHand: rawItem.quantity_on_hand ?? rawItem.quantityOnHand ?? 0,
    cost: Number(cost || 0),
    replacementCost: Number(replacementCost || cost || 0),
    unitPrice: Number(unitPrice || 0),
    unitOfMeasure: rawItem.unit_of_measure || rawItem.unitOfMeasure || 'EA',
    supplier: rawItem.supplier || '',
    supplierSKU: rawItem.supplier_sku || rawItem.supplierSKU || '',
    upc: rawItem.upc || rawItem.barcode || '',
  };
};

interface ShoppingListSubModuleProps {
  onSelectProduct?: (productId: string) => void;
}

export function ShoppingListSubModule({ onSelectProduct }: ShoppingListSubModuleProps) {
  const [costViewMode, setCostViewMode] = useState<'avg_cost' | 'replacement_cost'>('avg_cost');
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_ACTIVE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(normalizeShoppingListItem);
        }
      }
    } catch {}
    return [];
  });

  const [currentListName, setCurrentListName] = useState<string>('My Shopping List');
  const [selectedDetailItem, setSelectedDetailItem] = useState<ShoppingListItem | null>(null);
  const [historyTarget, setHistoryTarget] = useState<ShoppingListItem | null>(null);
  const [isSearchingPrices, setIsSearchingPrices] = useState(false);
  const [scrapingItemIds, setScrapingItemIds] = useState<Set<string>>(new Set());
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isSaveListDialogOpen, setIsSaveListDialogOpen] = useState(false);
  const [isLoadListDialogOpen, setIsLoadListDialogOpen] = useState(false);
  const [savedLists, setSavedLists] = useState<SavedShoppingListRecord[]>([]);
  const [isLoadingSavedLists, setIsLoadingSavedLists] = useState(false);
  const [saveListNameInput, setSaveListNameInput] = useState('');
  const [saveListDescInput, setSaveListDescInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Catalog search modal state
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState('all');
  const [catalogCategories, setCatalogCategories] = useState<string[]>([]);
  const [quickAddQuantities, setQuickAddQuantities] = useState<Record<string, number>>({});

  // Sync to local storage whenever active shopping list changes
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_KEY, JSON.stringify(shoppingList));
      // Dispatch custom event so parent or navigation badges can update
      window.dispatchEvent(new CustomEvent('shopping-list-updated', { detail: { count: shoppingList.length } }));
    } catch {}
  }, [shoppingList]);

  // Listen to external add-to-shopping-list events from other views
  useEffect(() => {
    const handleExternalAdd = (e: any) => {
      if (e.detail?.item) {
        const raw = e.detail.item;
        const mapped = mapDbRowToInventoryItem(raw);
        const qty = Number(e.detail.quantity) || 1;

        setShoppingList((prev) => {
          const existingIdx = prev.findIndex((p) => p.sku === mapped.sku || p.id === mapped.id || p.inventoryId === mapped.id);
          if (existingIdx >= 0) {
            const copy = [...prev];
            copy[existingIdx] = {
              ...copy[existingIdx],
              quantity: copy[existingIdx].quantity + qty,
            };
            return copy;
          } else {
            const newItem: ShoppingListItem = {
              ...mapped,
              id: `sl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              quantity: qty,
            };
            return [newItem, ...prev];
          }
        });
        toast.success(`Added ${qty}x ${mapped.name} to Shopping List`);
      }
    };

    window.addEventListener('add-to-shopping-list', handleExternalAdd);
    return () => window.removeEventListener('add-to-shopping-list', handleExternalAdd);
  }, []);

  // Pre-fetch initial saved list if active list is empty
  useEffect(() => {
    if (shoppingList.length === 0) {
      loadSavedLists(true);
    }
  }, []);

  // Load saved shopping lists from Supabase
  const loadSavedLists = async (autoPopulateFirst = false) => {
    try {
      setIsLoadingSavedLists(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('saved_shopping_lists')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.warn('Failed to load saved shopping lists from Supabase:', error);
        return;
      }

      if (data && data.length > 0) {
        const parsed: SavedShoppingListRecord[] = data.map((row: any) => {
          const rawItems = typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []);
          const normalizedItems = (rawItems || []).map(normalizeShoppingListItem);
          return {
            id: row.id,
            name: row.name,
            description: row.description,
            organization_id: row.organization_id,
            items: normalizedItems,
            totals: typeof row.totals === 'string' ? JSON.parse(row.totals) : (row.totals || {}),
            created_at: row.created_at,
            updated_at: row.updated_at,
          };
        });
        setSavedLists(parsed);

        // If local shopping list was empty and we have saved lists, populate with the first saved list
        if (autoPopulateFirst && parsed[0]?.items?.length > 0) {
          setShoppingList(parsed[0].items);
          setCurrentListName(parsed[0].name);
        }
      }
    } catch (err) {
      console.error('Error loading saved shopping lists:', err);
    } finally {
      setIsLoadingSavedLists(false);
    }
  };

  // Search catalog items for "Add Items" modal
  const handleSearchCatalog = async (query: string, category: string = 'all') => {
    try {
      setIsCatalogLoading(true);
      const result = await searchInventoryClient({
        search: query,
        category: category !== 'all' ? category : undefined,
      });
      const items = result.items || [];
      const mapped = items.map((item: any) => ({
        id: item.id,
        inventoryId: item.id,
        sku: item.sku || '',
        name: item.name || '',
        description: item.description || '',
        category: item.category || '',
        unitPrice: item.unitPrice ?? item.unit_price ?? 0,
        cost: item.cost ?? 0,
        replacementCost: item.replacementCost ?? item.replacement_cost ?? item.unitPrice ?? 0,
        quantityOnHand: item.quantityOnHand ?? item.quantity_on_hand ?? 0,
        unitOfMeasure: item.unitOfMeasure || item.unit_of_measure || 'pcs',
        supplier: item.supplier || '',
        supplierSku: item.supplierSku || item.supplier_sku || '',
        mfgPartNumber: item.mfgPartNumber || item.mfg_part_number || '',
        upc: item.upc || '',
        quantity: 1,
      }));
      setCatalogItems(mapped);

      // Collect distinct categories if empty
      if (catalogCategories.length === 0 && items.length > 0) {
        const cats = Array.from(new Set(items.map((d: any) => d.category?.trim()).filter(Boolean))) as string[];
        setCatalogCategories(cats.sort());
      }
    } catch (e) {
      console.error('Catalog search failed:', e);
      setCatalogItems([]);
    } finally {
      setIsCatalogLoading(false);
    }
  };

  // Open Add Item Dialog & load catalog
  const handleOpenAddDialog = async () => {
    setIsAddItemDialogOpen(true);
    await handleSearchCatalog(catalogSearchQuery, selectedCatalogCategory);
    if (catalogCategories.length === 0) {
      try {
        const supabase = createClient();
        const { data } = await supabase.from('inventory').select('category').not('category', 'is', null).limit(500);
        if (data) {
          const cats = Array.from(new Set(data.map((d: any) => d.category?.trim()).filter(Boolean))) as string[];
          setCatalogCategories(cats.sort());
        }
      } catch (err) {}
    }
  };

  // Add an item from catalog to list
  const handleAddCatalogItem = (item: any) => {
    const qty = quickAddQuantities[item.id] || 1;
    setShoppingList((prev) => {
      const idx = prev.findIndex((p) => p.sku === item.sku || p.id === item.id || p.inventoryId === item.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          quantity: copy[idx].quantity + qty,
        };
        return copy;
      }
      const newItem: ShoppingListItem = {
        ...item,
        id: `sl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        quantity: qty,
      };
      return [newItem, ...prev];
    });
    toast.success(`Added ${qty}x ${item.name} to Shopping List`);
  };

  // Update item quantity
  const handleUpdateQuantity = (itemId: string, newQty: number) => {
    const validQty = Math.max(1, Math.floor(newQty || 1));
    setShoppingList((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantity: validQty } : item))
    );
  };

  // Remove item
  const handleRemoveItem = (itemId: string) => {
    setShoppingList((prev) => prev.filter((item) => item.id !== itemId));
    toast.info('Item removed from Shopping List');
  };

  // Clear list
  const handleClearList = () => {
    if (shoppingList.length === 0) return;
    if (window.confirm('Are you sure you want to clear the shopping list?')) {
      setShoppingList([]);
      setCurrentListName('New Shopping List');
      toast.info('Shopping List cleared');
    }
  };

  // Calculate totals
  const totals = useMemo(() => {
    let totalItems = shoppingList.length;
    let totalUnits = 0;
    let ourCostTotal = 0;
    let ourRetailTotal = 0;
    let kentTotal = 0;
    let homeDepotTotal = 0;
    let prospacesCheaperCount = 0;
    let kentCheaperCount = 0;
    let hdCheaperCount = 0;
    let comparedItemsCount = 0;

    for (const item of shoppingList) {
      const qty = item.quantity || 1;
      totalUnits += qty;

      const costToUse = costViewMode === 'replacement_cost' ? (item.replacementCost || item.cost || 0) : (item.cost || 0);
      ourCostTotal += costToUse * qty;

      const retail = item.unitPrice || 0;
      ourRetailTotal += retail * qty;

      const kentPrice = item.competitorData?.kent?.price || 0;
      const hdPrice = item.competitorData?.homeDepot?.price || 0;

      if (kentPrice > 0 || hdPrice > 0) {
        comparedItemsCount++;
        if (kentPrice > 0) kentTotal += kentPrice * qty;
        if (hdPrice > 0) homeDepotTotal += hdPrice * qty;

        const lowestCompetitor = Math.min(
          kentPrice > 0 ? kentPrice : Infinity,
          hdPrice > 0 ? hdPrice : Infinity
        );

        if (lowestCompetitor !== Infinity) {
          if (retail < lowestCompetitor) {
            prospacesCheaperCount++;
          } else if (kentPrice > 0 && kentPrice < retail && kentPrice <= hdPrice) {
            kentCheaperCount++;
          } else if (hdPrice > 0 && hdPrice < retail) {
            hdCheaperCount++;
          }
        }
      }
    }

    const ourMargin = ourRetailTotal > 0 ? ((ourRetailTotal - ourCostTotal) / ourRetailTotal) * 100 : 0;
    const kentDelta = kentTotal > 0 ? ourRetailTotal - kentTotal : 0;
    const hdDelta = homeDepotTotal > 0 ? ourRetailTotal - homeDepotTotal : 0;

    return {
      totalItems,
      totalUnits,
      ourCostTotal,
      ourRetailTotal,
      ourMargin,
      kentTotal,
      homeDepotTotal,
      kentDelta,
      hdDelta,
      prospacesCheaperCount,
      kentCheaperCount,
      hdCheaperCount,
      comparedItemsCount,
    };
  }, [shoppingList, costViewMode]);

  // Search Competitor Prices for all items in shopping list using the exact same scraping tools as Competitive Pricing
  const handleSearchCompetitorPrices = async () => {
    if (shoppingList.length === 0) {
      toast.error('Add items to the shopping list first');
      return;
    }

    setIsSearchingPrices(true);
    toast.info(`Scraping competitor prices (Kent Bayers Lake & Home Depot Halifax) for ${shoppingList.length} items...`);

    let updatedCount = 0;
    const updatedList = [...shoppingList];

    for (let i = 0; i < updatedList.length; i++) {
      const item = updatedList[i];
      const targetId = item.inventoryId || item.id;
      const { title: itemTitle, description: itemDesc } = resolveInventoryTitles(item.name, item.description, item.category);

      try {
        // Query live scraping tools (same Kent & Home Depot scraper as Competitive Pricing)
        const scrapeRes = await competitivePricingAPI.scrapeLiveItem({
          productId: targetId,
          sku: item.sku,
          name: itemTitle,
          productName: itemTitle,
          description: itemDesc,
          category: item.category,
          yourPrice: item.unitPrice,
          mfgPartNumber: item.mfgPartNumber || item.modelNumber,
          upc: item.upc,
          searchQuery: itemTitle || itemDesc,
        });

        let competitors = scrapeRes?.competitors || [];

        // Fallback to cached pricing if live scraper returned empty
        if (!competitors || competitors.length === 0) {
          try {
            const cached = await competitivePricingAPI.getPricing(targetId);
            if (cached?.competitors && cached.competitors.length > 0) {
              competitors = cached.competitors;
            }
          } catch {}
        }

        if (competitors && competitors.length > 0) {
          const kentComp = competitors.find((c: any) =>
            (c.competitorName || '').toLowerCase().includes('kent') || c.competitorId === 1
          );
          const hdComp = competitors.find((c: any) =>
            (c.competitorName || '').toLowerCase().includes('home depot') || (c.competitorName || '').toLowerCase().includes('depot') || c.competitorId === 2
          );

          const kentPrice = kentComp ? Number(kentComp.price || 0) : 0;
          const hdPrice = hdComp ? Number(hdComp.price || 0) : 0;

          const lowest = Math.min(
            kentPrice > 0 ? kentPrice : Infinity,
            hdPrice > 0 ? hdPrice : Infinity
          );

          let bestDeal: any = 'prospaces';
          if (lowest !== Infinity && lowest < item.unitPrice) {
            bestDeal = lowest === kentPrice ? 'kent' : 'homeDepot';
          }

          updatedList[i] = {
            ...item,
            competitorData: {
              status: 'found',
              bestDeal,
              kent: kentComp ? {
                price: kentPrice,
                storeName: kentComp.competitorName || 'KENT Building Supplies (Bayers Lake)',
                storeLocation: 'Halifax - Bayers Lake',
                productTitle: kentComp.productName || itemTitle,
                url: kentComp.productUrl,
                inStock: kentComp.availability === 'IN_STOCK' || kentPrice > 0,
                matchConfidence: kentComp.matchConfidence || 'HIGH',
                notes: kentComp.notes,
              } : undefined,
              homeDepot: hdComp ? {
                price: hdPrice,
                storeName: hdComp.competitorName || 'The Home Depot (Halifax Lacewood)',
                storeLocation: 'Halifax Lacewood',
                productTitle: hdComp.productName || itemTitle,
                url: hdComp.productUrl,
                inStock: hdComp.availability === 'IN_STOCK' || hdPrice > 0,
                matchConfidence: hdComp.matchConfidence || 'HIGH',
                notes: hdComp.notes,
              } : undefined,
              lastChecked: new Date().toISOString(),
              marketRecommendation: `ProSpaces $${item.unitPrice.toFixed(2)} vs ${kentPrice > 0 ? `Kent $${kentPrice.toFixed(2)}` : 'Kent (unlisted)'} & ${hdPrice > 0 ? `HD $${hdPrice.toFixed(2)}` : 'HD (unlisted)'}`,
            },
          };
          updatedCount++;
        }
      } catch (err) {
        console.warn(`Could not scrape competitor prices for ${itemTitle}:`, err);
      }
    }

    setShoppingList(updatedList);
    setIsSearchingPrices(false);
    toast.success(`Competitor price scraping complete. Refreshed ${updatedCount} items.`);
  };

  // Scrape competitor prices for a single item on demand
  const handleScrapeSingleItem = async (item: ShoppingListItem) => {
    const targetId = item.inventoryId || item.id;
    const { title: itemTitle, description: itemDesc } = resolveInventoryTitles(item.name, item.description, item.category);

    setScrapingItemIds((prev) => new Set(prev).add(item.id));
    toast.info(`Scraping Kent & Home Depot for "${itemTitle}"...`);

    try {
      const scrapeRes = await competitivePricingAPI.scrapeLiveItem({
        productId: targetId,
        sku: item.sku,
        name: itemTitle,
        productName: itemTitle,
        description: itemDesc,
        category: item.category,
        yourPrice: item.unitPrice,
        mfgPartNumber: item.mfgPartNumber || item.modelNumber,
        upc: item.upc,
        searchQuery: itemTitle || itemDesc,
      });

      let competitors = scrapeRes?.competitors || [];

      if (!competitors || competitors.length === 0) {
        try {
          const cached = await competitivePricingAPI.getPricing(targetId);
          if (cached?.competitors?.length) competitors = cached.competitors;
        } catch {}
      }

      if (competitors && competitors.length > 0) {
        const kentComp = competitors.find((c: any) =>
          (c.competitorName || '').toLowerCase().includes('kent') || c.competitorId === 1
        );
        const hdComp = competitors.find((c: any) =>
          (c.competitorName || '').toLowerCase().includes('home depot') || (c.competitorName || '').toLowerCase().includes('depot') || c.competitorId === 2
        );

        const kentPrice = kentComp ? Number(kentComp.price || 0) : 0;
        const hdPrice = hdComp ? Number(hdComp.price || 0) : 0;

        const lowest = Math.min(
          kentPrice > 0 ? kentPrice : Infinity,
          hdPrice > 0 ? hdPrice : Infinity
        );

        let bestDeal: any = 'prospaces';
        if (lowest !== Infinity && lowest < item.unitPrice) {
          bestDeal = lowest === kentPrice ? 'kent' : 'homeDepot';
        }

        setShoppingList((prev) =>
          prev.map((p) => {
            if (p.id !== item.id) return p;
            return {
              ...p,
              competitorData: {
                status: 'found',
                bestDeal,
                kent: kentComp ? {
                  price: kentPrice,
                  storeName: kentComp.competitorName || 'KENT Building Supplies (Bayers Lake)',
                  storeLocation: 'Halifax - Bayers Lake',
                  productTitle: kentComp.productName || itemTitle,
                  url: kentComp.productUrl,
                  inStock: kentComp.availability === 'IN_STOCK' || kentPrice > 0,
                  matchConfidence: kentComp.matchConfidence || 'HIGH',
                  notes: kentComp.notes,
                } : undefined,
                homeDepot: hdComp ? {
                  price: hdPrice,
                  storeName: hdComp.competitorName || 'The Home Depot (Halifax Lacewood)',
                  storeLocation: 'Halifax Lacewood',
                  productTitle: hdComp.productName || itemTitle,
                  url: hdComp.productUrl,
                  inStock: hdComp.availability === 'IN_STOCK' || hdPrice > 0,
                  matchConfidence: hdComp.matchConfidence || 'HIGH',
                  notes: hdComp.notes,
                } : undefined,
                lastChecked: new Date().toISOString(),
                marketRecommendation: `ProSpaces $${item.unitPrice.toFixed(2)} vs ${kentPrice > 0 ? `Kent $${kentPrice.toFixed(2)}` : 'Kent (unlisted)'} & ${hdPrice > 0 ? `HD $${hdPrice.toFixed(2)}` : 'HD (unlisted)'}`,
              },
            };
          })
        );
        toast.success(`Scraped live competitor prices for "${itemTitle}"`);
      } else {
        toast.warning(`No competitor matches found for "${itemTitle}" at Kent or Home Depot`);
      }
    } catch (err: any) {
      toast.error(`Scrape failed for ${itemTitle}: ${err.message || 'Error'}`);
    } finally {
      setScrapingItemIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  // Save Shopping List
  const handleSaveShoppingList = async () => {
    if (!saveListNameInput.trim()) {
      toast.error('Please enter a list name');
      return;
    }

    try {
      setIsSaving(true);
      const supabase = createClient();
      const payload = {
        name: saveListNameInput.trim(),
        description: saveListDescInput.trim() || 'Saved shopping list',
        organization_id: DEFAULT_ORG_ID,
        items: shoppingList,
        totals,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('saved_shopping_lists')
        .insert([payload])
        .select();

      if (error) {
        console.error('Supabase save error:', error);
        toast.error(`Failed to save: ${error.message}`);
        return;
      }

      setCurrentListName(saveListNameInput.trim());
      setIsSaveListDialogOpen(false);
      setSaveListNameInput('');
      setSaveListDescInput('');
      toast.success('Shopping list saved successfully!');
      loadSavedLists();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save shopping list');
    } finally {
      setIsSaving(false);
    }
  };

  // Load a Saved List into active state
  const handleSelectSavedList = (saved: SavedShoppingListRecord) => {
    if (saved.items && Array.isArray(saved.items)) {
      setShoppingList(saved.items);
      setCurrentListName(saved.name);
      setIsLoadListDialogOpen(false);
      toast.success(`Loaded "${saved.name}" with ${saved.items.length} items`);
    }
  };

  // Delete a Saved List
  const handleDeleteSavedList = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete saved list "${name}"?`)) return;

    try {
      const supabase = createClient();
      const { error } = await supabase.from('saved_shopping_lists').delete().eq('id', id);
      if (error) {
        toast.error(`Failed to delete: ${error.message}`);
        return;
      }
      setSavedLists((prev) => prev.filter((l) => l.id !== id));
      toast.success(`Deleted list "${name}"`);
    } catch (err: any) {
      toast.error(err.message || 'Error deleting list');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (shoppingList.length === 0) {
      toast.error('Shopping list is empty');
      return;
    }

    const headers = [
      'SKU',
      'Product Name',
      'Description',
      'Category',
      'Quantity',
      'Unit of Measure',
      'Avg Cost (CAD)',
      'Replacement Cost (CAD)',
      'Unit Retail (CAD)',
      'Cost Total (CAD)',
      'Retail Total (CAD)',
      'Kent Price (CAD)',
      'Home Depot Price (CAD)',
      'Lowest Competitor (CAD)',
      'Best Price Deal',
    ];

    const rows = shoppingList.map((item) => {
      const costToUse = costViewMode === 'replacement_cost' ? (item.replacementCost || item.cost || 0) : (item.cost || 0);
      const kentPrice = item.competitorData?.kent?.price || 0;
      const hdPrice = item.competitorData?.homeDepot?.price || 0;
      const lowestComp = Math.min(kentPrice > 0 ? kentPrice : Infinity, hdPrice > 0 ? hdPrice : Infinity);

      return [
        `"${item.sku || ''}"`,
        `"${(item.name || '').replace(/"/g, '""')}"`,
        `"${(item.description || '').replace(/"/g, '""')}"`,
        `"${item.category || ''}"`,
        item.quantity,
        `"${item.unitOfMeasure || 'EA'}"`,
        item.cost.toFixed(2),
        (item.replacementCost || item.cost || 0).toFixed(2),
        item.unitPrice.toFixed(2),
        (costToUse * item.quantity).toFixed(2),
        (item.unitPrice * item.quantity).toFixed(2),
        kentPrice > 0 ? kentPrice.toFixed(2) : 'N/A',
        hdPrice > 0 ? hdPrice.toFixed(2) : 'N/A',
        lowestComp !== Infinity ? lowestComp.toFixed(2) : 'N/A',
        `"${item.competitorData?.bestDeal || 'prospaces'}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${currentListName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Shopping list exported to CSV');
  };

  // Print Shopping List
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header and Action Bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">{currentListName}</h2>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                {shoppingList.length} {shoppingList.length === 1 ? 'item' : 'items'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Build material orders, monitor replacement vs. average cost, and compare live competitor pricing.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={handleOpenAddDialog}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs h-9"
          >
            <Plus className="h-4 w-4" />
            Add Items
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSearchCompetitorPrices}
            disabled={isSearchingPrices || shoppingList.length === 0}
            className="border-blue-200 text-blue-700 hover:bg-blue-50 text-xs h-9 gap-1.5"
          >
            {isSearchingPrices ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                Searching Prices...
              </>
            ) : (
              <>
                <Search className="h-3.5 w-3.5 text-blue-600" />
                Search Competitor Prices
              </>
            )}
          </Button>

          {/* Cost View Mode Toggle */}
          <div className="flex bg-muted p-1 rounded-md ml-2 border">
            <button
              onClick={() => setCostViewMode('avg_cost')}
              className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${costViewMode === 'avg_cost' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Avg Cost
            </button>
            <button
              onClick={() => setCostViewMode('replacement_cost')}
              className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${costViewMode === 'replacement_cost' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Rep. Cost
            </button>
          </div>

          <div className="flex items-center gap-1 border-l pl-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSaveListNameInput(currentListName);
                setIsSaveListDialogOpen(true);
              }}
              disabled={shoppingList.length === 0}
              className="text-xs h-9 gap-1"
              title="Save List"
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadSavedLists();
                setIsLoadListDialogOpen(true);
              }}
              className="text-xs h-9 gap-1"
              title="Saved Lists"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Lists ({savedLists.length})
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={shoppingList.length === 0}
              className="text-xs h-9 gap-1"
              title="Export CSV"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={shoppingList.length === 0}
              className="text-xs h-9 gap-1"
              title="Print List"
            >
              <Printer className="h-3.5 w-3.5" />
            </Button>

            {shoppingList.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearList}
                className="text-xs h-9 text-red-600 hover:bg-red-50 hover:text-red-700"
                title="Clear List"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Summary & Metrics Bar ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Total Items</span>
            <span className="text-xl font-bold text-slate-900 mt-1 block">
              {totals.totalItems} <span className="text-xs font-normal text-slate-500">({totals.totalUnits} units)</span>
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
              {costViewMode === 'replacement_cost' ? 'Total Rep. Cost' : 'Total Avg Cost'}
            </span>
            <span className="text-xl font-bold text-slate-900 mt-1 block">
              ${totals.ourCostTotal.toFixed(2)}
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Total Retail</span>
            <span className="text-xl font-bold text-emerald-700 mt-1 block">
              ${totals.ourRetailTotal.toFixed(2)}
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Expected Margin</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`text-xl font-bold ${totals.ourMargin >= 20 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {totals.ourMargin.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-400">
                (${(totals.ourRetailTotal - totals.ourCostTotal).toFixed(2)})
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Kent Total</span>
            <span className="text-xl font-bold text-slate-800 mt-1 block">
              {totals.kentTotal > 0 ? `$${totals.kentTotal.toFixed(2)}` : '—'}
            </span>
            {totals.kentTotal > 0 && (
              <span className={`text-[10px] font-medium ${totals.kentDelta <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {totals.kentDelta <= 0 ? `Save $${Math.abs(totals.kentDelta).toFixed(2)} vs Kent` : `$${totals.kentDelta.toFixed(2)} above Kent`}
              </span>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Home Depot Total</span>
            <span className="text-xl font-bold text-slate-800 mt-1 block">
              {totals.homeDepotTotal > 0 ? `$${totals.homeDepotTotal.toFixed(2)}` : '—'}
            </span>
            {totals.homeDepotTotal > 0 && (
              <span className={`text-[10px] font-medium ${totals.hdDelta <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {totals.hdDelta <= 0 ? `Save $${Math.abs(totals.hdDelta).toFixed(2)} vs HD` : `$${totals.hdDelta.toFixed(2)} above HD`}
              </span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Shopping List Items Table ── */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 font-semibold text-slate-700">Item Name & SKU</th>
                <th className="py-3 px-3 text-center">Qty</th>
                <th className="py-3 px-3 text-right">{costViewMode === 'replacement_cost' ? 'Rep. Cost' : 'Avg Cost'}</th>
                <th className="py-3 px-3 text-right">Retail</th>
                <th className="py-3 px-3 text-right">Kent Price</th>
                <th className="py-3 px-3 text-right">Home Depot</th>
                <th className="py-3 px-3 text-center">Best Deal</th>
                <th className="py-3 px-3 text-right">Line Total</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {shoppingList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <ShoppingCart className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700">Shopping List is empty</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Click "Add Items" above to select products from your inventory catalog.
                    </p>
                    <Button
                      size="sm"
                      onClick={handleOpenAddDialog}
                      className="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Browse Catalog
                    </Button>
                  </td>
                </tr>
              ) : (
                shoppingList.map((item) => {
                  const qty = item.quantity || 1;
                  const costVal = costViewMode === 'replacement_cost' ? (item.replacementCost || item.cost || 0) : (item.cost || 0);
                  const retailVal = item.unitPrice || 0;
                  const lineTotal = costVal * qty;
                  const kentPrice = item.competitorData?.kent?.price || 0;
                  const hdPrice = item.competitorData?.homeDepot?.price || 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Item Name, Description & SKU */}
                      <td className="py-3 px-3 min-w-[220px] max-w-sm">
                        <div className="flex flex-col">
                          <button
                            onClick={() => setSelectedDetailItem(item)}
                            className="font-bold text-slate-900 hover:text-blue-600 text-left text-xs sm:text-sm leading-snug transition-colors line-clamp-2"
                            title={item.name}
                          >
                            {item.name}
                          </button>
                          {item.description && item.description !== item.name && (
                            <span className="text-[11px] text-slate-500 line-clamp-1 mt-0.5" title={item.description}>
                              {item.description}
                            </span>
                          )}
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 flex-wrap">
                            {item.sku && (
                              <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-semibold border border-slate-200/80">
                                SKU: {item.sku}
                              </span>
                            )}
                            {item.modelNumber && (
                              <span className="text-slate-500 truncate max-w-[120px]">
                                Model: {item.modelNumber}
                              </span>
                            )}
                            {item.category && (
                              <span className="text-slate-500">
                                • {item.category}
                              </span>
                            )}
                          </div>
                          {item.quantityOnHand !== undefined && (
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              In Stock: {item.quantityOnHand} {item.unitOfMeasure || 'EA'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Quantity Input */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center border rounded-md shadow-2xs bg-white">
                          <button
                            onClick={() => handleUpdateQuantity(item.id, qty - 1)}
                            className="px-2 py-0.5 text-slate-500 hover:bg-slate-100 rounded-l-md font-bold text-xs"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={qty}
                            onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value, 10) || 1)}
                            className="w-12 text-center text-xs font-semibold py-0.5 border-x focus:outline-hidden"
                          />
                          <button
                            onClick={() => handleUpdateQuantity(item.id, qty + 1)}
                            className="px-2 py-0.5 text-slate-500 hover:bg-slate-100 rounded-r-md font-bold text-xs"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Avg Cost / Rep Cost */}
                      <td className="py-3 px-3 text-right font-medium text-muted-foreground">
                        ${Number(costViewMode === 'replacement_cost' ? (item.replacementCost || item.cost || 0) : (item.cost || 0)).toFixed(2)}
                      </td>

                      {/* Retail Price */}
                      <td className="py-3 px-3 text-right font-semibold text-slate-900">
                        ${retailVal.toFixed(2)}
                      </td>

                      {/* Kent Price */}
                      <td className="py-3 px-3 text-right">
                        {kentPrice > 0 ? (
                          <div className="flex flex-col items-end">
                            <span className="font-semibold text-slate-800">${kentPrice.toFixed(2)}</span>
                            {item.competitorData?.kent?.url && (
                              <a
                                href={item.competitorData.kent.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                              >
                                View Kent <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Unlisted</span>
                        )}
                      </td>

                      {/* Home Depot Price */}
                      <td className="py-3 px-3 text-right">
                        {hdPrice > 0 ? (
                          <div className="flex flex-col items-end">
                            <span className="font-semibold text-slate-800">${hdPrice.toFixed(2)}</span>
                            {item.competitorData?.homeDepot?.url && (
                              <a
                                href={item.competitorData.homeDepot.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-orange-600 hover:underline flex items-center gap-0.5"
                              >
                                View HD <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Unlisted</span>
                        )}
                      </td>

                      {/* Best Deal Badge */}
                      <td className="py-3 px-3 text-center">
                        {item.competitorData?.bestDeal === 'prospaces' ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                            ProSpaces
                          </Badge>
                        ) : item.competitorData?.bestDeal === 'kent' ? (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">
                            Kent (${kentPrice.toFixed(2)})
                          </Badge>
                        ) : item.competitorData?.bestDeal === 'homeDepot' ? (
                          <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-[10px]">
                            HD (${hdPrice.toFixed(2)})
                          </Badge>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Line Total */}
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        ${lineTotal.toFixed(2)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleScrapeSingleItem(item)}
                            disabled={scrapingItemIds.has(item.id)}
                            className="h-7 w-7 p-0 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Scrape Live Prices (Kent & Home Depot)"
                          >
                            {scrapingItemIds.has(item.id) ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setHistoryTarget(item)}
                            className="h-7 px-2 text-[11px] text-slate-600 hover:text-blue-600"
                            title="View price history chart"
                          >
                            History
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (onSelectProduct && item.inventoryId) {
                                onSelectProduct(item.inventoryId);
                              } else {
                                setSelectedDetailItem(item);
                              }
                            }}
                            className="h-7 px-2 text-[11px] text-blue-600 hover:bg-blue-50"
                            title="Inspect product"
                          >
                            Inspect
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedDetailItem(item)}
                            className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600 transition-colors"
                            title="Details"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(item.id)}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Totals Bar */}
        {shoppingList.length > 0 && (
          <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-4 flex-wrap">
              <span>Items: <strong className="text-foreground">{totals.totalItems}</strong> ({totals.totalUnits} units)</span>
              <span>{costViewMode === 'replacement_cost' ? 'Rep. Cost' : 'Avg Cost'}: <strong className="text-foreground">${totals.ourCostTotal.toFixed(2)}</strong></span>
              <span>Retail Total: <strong className="text-emerald-700">${totals.ourRetailTotal.toFixed(2)}</strong></span>
              <span>Est. Margin: <strong className={totals.ourMargin >= 20 ? 'text-emerald-600' : 'text-amber-600'}>{totals.ourMargin.toFixed(1)}%</strong></span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleSearchCompetitorPrices}
                disabled={isSearchingPrices}
                variant="outline"
                className="text-xs h-7 gap-1 text-blue-700 border-blue-200 hover:bg-blue-50"
              >
                <RefreshCw className={`h-3 w-3 ${isSearchingPrices ? 'animate-spin' : ''}`} />
                Refresh Competitor Prices
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Dialog: Add Items from Catalog ── */}
      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Package className="h-5 w-5 text-emerald-600" />
              Add Items from Inventory Catalog
            </DialogTitle>
            <DialogDescription className="text-xs">
              Search by SKU, product name, description, or supplier code to add items to your shopping list.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search catalog by SKU, name, or keywords..."
                  value={catalogSearchQuery}
                  onChange={(e) => {
                    setCatalogSearchQuery(e.target.value);
                    handleSearchCatalog(e.target.value, selectedCatalogCategory);
                  }}
                  className="pl-9 text-xs h-9"
                />
              </div>

              {catalogCategories.length > 0 && (
                <select
                  value={selectedCatalogCategory}
                  onChange={(e) => {
                    setSelectedCatalogCategory(e.target.value);
                    handleSearchCatalog(catalogSearchQuery, e.target.value);
                  }}
                  className="h-9 px-2.5 text-xs rounded-md border border-slate-200 bg-white text-slate-700"
                >
                  <option value="all">All Categories</option>
                  {catalogCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto border rounded-md divide-y divide-slate-100 max-h-96">
            {isCatalogLoading ? (
              <div className="py-12 text-center text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
                <p className="text-xs">Searching inventory database...</p>
              </div>
            ) : catalogItems.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Package className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs">No matching inventory items found</p>
              </div>
            ) : (
              catalogItems.map((item) => {
                const qtyToAdd = quickAddQuantities[item.id] || 1;
                const inList = shoppingList.find((p) => p.sku === item.sku || p.id === item.id || p.inventoryId === item.id);

                return (
                  <div key={item.id} className="p-3 hover:bg-slate-50 flex items-center justify-between gap-3 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 truncate">{item.name}</span>
                        {item.sku && (
                          <span className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded text-slate-600">
                            {item.sku}
                          </span>
                        )}
                        {item.category && (
                          <Badge variant="outline" className="text-[9px] py-0">
                            {item.category}
                          </Badge>
                        )}
                      </div>
                      <p className="text-slate-500 text-[11px] truncate mt-0.5">{item.description}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                        <span>Avg Cost: ${Number(item.cost || 0).toFixed(2)}</span>
                        <span>Rep. Cost: ${Number(item.replacementCost || item.cost || 0).toFixed(2)}</span>
                        <span className="font-semibold text-emerald-700">Retail: ${Number(item.unitPrice || 0).toFixed(2)}</span>
                        <span>Stock: {item.quantityOnHand}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center border rounded bg-white">
                        <button
                          onClick={() =>
                            setQuickAddQuantities((prev) => ({
                              ...prev,
                              [item.id]: Math.max(1, (prev[item.id] || 1) - 1),
                            }))
                          }
                          className="px-2 py-0.5 text-slate-500 hover:bg-slate-100 text-xs"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={qtyToAdd}
                          onChange={(e) =>
                            setQuickAddQuantities((prev) => ({
                              ...prev,
                              [item.id]: Math.max(1, parseInt(e.target.value, 10) || 1),
                            }))
                          }
                          className="w-10 text-center text-xs py-0.5 border-x focus:outline-hidden"
                        />
                        <button
                          onClick={() =>
                            setQuickAddQuantities((prev) => ({
                              ...prev,
                              [item.id]: (prev[item.id] || 1) + 1,
                            }))
                          }
                          className="px-2 py-0.5 text-slate-500 hover:bg-slate-100 text-xs"
                        >
                          +
                        </button>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleAddCatalogItem(item)}
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {inList ? <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                        {inList ? `Add +${qtyToAdd}` : 'Add'}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="mt-3">
            <Button variant="outline" size="sm" onClick={() => setIsAddItemDialogOpen(false)} className="text-xs">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Save Shopping List ── */}
      <Dialog open={isSaveListDialogOpen} onOpenChange={setIsSaveListDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Save className="h-4 w-4 text-blue-600" />
              Save Current Shopping List
            </DialogTitle>
            <DialogDescription className="text-xs">
              Save your shopping list with its items, competitor price data, and notes for future access.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">List Name</label>
              <Input
                placeholder="e.g. Deck Framing Package"
                value={saveListNameInput}
                onChange={(e) => setSaveListNameInput(e.target.value)}
                className="text-xs h-9"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Description / Project Notes</label>
              <Input
                placeholder="e.g. Materials for project #1042"
                value={saveListDescInput}
                onChange={(e) => setSaveListDescInput(e.target.value)}
                className="text-xs h-9"
              />
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Items to save:</span>
                <span className="font-semibold">{shoppingList.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Units:</span>
                <span className="font-semibold">{totals.totalUnits}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Cost:</span>
                <span className="font-semibold">${totals.ourCostTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setIsSaveListDialogOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveShoppingList}
              disabled={isSaving || !saveListNameInput.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Load Saved Shopping Lists ── */}
      <Dialog open={isLoadListDialogOpen} onOpenChange={setIsLoadListDialogOpen}>
        <DialogContent className="max-w-xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-blue-600" />
              Saved Shopping Lists
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select a previously saved shopping list to load it into your active workspace.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto border rounded-md divide-y divide-slate-100 my-2 max-h-80">
            {isLoadingSavedLists ? (
              <div className="py-12 text-center text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" />
                <p className="text-xs">Loading saved shopping lists...</p>
              </div>
            ) : savedLists.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <FolderOpen className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs">No saved shopping lists found</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Save your current shopping list using the "Save" button in the toolbar.
                </p>
              </div>
            ) : (
              savedLists.map((list) => (
                <div
                  key={list.id}
                  onClick={() => handleSelectSavedList(list)}
                  className="p-3.5 hover:bg-blue-50/50 cursor-pointer flex items-center justify-between gap-3 transition-colors text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{list.name}</span>
                      <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600">
                        {list.items?.length || 0} items
                      </Badge>
                    </div>
                    {list.description && (
                      <p className="text-slate-500 text-[11px] mt-0.5">{list.description}</p>
                    )}
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Saved {list.created_at ? new Date(list.created_at).toLocaleDateString() : 'recently'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSelectSavedList(list)}
                      className="h-7 text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
                    >
                      Load List
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => handleDeleteSavedList(list.id, list.name, e)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                      title="Delete saved list"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" size="sm" onClick={() => setIsLoadListDialogOpen(false)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Item Detail & Competitor Breakdown ── */}
      {selectedDetailItem && (
        <Dialog open={!!selectedDetailItem} onOpenChange={() => setSelectedDetailItem(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600" />
                Product & Competitor Pricing Details
              </DialogTitle>
              <DialogDescription className="text-xs">
                Detailed cost, margin, and competitor price tracking.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-2 text-xs">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{selectedDetailItem.name}</h4>
                <p className="text-slate-600 mt-1">{selectedDetailItem.description}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {selectedDetailItem.sku && (
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      SKU: {selectedDetailItem.sku}
                    </Badge>
                  )}
                  {selectedDetailItem.category && (
                    <Badge variant="outline" className="text-[10px]">
                      {selectedDetailItem.category}
                    </Badge>
                  )}
                  {selectedDetailItem.modelNumber && (
                    <Badge variant="outline" className="text-[10px]">
                      Model: {selectedDetailItem.modelNumber}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Pricing Cards */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Avg Cost</span>
                  <span className="font-bold text-slate-800 text-sm">${selectedDetailItem.cost.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Replacement Cost</span>
                  <span className="font-bold text-slate-800 text-sm">
                    ${(selectedDetailItem.replacementCost || selectedDetailItem.cost).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Retail Price</span>
                  <span className="font-bold text-emerald-700 text-sm">${selectedDetailItem.unitPrice.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-slate-700">
                <span className="capitalize">{costViewMode.replace('_', ' ')}: ${(costViewMode === 'replacement_cost' ? (selectedDetailItem.replacementCost || selectedDetailItem.cost || 0) : selectedDetailItem.cost).toFixed(2)}</span>
              </div>

              {/* Competitor Price Comparison */}
              <div className="space-y-2 pt-2 border-t">
                <h5 className="font-semibold text-slate-800 flex items-center justify-between">
                  <span>Regional Competitor Comparison</span>
                  {selectedDetailItem.competitorData?.lastChecked && (
                    <span className="text-[10px] font-normal text-slate-400">
                      Checked: {new Date(selectedDetailItem.competitorData.lastChecked).toLocaleTimeString()}
                    </span>
                  )}
                </h5>

                {/* Kent */}
                <div className="p-2.5 rounded-lg border bg-white flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-800 block">KENT Building Supplies</span>
                    <span className="text-[11px] text-slate-500">
                      {selectedDetailItem.competitorData?.kent?.storeLocation || 'Halifax - Bayers Lake'}
                    </span>
                  </div>
                  <div className="text-right">
                    {selectedDetailItem.competitorData?.kent?.price ? (
                      <div>
                        <span className="font-bold text-slate-900">${selectedDetailItem.competitorData.kent.price.toFixed(2)}</span>
                        {selectedDetailItem.competitorData.kent.url && (
                          <a
                            href={selectedDetailItem.competitorData.kent.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-[10px] text-blue-600 hover:underline"
                          >
                            View on Kent.ca
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">Unlisted</span>
                    )}
                  </div>
                </div>

                {/* Home Depot */}
                <div className="p-2.5 rounded-lg border bg-white flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-800 block">The Home Depot</span>
                    <span className="text-[11px] text-slate-500">
                      {selectedDetailItem.competitorData?.homeDepot?.storeLocation || 'Halifax Lacewood'}
                    </span>
                  </div>
                  <div className="text-right">
                    {selectedDetailItem.competitorData?.homeDepot?.price ? (
                      <div>
                        <span className="font-bold text-slate-900">${selectedDetailItem.competitorData.homeDepot.price.toFixed(2)}</span>
                        {selectedDetailItem.competitorData.homeDepot.url && (
                          <a
                            href={selectedDetailItem.competitorData.homeDepot.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-[10px] text-orange-600 hover:underline"
                          >
                            View on HomeDepot.ca
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">Unlisted</span>
                    )}
                  </div>
                </div>

                {selectedDetailItem.competitorData?.marketRecommendation && (
                  <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200 text-blue-900 text-[11px] mt-2">
                    <span className="font-semibold block mb-0.5">Market Recommendation:</span>
                    {selectedDetailItem.competitorData.marketRecommendation}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="mt-3">
              <Button variant="outline" size="sm" onClick={() => setSelectedDetailItem(null)} className="text-xs">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* History modal */}
      {historyTarget && (
        <PriceHistoryModal
          open={!!historyTarget}
          onOpenChange={(open) => !open && setHistoryTarget(null)}
          productId={historyTarget.inventoryId || historyTarget.id}
          productName={historyTarget.name}
          description={historyTarget.description}
          sku={historyTarget.sku}
          yourPrice={historyTarget.unitPrice}
        />
      )}
    </div>
  );
}
