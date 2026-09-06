import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ShoppingCart,
  Search,
  Sparkles,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building2,
  Store,
  Plus,
  Trash2,
  RefreshCw,
  Download,
  Printer,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Info,
  X,
  ChevronRight,
  ChevronLeft,
  ListPlus,
  Package,
  Layers,
  ArrowRight,
  Check,
  Percent,
  MapPin,
  Clock,
  HelpCircle,
  BarChart2,
  Loader2,
  Edit2,
  Pencil,
  Save,
  Globe,
  FolderOpen
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { toast } from 'sonner';
import { createClient } from '../../utils/supabase/client';
import { getSupabaseUrl } from '../../utils/supabase/client';
import { getServerHeaders } from '../../utils/server-headers';
import { loadInventoryPage } from '../../utils/inventory-loader';
import { useDebounce } from '../../utils/useDebounce';
import { competitivePricingAPI } from '../../utils/api';
import { CompetitivePricingPanel } from './CompetitivePricingPanel';

const supabase = createClient();
const supabaseUrl = getSupabaseUrl();

export interface ShoppingListItem {
  id: string;
  inventoryId?: string;
  sku: string;
  name: string;
  description: string;
  mfgPartNumber?: string;
  upc?: string;
  manufacturer?: string;
  category: string;
  unitOfMeasure: string;
  cost: number; // Avg Cost
  replacementCost?: number; // Replacement Cost from inventory table
  unitPrice: number; // Retail Price
  quantity: number;
  quantityOnHand?: number;
  competitorData?: {
    lastChecked?: string;
    activeSearchQuery?: string;
    status: 'idle' | 'searching' | 'found' | 'error';
    error?: string;
    parsedAttributes?: {
      material?: string;
      dimensions?: string;
      length?: string;
      productType?: string;
      grade?: string;
      treatment?: string;
    };
    kent?: {
      competitorName?: string;
      storeName: string;
      price: number;
      retailPrice?: number;
      sku?: string;
      modelNumber?: string;
      productName?: string;
      productTitle?: string;
      inStock?: boolean;
      stockStatus?: string;
      url?: string;
      productUrl?: string;
      googleSearchUrl?: string;
      bingSearchUrl?: string;
      storeLocation?: string;
      variancePct?: number;
      priceDifference?: number;
      unit?: string;
      unitOfMeasure?: string;
      notes?: string;
      matchConfidence?: 'high' | 'medium' | 'exact' | 'not_found';
      matchConfidencePct?: number;
    };
    homeDepot?: {
      competitorName?: string;
      storeName: string;
      price: number;
      retailPrice?: number;
      sku?: string;
      modelNumber?: string;
      productName?: string;
      productTitle?: string;
      inStock?: boolean;
      stockStatus?: string;
      url?: string;
      productUrl?: string;
      googleSearchUrl?: string;
      bingSearchUrl?: string;
      storeLocation?: string;
      variancePct?: number;
      priceDifference?: number;
      unit?: string;
      unitOfMeasure?: string;
      notes?: string;
      matchConfidence?: 'high' | 'medium' | 'exact' | 'not_found';
      matchConfidencePct?: number;
    };
    marketRecommendation?: string;
    bestDeal?: 'prospaces' | 'kent' | 'home_depot' | 'tie';
    groundingSources?: Array<{ title: string; url: string }>;
  };
}

interface ShoppingListSubModuleProps {
  user: any;
  items?: any[];
  availableCategories?: string[];
  onOpenItemDetail?: (item: any) => void;
  onNavigateToCatalog?: () => void;
  searchQuery?: string;
}

/**
 * Determine the most accurate competitor search query for trade items
 * Prioritizes full product description (e.g. "SPF 2X8X10' LUMBER #2 & BETTER") and manufacturer part numbers
 */
export function getItemSearchQuery(item: {
  description?: string;
  name?: string;
  mfgPartNumber?: string;
  manufacturer?: string;
  sku?: string;
  modelNumber?: string;
  upc?: string;
}): string {
  const rawDesc = (item.description || '').trim();
  // Strip internal tags like *RED*, *GRN*, etc.
  const cleanDesc = rawDesc.replace(/\*.*?\*/g, '').replace(/\s+/g, ' ').trim();
  const mfg = (item.mfgPartNumber || item.modelNumber || '').trim();
  const brand = (item.manufacturer || '').trim();
  const name = (item.name || '').trim();
  const upc = (item.upc || '').trim();

  // If UPC is available and standard length
  if (upc && upc.length >= 8 && /^\d+$/.test(upc)) {
    return cleanDesc ? `${cleanDesc} ${upc}`.trim() : (name ? `${name} ${upc}`.trim() : upc);
  }

  // If we have a descriptive text (e.g. "5/8" 4X8 SPRUCE PLYWOOD", "2X4X8' SPF STUD")
  if (cleanDesc && cleanDesc.length > 3) {
    // If mfg is an alphanumeric model number (like DCD771, LUS28Z, DW-CGC) and not already in cleanDesc
    if (mfg && /[a-zA-Z]/.test(mfg) && !cleanDesc.toLowerCase().includes(mfg.toLowerCase())) {
      return `${cleanDesc} ${mfg}`.trim();
    }
    return cleanDesc;
  }

  // If name is present
  if (name) {
    if (mfg && !name.toLowerCase().includes(mfg.toLowerCase())) {
      return `${name} ${mfg}`.trim();
    }
    if (brand && !name.toLowerCase().includes(brand.toLowerCase())) {
      return `${brand} ${name}`.trim();
    }
    return name;
  }

  return cleanDesc || mfg || item.sku || 'building materials';
}

// Sample starter templates for Halifax NS contractor & building material tests
const PRESET_LISTS = [
  {
    name: 'Halifax Framing & Lumber Essentials',
    description: 'Core 2x4, 2x6 framing studs & standard Canadian SPF lumber',
    sampleSkus: ['LMB-2X4-8SPF', 'LMB-2X6-10SPF', 'PLY-OSB-716', 'PLY-CDX-12', 'FAST-PASL-314'],
    keywords: ['framing', 'lumber', '2x4', '2x6', 'osb']
  },
  {
    name: 'Drywall & Interior Finishing',
    description: 'Drywall sheets, joint compound, screws & corner beads',
    sampleSkus: ['DW-CGC-12-8', 'DW-CGC-12-12', 'CPD-ALLPURP-20KG', 'SCRW-DW-158', 'TAPE-DW-500FT'],
    keywords: ['drywall', 'sheetrock', 'compound', 'screw']
  },
  {
    name: 'Exterior Decking & Hardware',
    description: 'Pressure treated 5/4 deck boards, joist hangers & deck screws',
    sampleSkus: ['DK-PT-546-12', 'DK-PT-546-16', 'SCRW-GRX-3IN-1000', 'HNG-LUS28-ZMAX', 'POST-PT-4X4-8'],
    keywords: ['decking', 'treated', 'pt', 'hanger', 'screw']
  }
];

// Helper to parse cost or replacement cost stored in cents or dollars from Supabase
export function parseInventoryCostValue(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  const num = Number(val);
  if (isNaN(num)) return 0;
  // In Supabase inventory table, amounts are stored as integers in cents:
  // e.g. 1071 cents -> $10.71, 1121 cents -> $11.21, 341 cents -> $3.41, 354 cents -> $3.54
  if (Number.isInteger(num) && num > 0) {
    return Number((num / 100).toFixed(2));
  }
  return Number(num.toFixed(2));
}

// Helper to normalize raw database inventory rows
function mapDbRowToInventoryItem(rawItem: any) {
  const rawUnitPrice = rawItem.unit_price ?? rawItem.price_tier_1 ?? rawItem.unitPrice ?? 0;
  const rawCost = rawItem.cost ?? 0;
  const rawReplacementCost = rawItem.replacement_cost ?? rawItem.replacementCost ?? null;
  
  const unitPrice = rawItem.unitPrice !== undefined 
    ? Number(rawItem.unitPrice) 
    : (typeof rawUnitPrice === 'number' && rawUnitPrice > 0 && Number.isInteger(rawUnitPrice) ? rawUnitPrice / 100 : Number(rawUnitPrice || 0));
  
  const cost = rawItem.costInDollars !== undefined 
    ? Number(rawItem.costInDollars) 
    : parseInventoryCostValue(rawCost);
    
  let replacementCost = cost;
  if (rawItem.replacementCostInDollars !== undefined && rawItem.replacementCostInDollars !== null) {
    replacementCost = Number(rawItem.replacementCostInDollars);
  } else if (rawReplacementCost !== null && rawReplacementCost !== undefined && rawReplacementCost !== '') {
    replacementCost = parseInventoryCostValue(rawReplacementCost);
  }

  return {
    id: rawItem.id || `inv_${Math.random().toString(36).substring(2, 9)}`,
    sku: rawItem.sku || 'N/A',
    name: rawItem.name || rawItem.item_name || 'Unnamed Material',
    description: rawItem.description || rawItem.name || '',
    mfgPartNumber: (rawItem.supplier_sku || rawItem.supplierSKU || rawItem.supplierSku || rawItem.mfg_part_number || rawItem.mfgPartNumber || rawItem.mpn || rawItem.model_number || rawItem.modelNumber || '').trim(),
    upc: (rawItem.upc || rawItem.barcode || rawItem.upc_code || '').trim(),
    manufacturer: rawItem.manufacturer || rawItem.brand || '',
    category: rawItem.category || 'BUILDING MATERIALS',
    unitOfMeasure: (rawItem.unit_of_measure || rawItem.unitOfMeasure || 'EA').toUpperCase(),
    cost: Number(cost || 0),
    replacementCost: Number(replacementCost !== undefined && replacementCost !== null ? replacementCost : (cost || 0)),
    unitPrice: Number(unitPrice || 0),
    quantityOnHand: rawItem.quantity ?? rawItem.quantity_on_hand ?? rawItem.quantityOnHand ?? 0,
  };
}

export function ShoppingListSubModule({
  user,
  items: inventoryCatalogItems = [],
  availableCategories: propCategories = [],
  onNavigateToCatalog,
  searchQuery = ''
}: ShoppingListSubModuleProps) {
  const orgId = user?.organizationId || user?.organization_id || '34638283-7b3d-47e2-bec8-a9e600e28c4a';
  const storageKey = `prospaces_shopping_list_${orgId}`;

  // Shopping list state persisted in local storage
  const [costViewMode, setCostViewMode] = useState<"avg_cost" | "replacement_cost">("avg_cost");
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Remove legacy test items (IDs like sl_1, sl_2, etc.)
          return parsed.filter(item => !item.id?.match(/^sl_\d+$/));
        }
      }
    } catch (e) {
      console.warn('Failed to load shopping list from storage:', e);
    }
    return [];
  });

  // Category state (loaded across full organization inventory)
  const [categories, setCategories] = useState<string[]>(() => propCategories.length > 0 ? propCategories : []);

  // UI state for item picker modal
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSearchQuery, setPickerSearchQuery] = useState('');
  const debouncedPickerSearch = useDebounce(pickerSearchQuery, 250);
  const [pickerCategory, setPickerCategory] = useState('all');
  const [pickerPage, setPickerPage] = useState(1);
  const pickerItemsPerPage = 40;
  
  // Live items fetched from database for the picker
  const [dbPickerItems, setDbPickerItems] = useState<any[]>([]);
  const [dbPickerTotalCount, setDbPickerTotalCount] = useState(0);
  const [isPickerLoading, setIsPickerLoading] = useState(false);
  
  // Track selected items across different search queries/pages: itemId -> itemData
  const [selectedItemsMap, setSelectedItemsMap] = useState<Record<string, any>>({});

  // Quick add state
  const [quickAddSku, setQuickAddSku] = useState('');
  const debouncedQuickAdd = useDebounce(quickAddSku, 250);
  const [quickAddSuggestions, setQuickAddSuggestions] = useState<any[]>([]);
  const [isSearchingQuickAdd, setIsSearchingQuickAdd] = useState(false);
  const [showQuickAddDropdown, setShowQuickAddDropdown] = useState(false);

  // Competitor intelligence state
  const [isSearchingAll, setIsSearchingAll] = useState(false);
  const [searchProgress, setSearchProgress] = useState({ current: 0, total: 0 });
  const [selectedDetailItem, setSelectedDetailItem] = useState<ShoppingListItem | null>(null);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [isModalSearching, setIsModalSearching] = useState(false);
  const [editingCell, setEditingCell] = useState<{ itemId: string; competitor: 'kent' | 'homeDepot' | 'ourRetail' } | null>(null);
  const [tempEditPrice, setTempEditPrice] = useState<string>('');
  const [modalCustomKentPrice, setModalCustomKentPrice] = useState<string>('');
  const [modalCustomHdPrice, setModalCustomHdPrice] = useState<string>('');

  // Sync modal query and manual prices when selectedDetailItem changes
  useEffect(() => {
    if (selectedDetailItem) {
      const defaultQuery = selectedDetailItem.competitorData?.activeSearchQuery || getItemSearchQuery(selectedDetailItem);
      setModalSearchQuery(defaultQuery);
      setModalCustomKentPrice(selectedDetailItem.competitorData?.kent?.price ? String(selectedDetailItem.competitorData.kent.price) : '');
      setModalCustomHdPrice(selectedDetailItem.competitorData?.homeDepot?.price ? String(selectedDetailItem.competitorData.homeDepot.price) : '');
    }
  }, [selectedDetailItem?.id]);

  // Save to localStorage whenever shopping list updates
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(shoppingList));
    } catch (e) {
      console.warn('Failed to save shopping list to storage:', e);
    }
  }, [shoppingList, storageKey]);

  // Cache of Supabase database costs (cost and replacement_cost)
  const [dbCostMap, setDbCostMap] = useState<Map<string, { cost: number; replacementCost: number }>>(new Map());
  const [isSyncingCosts, setIsSyncingCosts] = useState(false);

  // Saved Lists State
  const [isSaveListModalOpen, setIsSaveListModalOpen] = useState(false);
  const [saveListName, setSaveListName] = useState('');
  const [saveListDescription, setSaveListDescription] = useState('');
  const [isSavingList, setIsSavingList] = useState(false);
  
  const [isLoadListModalOpen, setIsLoadListModalOpen] = useState(false);
  const [savedLists, setSavedLists] = useState<any[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(false);
  const [currentSavedListId, setCurrentSavedListId] = useState<string | null>(null);

  // Helper to lookup cost and replacement cost from Supabase cache or item properties
  const getItemCostDetails = useCallback((item: ShoppingListItem) => {
    let match: { cost: number; replacementCost: number } | undefined;
    if (item.inventoryId && dbCostMap.has(item.inventoryId)) {
      match = dbCostMap.get(item.inventoryId);
    } else if (item.id && dbCostMap.has(item.id)) {
      match = dbCostMap.get(item.id);
    } else if (item.sku) {
      match = dbCostMap.get(item.sku) ||
              dbCostMap.get(item.sku.trim()) ||
              dbCostMap.get(item.sku.toUpperCase()) ||
              dbCostMap.get(item.sku.replace(/^0+/, '')) ||
              dbCostMap.get(item.sku.padStart(7, '0')) ||
              dbCostMap.get(item.sku.padStart(8, '0'));
    }

    const avgCost = match && match.cost > 0 ? match.cost : (item.cost || 0);
    const repCost = match && match.replacementCost > 0 
      ? match.replacementCost 
      : (item.replacementCost !== undefined && item.replacementCost !== null && item.replacementCost > 0 ? item.replacementCost : avgCost);
    const activeCost = costViewMode === "replacement_cost" ? repCost : avgCost;

    return { avgCost, repCost, activeCost };
  }, [dbCostMap, costViewMode]);

  // Sync / hydrate costs and replacement_cost directly from Supabase inventory table
  const syncCostsFromSupabase = useCallback(async () => {
    if (shoppingList.length === 0) return;

    try {
      setIsSyncingCosts(true);
      const rawSkus = shoppingList.map(item => item.sku).filter(Boolean);
      const skuSet = new Set<string>();
      rawSkus.forEach(s => {
        if (!s) return;
        skuSet.add(s);
        skuSet.add(s.trim());
        skuSet.add(s.toUpperCase());
        const noLeadingZero = s.replace(/^0+/, '');
        if (noLeadingZero) skuSet.add(noLeadingZero);
        if (s.length < 8 && /^\d+$/.test(s)) {
          skuSet.add(s.padStart(7, '0'));
          skuSet.add(s.padStart(8, '0'));
        }
      });

      const ids = shoppingList
        .map(item => item.inventoryId || item.id)
        .filter(id => id && !id.startsWith('sl_'));

      const skuList = Array.from(skuSet);
      const queryPromises: Promise<any>[] = [];
      if (skuList.length > 0) {
        queryPromises.push(
          supabase
            .from('inventory')
            .select('id, sku, cost, replacement_cost')
            .in('sku', skuList)
        );
      }
      if (ids.length > 0) {
        queryPromises.push(
          supabase
            .from('inventory')
            .select('id, sku, cost, replacement_cost')
            .in('id', ids)
        );
      }

      const results = await Promise.all(queryPromises);
      const rows: any[] = [];
      results.forEach(res => {
        if (!res.error && res.data && Array.isArray(res.data)) {
          rows.push(...res.data);
        }
      });

      if (rows.length > 0) {
        const newMap = new Map<string, { cost: number; replacementCost: number }>();
        rows.forEach(row => {
          const cost = parseInventoryCostValue(row.cost);
          const repCost = row.replacement_cost !== null && row.replacement_cost !== undefined && row.replacement_cost !== ''
            ? parseInventoryCostValue(row.replacement_cost)
            : cost;

          const entry = { cost, replacementCost: repCost };
          if (row.sku) {
            newMap.set(row.sku, entry);
            newMap.set(row.sku.trim(), entry);
            newMap.set(row.sku.toUpperCase(), entry);
            const unpadded = row.sku.replace(/^0+/, '');
            if (unpadded) newMap.set(unpadded, entry);
            if (row.sku.length < 8 && /^\d+$/.test(row.sku)) {
              newMap.set(row.sku.padStart(7, '0'), entry);
              newMap.set(row.sku.padStart(8, '0'), entry);
            }
          }
          if (row.id) {
            newMap.set(row.id, entry);
          }
        });

        setDbCostMap(prev => {
          const merged = new Map(prev);
          newMap.forEach((v, k) => merged.set(k, v));
          return merged;
        });

        // Ensure shoppingList items in state have the latest cost & replacementCost from Supabase
        setShoppingList(prevList => {
          let changed = false;
          const nextList = prevList.map(item => {
            let match: { cost: number; replacementCost: number } | undefined;
            if (item.inventoryId && newMap.has(item.inventoryId)) {
              match = newMap.get(item.inventoryId);
            } else if (item.id && newMap.has(item.id)) {
              match = newMap.get(item.id);
            } else if (item.sku) {
              match = newMap.get(item.sku) ||
                      newMap.get(item.sku.trim()) ||
                      newMap.get(item.sku.toUpperCase()) ||
                      newMap.get(item.sku.replace(/^0+/, '')) ||
                      newMap.get(item.sku.padStart(7, '0')) ||
                      newMap.get(item.sku.padStart(8, '0'));
            }

            if (match) {
              const currentCost = item.cost;
              const currentRc = item.replacementCost;
              const dbCost = match.cost;
              const dbRc = match.replacementCost;

              if (currentCost !== dbCost || currentRc !== dbRc) {
                changed = true;
                return {
                  ...item,
                  cost: dbCost > 0 ? dbCost : currentCost,
                  replacementCost: dbRc > 0 ? dbRc : (dbCost > 0 ? dbCost : currentCost)
                };
              }
            }
            return item;
          });

          return changed ? nextList : prevList;
        });
      }
    } catch (err) {
      console.warn('[ShoppingList] Failed to sync replacement costs from Supabase:', err);
    } finally {
      setIsSyncingCosts(false);
    }
  }, [shoppingList]);

  // Initial and reactive cost synchronization from Supabase
  useEffect(() => {
    syncCostsFromSupabase();
  }, [shoppingList.length]);

  // Handler to toggle cost view mode and immediately sync latest Supabase costs
  const handleToggleCostViewMode = (mode: "avg_cost" | "replacement_cost") => {
    setCostViewMode(mode);
    syncCostsFromSupabase();
  };

  // Load all distinct categories across the database if not provided
  useEffect(() => {
    if (propCategories.length > 0) {
      setCategories(propCategories);
      return;
    }

    let isMounted = true;
    async function fetchAllCategories() {
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_distinct_categories', { org_id: orgId });
        if (!rpcError && rpcData && Array.isArray(rpcData)) {
          const uniqueCats = rpcData.map((row: any) => typeof row === 'object' ? row.category : row).filter(Boolean);
          const sorted = Array.from(new Set(uniqueCats.map((c: string) => c.trim()))).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
          if (isMounted) setCategories(sorted);
          return;
        }

        // Direct select fallback
        const { data: catData, error: catError } = await supabase
          .from('inventory')
          .select('category')
          .eq('organization_id', orgId);

        if (!catError && catData && isMounted) {
          const set = new Set<string>();
          catData.forEach(r => { if (r.category) set.add(r.category.trim()); });
          const sorted = Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
          setCategories(sorted);
        }
      } catch (err) {
        console.warn('Failed to fetch distinct categories:', err);
      }
    }

    fetchAllCategories();
    return () => { isMounted = false; };
  }, [orgId, propCategories]);

  // Live database query when picker opens or when search/category/page changes
  useEffect(() => {
    if (!isPickerOpen) return;

    let isMounted = true;
    async function loadPickerItems() {
      setIsPickerLoading(true);
      try {
        const result = await loadInventoryPage({
          organizationId: orgId,
          currentPage: pickerPage,
          itemsPerPage: pickerItemsPerPage,
          searchQuery: debouncedPickerSearch,
          categoryFilter: pickerCategory,
          statusFilter: 'all'
        });

        if (isMounted) {
          const mapped = result.items.map(mapDbRowToInventoryItem);
          setDbPickerItems(mapped);
          setDbPickerTotalCount(result.totalCount);
        }
      } catch (err) {
        console.error('Failed to load items in picker:', err);
        if (isMounted) {
          setDbPickerItems([]);
          setDbPickerTotalCount(0);
        }
      } finally {
        if (isMounted) setIsPickerLoading(false);
      }
    }

    loadPickerItems();
    return () => { isMounted = false; };
  }, [isPickerOpen, orgId, debouncedPickerSearch, pickerCategory, pickerPage]);

  // Reset picker page to 1 when search or category filter changes
  useEffect(() => {
    setPickerPage(1);
  }, [debouncedPickerSearch, pickerCategory]);

  // Live Quick Add autocomplete query against full database
  useEffect(() => {
    const q = debouncedQuickAdd.trim();
    if (!q || q.length < 2) {
      setQuickAddSuggestions([]);
      setShowQuickAddDropdown(false);
      return;
    }

    let isMounted = true;
    async function fetchQuickSuggestions() {
      setIsSearchingQuickAdd(true);
      try {
        const result = await loadInventoryPage({
          organizationId: orgId,
          currentPage: 1,
          itemsPerPage: 6,
          searchQuery: q,
          categoryFilter: 'all'
        });

        if (isMounted) {
          const mapped = result.items.map(mapDbRowToInventoryItem);
          setQuickAddSuggestions(mapped);
          setShowQuickAddDropdown(mapped.length > 0);
        }
      } catch (err) {
        if (isMounted) setQuickAddSuggestions([]);
      } finally {
        if (isMounted) setIsSearchingQuickAdd(false);
      }
    }

    fetchQuickSuggestions();
    return () => { isMounted = false; };
  }, [debouncedQuickAdd, orgId]);

  // Toggle selection for an item in picker
  const toggleItemSelection = (item: any) => {
    setSelectedItemsMap(prev => {
      const next = { ...prev };
      if (next[item.id]) {
        delete next[item.id];
      } else {
        next[item.id] = item;
      }
      return next;
    });
  };

  // Add all selected items from picker to shopping list
  const handleAddItemsFromPicker = () => {
    const itemsToAdd = Object.values(selectedItemsMap);
    if (itemsToAdd.length === 0) return;

    setShoppingList(prev => {
      const existingMap = new Map(prev.map(p => [p.sku, p]));
      const nextList = [...prev];

      itemsToAdd.forEach((invItem: any) => {
        const sku = invItem.sku || invItem.id;
        if (existingMap.has(sku)) {
          const existing = existingMap.get(sku)!;
          existing.quantity = (existing.quantity || 1) + 1;
        } else {
          const newItem: ShoppingListItem = {
            id: 'sl_' + Math.random().toString(36).substring(2, 9),
            inventoryId: invItem.id,
            sku: invItem.sku,
            name: invItem.name,
            description: invItem.description || invItem.name,
            mfgPartNumber: (invItem.mfgPartNumber || invItem.mfg_part_number || invItem.supplier_sku || invItem.supplierSKU || '').trim(),
            upc: (invItem.upc || invItem.barcode || '').trim(),
            manufacturer: invItem.manufacturer || invItem.brand || '',
            category: invItem.category || 'General Building Supply',
            unitOfMeasure: (invItem.unitOfMeasure || 'EA').toUpperCase(),
            cost: Number(invItem.cost || 0),
            replacementCost: Number(invItem.replacementCost !== undefined && invItem.replacementCost !== null ? invItem.replacementCost : (invItem.cost || 0)),
            unitPrice: Number(invItem.unitPrice || 0),
            quantity: 1,
            quantityOnHand: invItem.quantityOnHand ?? 0,
            competitorData: { status: 'idle' }
          };
          nextList.push(newItem);
          existingMap.set(sku, newItem);
        }
      });

      return nextList;
    });

    toast.success(`Added ${itemsToAdd.length} item${itemsToAdd.length > 1 ? 's' : ''} to Shopping List`);
    setSelectedItemsMap({});
    setIsPickerOpen(false);
  };

  // Add a specific item directly to shopping list
  const handleAddSingleItem = (invItem: any) => {
    setShoppingList(prev => {
      const sku = invItem.sku || invItem.id;
      const existing = prev.find(p => p.sku === sku);
      if (existing) {
        return prev.map(p => p.sku === sku ? { ...p, quantity: (p.quantity || 1) + 1 } : p);
      }
      return [
        ...prev,
        {
          id: 'sl_' + Math.random().toString(36).substring(2, 9),
          inventoryId: invItem.id,
          sku: invItem.sku,
          name: invItem.name,
          description: invItem.description || invItem.name,
          mfgPartNumber: (invItem.mfgPartNumber || invItem.mfg_part_number || invItem.supplier_sku || invItem.supplierSKU || '').trim(),
          upc: (invItem.upc || invItem.barcode || '').trim(),
          manufacturer: invItem.manufacturer || invItem.brand || '',
          category: invItem.category || 'Materials',
          unitOfMeasure: (invItem.unitOfMeasure || 'EA').toUpperCase(),
          cost: Number(invItem.cost || 0),
          replacementCost: Number(invItem.replacementCost !== undefined && invItem.replacementCost !== null ? invItem.replacementCost : (invItem.cost || 0)),
          unitPrice: Number(invItem.unitPrice || 0),
          quantity: 1,
          quantityOnHand: invItem.quantityOnHand ?? 0,
          competitorData: { status: 'idle' }
        }
      ];
    });
    toast.success(`Added "${invItem.name}" to Shopping List`);
    setQuickAddSku('');
    setShowQuickAddDropdown(false);
  };

  // Manual Quick Add entry
  const handleQuickAddSubmit = async () => {
    const q = quickAddSku.trim();
    if (!q) return;

    // Check if quick add matches top suggestion
    if (quickAddSuggestions.length > 0) {
      handleAddSingleItem(quickAddSuggestions[0]);
      return;
    }

    // Try live database lookup for exact SKU or name or description
    try {
      const res = await loadInventoryPage({
        organizationId: orgId,
        currentPage: 1,
        itemsPerPage: 1,
        searchQuery: q,
        categoryFilter: 'all'
      });

      if (res.items.length > 0) {
        const item = mapDbRowToInventoryItem(res.items[0]);
        handleAddSingleItem(item);
        return;
      }
    } catch (e) {
      console.warn('Quick add query error:', e);
    }

    // Create custom manual item if not found in database
    const newItem: ShoppingListItem = {
      id: 'sl_' + Math.random().toString(36).substring(2, 9),
      sku: q.toUpperCase().replace(/\s+/g, '-'),
      name: q,
      description: q,
      mfgPartNumber: '',
      manufacturer: '',
      category: 'Custom Search',
      unitOfMeasure: 'EA',
      cost: 0,
      replacementCost: 0,
      unitPrice: 0,
      quantity: 1,
      competitorData: { status: 'idle' }
    };
    setShoppingList(prev => [...prev, newItem]);
    toast.info(`Created custom item "${q}" on Shopping List`);
    setQuickAddSku('');
    setShowQuickAddDropdown(false);
  };

  // Load a preset template querying database for actual matches
  const handleLoadPreset = async (preset: typeof PRESET_LISTS[0]) => {
    toast.loading(`Loading ${preset.name}...`, { id: 'load-preset' });

    try {
      // Query database for matching items
      const matchedItems: any[] = [];
      for (const sku of preset.sampleSkus) {
        const res = await loadInventoryPage({
          organizationId: orgId,
          currentPage: 1,
          itemsPerPage: 1,
          searchQuery: sku,
          categoryFilter: 'all'
        });
        if (res.items.length > 0) {
          matchedItems.push(mapDbRowToInventoryItem(res.items[0]));
        }
      }

      // If no exact SKU matches, search by keywords
      if (matchedItems.length === 0 && preset.keywords) {
        for (const kw of preset.keywords.slice(0, 3)) {
          const res = await loadInventoryPage({
            organizationId: orgId,
            currentPage: 1,
            itemsPerPage: 2,
            searchQuery: kw,
            categoryFilter: 'all'
          });
          res.items.forEach(raw => {
            const mapped = mapDbRowToInventoryItem(raw);
            if (!matchedItems.some(m => m.sku === mapped.sku)) {
              matchedItems.push(mapped);
            }
          });
        }
      }

      const listToAdd: ShoppingListItem[] = [];

      if (matchedItems.length > 0) {
        matchedItems.forEach(m => {
          listToAdd.push({
            id: 'sl_' + Math.random().toString(36).substring(2, 9),
            inventoryId: m.id,
            sku: m.sku,
            name: m.name,
            description: m.description || m.name,
            mfgPartNumber: m.mfgPartNumber || '',
            manufacturer: m.manufacturer || '',
            category: m.category || 'Materials',
            unitOfMeasure: (m.unitOfMeasure || 'EA').toUpperCase(),
            cost: Number(m.cost || 0),
            replacementCost: Number(m.replacementCost !== undefined && m.replacementCost !== null ? m.replacementCost : (m.cost || 0)),
            unitPrice: Number(m.unitPrice || 0),
            quantity: m.category === 'Lumber & Framing' || m.category === 'BUILDING MATERIALS' ? 24 : 10,
            quantityOnHand: m.quantityOnHand ?? 0,
            competitorData: { status: 'idle' }
          });
        });
        setShoppingList(listToAdd);
        toast.success(`Loaded ${preset.name} (${listToAdd.length} catalog materials)`, { id: 'load-preset' });
      } else {
        toast.dismiss('load-preset');
        toast.info(`No existing materials matched "${preset.name}". Use "Add From Inventory" to browse your catalog.`, { id: 'load-preset' });
      }
    } catch (e) {
      toast.error('Failed to load preset', { id: 'load-preset' });
    }
  };

  // Remove item
  const handleRemoveItem = (id: string) => {
    setShoppingList(prev => prev.filter(p => p.id !== id));
  };

  // Purge any legacy test / mock items
  const handlePurgeTestItems = () => {
    const cleaned = shoppingList.filter(p => !p.id?.match(/^sl_\d+$/));
    if (cleaned.length !== shoppingList.length) {
      setShoppingList(cleaned);
      toast.success('Removed test data items from Shopping List');
    } else {
      toast.info('No test data items detected');
    }
  };

  // Update quantity
  const handleUpdateQuantity = (id: string, qty: number) => {
    if (qty <= 0) {
      handleRemoveItem(id);
      return;
    }
    setShoppingList(prev => prev.map(p => p.id === id ? { ...p, quantity: qty } : p));
  };

  // Clear list
  const handleClearList = () => {
    if (window.confirm('Are you sure you want to clear this Shopping List?')) {
      setShoppingList([]);
      toast.info('Shopping list cleared');
    }
  };

  // Competitor pricing search for single item
  const searchCompetitorForItem = async (item: ShoppingListItem, customQuery?: string): Promise<ShoppingListItem> => {
    const searchQuery = customQuery && customQuery.trim() ? customQuery.trim() : getItemSearchQuery(item);
    const kentDirectSearchUrl = `https://kent.ca/catalogsearch/result/?q=${encodeURIComponent(searchQuery)}`;
    const hdDirectSearchUrl = `https://www.homedepot.ca/en/home/search.html?q=${encodeURIComponent(searchQuery)}`;
    const googleKentSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`kent building supplies, bayers lake, price on ${searchQuery}`)}`;
    const googleHdSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`the home depot, bayers lake, price on ${searchQuery}`)}`;
    const bingKentSearchUrl = `https://www.bing.com/search?q=${encodeURIComponent(`kent building supplies price on ${searchQuery}`)}`;

    try {
      const lookupId = item.sku || item.id;
      let data = await competitivePricingAPI.getPricing(lookupId).catch(() => null);

      if (!data || !data.competitors || data.competitors.length === 0) {
        // Trigger live search with all 3 matching criteria (UPC, Supplier SKU / MFG #, Description)
        const { jobId } = await competitivePricingAPI.requestRefresh(lookupId, {
          upc: item.upc,
          mfgPartNumber: item.mfgPartNumber,
          description: item.description,
          name: item.name,
          searchQuery,
        });
        await competitivePricingAPI.pollJobUntilComplete(jobId);
        data = await competitivePricingAPI.getPricing(lookupId).catch(() => null);
      }

      if (data && data.competitors) {
        const kentComp = data.competitors.find((c) =>
          c.competitorName.toLowerCase().includes('kent')
        );
        const hdComp = data.competitors.find(
          (c) =>
            c.competitorName.toLowerCase().includes('depot') ||
            c.competitorName.toLowerCase().includes('home')
        );

        const getConfidencePct = (conf?: string) => {
          if (conf === 'EXACT') return 98;
          if (conf === 'HIGH') return 88;
          if (conf === 'MEDIUM') return 80;
          if (conf === 'LOW') return 55;
          return 0;
        };

        const kentRawConf = getConfidencePct(kentComp?.matchConfidence);
        const hdRawConf = getConfidencePct(hdComp?.matchConfidence);

        const prevKent = item.competitorData?.kent;
        const prevHd = item.competitorData?.homeDepot;

        const kentPriceFromApi = Number(kentComp?.normalizedUnitPrice || kentComp?.price || 0);
        const hdPriceFromApi = Number(hdComp?.normalizedUnitPrice || hdComp?.price || 0);

        const kentPrice = kentPriceFromApi > 0
          ? kentPriceFromApi
          : (prevKent?.price && (prevKent.matchConfidencePct ?? 0) >= 80 ? prevKent.price : 0);

        const hdPrice = hdPriceFromApi > 0
          ? hdPriceFromApi
          : (prevHd?.price && (prevHd.matchConfidencePct ?? 0) >= 80 ? prevHd.price : 0);

        const kentConf = kentPriceFromApi > 0
          ? (kentRawConf || 85)
          : (prevKent?.matchConfidencePct && prevKent.matchConfidencePct >= 80 ? prevKent.matchConfidencePct : kentRawConf);

        const hdConf = hdPriceFromApi > 0
          ? (hdRawConf || 85)
          : (prevHd?.matchConfidencePct && prevHd.matchConfidencePct >= 80 ? prevHd.matchConfidencePct : hdRawConf);

        const ourPrice = Number(item.unitPrice || data.yourPrice || 0);

        const kentDiff = kentPrice > 0 ? Number((kentPrice - ourPrice).toFixed(2)) : 0;
        const kentVar =
          ourPrice > 0 && kentPrice > 0 ? Number(((kentDiff / ourPrice) * 100).toFixed(1)) : 0;

        const hdDiff = hdPrice > 0 ? Number((hdPrice - ourPrice).toFixed(2)) : 0;
        const hdVar =
          ourPrice > 0 && hdPrice > 0 ? Number(((hdDiff / ourPrice) * 100).toFixed(1)) : 0;

        let bestDeal: 'prospaces' | 'kent' | 'home_depot' | 'tie' = 'prospaces';
        if (kentPrice > 0 && hdPrice > 0) {
          const minPrice = Math.min(ourPrice > 0 ? ourPrice : Infinity, kentPrice, hdPrice);
          if (ourPrice > 0 && ourPrice <= minPrice) bestDeal = 'prospaces';
          else if (kentPrice < hdPrice) bestDeal = 'kent';
          else if (hdPrice < kentPrice) bestDeal = 'home_depot';
          else bestDeal = 'tie';
        } else if (kentPrice > 0 && ourPrice > 0) {
          bestDeal = ourPrice <= kentPrice ? 'prospaces' : 'kent';
        } else if (hdPrice > 0 && ourPrice > 0) {
          bestDeal = ourPrice <= hdPrice ? 'prospaces' : 'home_depot';
        }

        return {
          ...item,
          competitorData: {
            lastChecked: new Date().toISOString(),
            activeSearchQuery: searchQuery,
            status: 'found',
            kent: {
              storeName: kentComp?.competitorName || 'KENT Building Supplies',
              price: kentPrice,
              sku: kentComp?.sku || item.mfgPartNumber || '',
              productTitle: kentComp?.productName || (kentPrice > 0 ? (item.description || item.name) : ''),
              inStock: kentPrice > 0 ? (kentComp?.availability === 'IN_STOCK' || kentPrice > 0) : false,
              stockStatus: kentPrice > 0 ? (kentComp?.availability === 'IN_STOCK' ? 'In Stock' : 'Available') : undefined,
              url: kentComp?.productUrl || kentDirectSearchUrl,
              googleSearchUrl: googleKentSearchUrl,
              bingSearchUrl: bingKentSearchUrl,
              storeLocation: 'Halifax - Bayers Lake',
              priceDifference: kentDiff,
              variancePct: kentVar,
              unit: kentComp?.unitOfMeasure || item.unitOfMeasure,
              notes:
                kentPrice > 0
                  ? `Verified market price at Kent: $${kentPrice.toFixed(2)} CAD (${kentConf}% conf)`
                  : `Unlisted at Kent Building Supplies`,
              matchConfidence: kentConf >= 95 ? 'exact' : (kentConf >= 80 ? 'high' : (kentPrice > 0 ? 'medium' : 'not_found')),
              matchConfidencePct: kentConf,
            },
            homeDepot: {
              storeName: hdComp?.competitorName || 'The Home Depot',
              price: hdPrice,
              sku: hdComp?.sku || item.mfgPartNumber || '',
              productTitle: hdComp?.productName || (hdPrice > 0 ? (item.description || item.name) : ''),
              inStock: hdPrice > 0 ? (hdComp?.availability === 'IN_STOCK' || hdPrice > 0) : false,
              url: hdComp?.productUrl || hdDirectSearchUrl,
              googleSearchUrl: googleHdSearchUrl,
              storeLocation: 'Halifax - Bayers Lake',
              priceDifference: hdDiff,
              variancePct: hdVar,
              unit: hdComp?.unitOfMeasure || item.unitOfMeasure,
              notes:
                hdPrice > 0
                  ? `Verified market price at Home Depot: $${hdPrice.toFixed(2)} CAD (${hdConf}% conf)`
                  : `Unlisted at The Home Depot`,
              matchConfidence: hdConf >= 95 ? 'exact' : (hdConf >= 80 ? 'high' : (hdPrice > 0 ? 'medium' : 'not_found')),
              matchConfidencePct: hdConf,
            },
            marketRecommendation:
              kentPrice > 0 || hdPrice > 0
                ? `Competitive pricing retrieved via ProSpaces pricing engine for ${item.description || item.name}.`
                : `Pricing check completed for "${searchQuery}".`,
            bestDeal,
            groundingSources: [
              { title: `Kent.ca Search for "${searchQuery}"`, url: kentDirectSearchUrl },
              { title: `HomeDepot.ca Search for "${searchQuery}"`, url: hdDirectSearchUrl },
              { title: `Google Search: "kent building supplies, price on ${searchQuery}"`, url: googleKentSearchUrl },
              { title: `Google Search: "the home depot, price on ${searchQuery}"`, url: googleHdSearchUrl },
            ],
          },
        };
      } else {
        throw new Error('No pricing records found');
      }
    } catch (err: any) {
      console.warn(`Competitor search failed for ${item.sku}:`, err);

      return {
        ...item,
        competitorData: {
          lastChecked: new Date().toISOString(),
          activeSearchQuery: searchQuery,
          status: 'error',
          kent: {
            storeName: 'Kent Building Supplies (Bayers Lake)',
            price: 0,
            sku: item.mfgPartNumber || '',
            productTitle: '',
            inStock: false,
            url: kentDirectSearchUrl,
            googleSearchUrl: googleKentSearchUrl,
            bingSearchUrl: bingKentSearchUrl,
            storeLocation: 'Halifax - Bayers Lake',
            priceDifference: 0,
            variancePct: 0,
            unit: item.unitOfMeasure,
            notes: `Unlisted. Live query failed. Click to search directly on Google for "kent building supplies, bayers lake, price on ${searchQuery}".`,
            matchConfidence: 'not_found',
            matchConfidencePct: 0
          },
          homeDepot: {
            storeName: 'The Home Depot (Bayers Lake)',
            price: 0,
            sku: item.mfgPartNumber || '',
            productTitle: '',
            inStock: false,
            url: hdDirectSearchUrl,
            googleSearchUrl: googleHdSearchUrl,
            storeLocation: 'Halifax - Bayers Lake',
            priceDifference: 0,
            variancePct: 0,
            unit: item.unitOfMeasure,
            notes: `Unlisted. Live query failed. Click to search directly on Google for "the home depot, bayers lake, price on ${searchQuery}".`,
            matchConfidence: 'not_found',
            matchConfidencePct: 0
          },
          bestDeal: 'prospaces',
          marketRecommendation: `Live price query could not complete. You can click the Google / retailer links to verify in-store prices for "${searchQuery}".`,
          groundingSources: [
            { title: `Google Search: "kent building supplies, bayers lake, price on ${searchQuery}"`, url: googleKentSearchUrl },
            { title: `Google Search: "the home depot, halifax lacewood, price on ${searchQuery}"`, url: googleHdSearchUrl },
            { title: `Kent.ca Search for "${searchQuery}"`, url: kentDirectSearchUrl },
            { title: `HomeDepot.ca Search for "${searchQuery}"`, url: hdDirectSearchUrl }
          ]
        }
      };
    }
  };

  // Run search on single row (optionally with custom web search criteria)
  const handleSearchSingleItem = async (itemId: string, customQuery?: string) => {
    const target = shoppingList.find(s => s.id === itemId);
    if (!target) return;

    setShoppingList(prev => prev.map(p => p.id === itemId ? {
      ...p,
      competitorData: { ...p.competitorData, status: 'searching' }
    } : p));

    const displayQ = customQuery || getItemSearchQuery(target);
    toast.loading(`Searching web for "${displayQ}"...`, { id: `search-${itemId}` });
    const updated = await searchCompetitorForItem(target, customQuery);
    
    setShoppingList(prev => prev.map(p => p.id === itemId ? updated : p));
    if (selectedDetailItem?.id === itemId) {
      setSelectedDetailItem(updated);
    }
    toast.success(`Competitor pricing updated for ${target.sku}`, { id: `search-${itemId}` });
    return updated;
  };

  // Automatically fetch competitor pricing in background for items with no price populated yet
  const autoEnrichingSetRef = useRef<Set<string>>(new Set());
  const queueRef = useRef<ShoppingListItem[]>([]);
  const isProcessingQueueRef = useRef<boolean>(false);

  useEffect(() => {
    const unpricedItems = shoppingList.filter(item => {
      if (autoEnrichingSetRef.current.has(item.id)) return false;
      const status = item.competitorData?.status;
      const hasPrices = (item.competitorData?.kent?.price || 0) > 0 || (item.competitorData?.homeDepot?.price || 0) > 0;
      return !status || status === 'idle' || (!hasPrices && status !== 'searching');
    });

    if (unpricedItems.length === 0) return;

    unpricedItems.forEach(item => {
      autoEnrichingSetRef.current.add(item.id);
      if (!queueRef.current.some(q => q.id === item.id)) {
        queueRef.current.push(item);
      }
    });

    if (isProcessingQueueRef.current) return;
    isProcessingQueueRef.current = true;

    async function processQueue() {
      while (queueRef.current.length > 0) {
        const item = queueRef.current.shift();
        if (!item) continue;
        try {
          const enriched = await searchCompetitorForItem(item);
          setShoppingList(prev => prev.map(p => p.id === item.id ? enriched : p));
        } catch (e) {
          console.warn('Auto competitor pricing failed for', item.sku, e);
        }
      }
      isProcessingQueueRef.current = false;
    }

    processQueue();
  }, [shoppingList]);

  // Update our ProSpaces retail price for an item
  const handleUpdateOurRetailPrice = (itemId: string, newRetailPriceRaw: number | string) => {
    const numPrice = typeof newRetailPriceRaw === 'number' ? newRetailPriceRaw : parseFloat(String(newRetailPriceRaw).replace(/[^0-9.]/g, ''));
    if (isNaN(numPrice) || numPrice < 0) {
      toast.error('Please enter a valid retail price amount');
      return;
    }

    setShoppingList(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const ourPrice = numPrice;
      const currentComp = item.competitorData;
      const kentPrice = Number(currentComp?.kent?.price || 0);
      const hdPrice = Number(currentComp?.homeDepot?.price || 0);

      const kentDiff = kentPrice > 0 ? Number((kentPrice - ourPrice).toFixed(2)) : 0;
      const kentVar = ourPrice > 0 && kentPrice > 0 ? Number(((kentDiff / ourPrice) * 100).toFixed(1)) : 0;

      const hdDiff = hdPrice > 0 ? Number((hdPrice - ourPrice).toFixed(2)) : 0;
      const hdVar = ourPrice > 0 && hdPrice > 0 ? Number(((hdDiff / ourPrice) * 100).toFixed(1)) : 0;

      let bestDeal: 'prospaces' | 'kent' | 'home_depot' | 'tie' = 'prospaces';
      if (kentPrice > 0 && hdPrice > 0) {
        const minPrice = Math.min(ourPrice > 0 ? ourPrice : Infinity, kentPrice, hdPrice);
        if (ourPrice > 0 && ourPrice <= minPrice) bestDeal = 'prospaces';
        else if (kentPrice < hdPrice) bestDeal = 'kent';
        else if (hdPrice < kentPrice) bestDeal = 'home_depot';
        else bestDeal = 'tie';
      } else if (kentPrice > 0 && ourPrice > 0) {
        bestDeal = ourPrice <= kentPrice ? 'prospaces' : 'kent';
      } else if (hdPrice > 0 && ourPrice > 0) {
        bestDeal = ourPrice <= hdPrice ? 'prospaces' : 'home_depot';
      }

      const updated: ShoppingListItem = {
        ...item,
        unitPrice: ourPrice,
        competitorData: currentComp ? {
          ...currentComp,
          bestDeal,
          kent: currentComp.kent ? { ...currentComp.kent, priceDifference: kentDiff, variancePct: kentVar } : undefined,
          homeDepot: currentComp.homeDepot ? { ...currentComp.homeDepot, priceDifference: hdDiff, variancePct: hdVar } : undefined,
          marketRecommendation: `Market comparison updated: ProSpaces $${ourPrice.toFixed(2)} vs Kent $${kentPrice > 0 ? kentPrice.toFixed(2) : 'Unlisted'} & HD $${hdPrice > 0 ? hdPrice.toFixed(2) : 'Unlisted'}.`
        } : undefined
      };

      if (selectedDetailItem?.id === itemId) {
        setSelectedDetailItem(updated);
      }

      return updated;
    }));

    toast.success(`Updated ProSpaces Retail Price to $${numPrice.toFixed(2)} CAD`);
  };

  // Manual price override / entry for competitor data
  const handleManualPriceUpdate = (
    itemId: string,
    competitor: 'kent' | 'homeDepot',
    newPriceRaw: number | string,
    customTitle?: string,
    customNotes?: string
  ) => {
    const numPrice = typeof newPriceRaw === 'number' ? newPriceRaw : parseFloat(String(newPriceRaw).replace(/[^0-9.]/g, ''));
    if (isNaN(numPrice) || numPrice < 0) {
      toast.error('Please enter a valid price amount');
      return;
    }

    setShoppingList(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const currentComp = item.competitorData || {
        lastChecked: new Date().toISOString(),
        activeSearchQuery: getItemSearchQuery(item),
        status: 'found'
      };
      const ourPrice = Number(item.unitPrice || 0);
      const kentPrice = competitor === 'kent' ? numPrice : Number(currentComp.kent?.price || 0);
      const hdPrice = competitor === 'homeDepot' ? numPrice : Number(currentComp.homeDepot?.price || 0);

      const kentDiff = kentPrice > 0 ? Number((kentPrice - ourPrice).toFixed(2)) : 0;
      const kentVar = ourPrice > 0 && kentPrice > 0 ? Number(((kentDiff / ourPrice) * 100).toFixed(1)) : 0;

      const hdDiff = hdPrice > 0 ? Number((hdPrice - ourPrice).toFixed(2)) : 0;
      const hdVar = ourPrice > 0 && hdPrice > 0 ? Number(((hdDiff / ourPrice) * 100).toFixed(1)) : 0;

      let bestDeal: 'prospaces' | 'kent' | 'home_depot' | 'tie' = 'prospaces';
      if (kentPrice > 0 && hdPrice > 0) {
        const minPrice = Math.min(ourPrice > 0 ? ourPrice : Infinity, kentPrice, hdPrice);
        if (ourPrice > 0 && ourPrice <= minPrice) bestDeal = 'prospaces';
        else if (kentPrice < hdPrice) bestDeal = 'kent';
        else if (hdPrice < kentPrice) bestDeal = 'home_depot';
        else bestDeal = 'tie';
      } else if (kentPrice > 0 && ourPrice > 0) {
        bestDeal = ourPrice <= kentPrice ? 'prospaces' : 'kent';
      } else if (hdPrice > 0 && ourPrice > 0) {
        bestDeal = ourPrice <= hdPrice ? 'prospaces' : 'home_depot';
      }

      const q = getItemSearchQuery(item);
      const kentSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`kent building supplies, bayers lake, price on ${q}`)}`;
      const hdSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`the home depot, halifax lacewood, price on ${q}`)}`;

      const updatedItem: ShoppingListItem = {
        ...item,
        competitorData: {
          ...currentComp,
          lastChecked: new Date().toISOString(),
          status: 'found',
          bestDeal,
          kent: {
            storeName: currentComp.kent?.storeName || 'Kent Building Supplies (Bayers Lake)',
            price: kentPrice,
            sku: currentComp.kent?.sku || item.mfgPartNumber || '',
            productTitle: competitor === 'kent' && customTitle ? customTitle : (currentComp.kent?.productTitle || item.description || item.name),
            inStock: kentPrice > 0,
            url: currentComp.kent?.url || `https://kent.ca/catalogsearch/result/?q=${encodeURIComponent(q)}`,
            googleSearchUrl: kentSearchUrl,
            bingSearchUrl: `https://www.bing.com/search?q=${encodeURIComponent(`kent building supplies price on ${q}`)}`,
            storeLocation: currentComp.kent?.storeLocation || 'Halifax - Bayers Lake',
            priceDifference: kentDiff,
            variancePct: kentVar,
            unit: currentComp.kent?.unit || item.unitOfMeasure,
            notes: competitor === 'kent' ? (customNotes || (kentPrice > 0 ? 'Verified in store / Google search result' : 'Unlisted (<80% conf)')) : currentComp.kent?.notes,
            matchConfidence: kentPrice > 0 ? 'exact' : 'not_found',
            matchConfidencePct: kentPrice > 0 ? 100 : 0
          },
          homeDepot: {
            storeName: currentComp.homeDepot?.storeName || 'The Home Depot (Halifax Lacewood)',
            price: hdPrice,
            sku: currentComp.homeDepot?.sku || item.mfgPartNumber || '',
            productTitle: competitor === 'homeDepot' && customTitle ? customTitle : (currentComp.homeDepot?.productTitle || item.description || item.name),
            inStock: hdPrice > 0,
            url: currentComp.homeDepot?.url || `https://www.homedepot.ca/en/home/search.html?q=${encodeURIComponent(q)}`,
            googleSearchUrl: hdSearchUrl,
            storeLocation: currentComp.homeDepot?.storeLocation || 'Halifax Lacewood',
            priceDifference: hdDiff,
            variancePct: hdVar,
            unit: currentComp.homeDepot?.unit || item.unitOfMeasure,
            notes: competitor === 'homeDepot' ? (customNotes || (hdPrice > 0 ? 'Verified in store / Google search result' : 'Unlisted (<80% conf)')) : currentComp.homeDepot?.notes,
            matchConfidence: hdPrice > 0 ? 'exact' : 'not_found',
            matchConfidencePct: hdPrice > 0 ? 100 : 0
          },
          marketRecommendation: `Market comparison updated: ProSpaces $${ourPrice.toFixed(2)} vs Kent $${kentPrice > 0 ? `$${kentPrice.toFixed(2)}` : 'Unlisted'} & HD $${hdPrice > 0 ? `$${hdPrice.toFixed(2)}` : 'Unlisted'}.`
        }
      };

      if (selectedDetailItem?.id === itemId) {
        setSelectedDetailItem(updatedItem);
      }

      return updatedItem;
    }));

    setEditingCell(null);
    setTempEditPrice('');
    toast.success(`${competitor === 'kent' ? 'Kent Building Supplies' : 'The Home Depot'} retail price updated to $${numPrice.toFixed(2)} CAD`);
  };

  // Batch search all items
  const handleSearchAllCompetitors = async () => {
    if (shoppingList.length === 0) {
      toast.error('Add items to the shopping list first');
      return;
    }

    setIsSearchingAll(true);
    setSearchProgress({ current: 0, total: shoppingList.length });
    toast.loading(`Searching Kent Building Supplies & The Home Depot in Halifax, NS for ${shoppingList.length} items...`, { id: 'search-batch' });

    const updatedList = [...shoppingList];
    for (let i = 0; i < updatedList.length; i++) {
      const item = updatedList[i];
      setShoppingList(prev => prev.map((p, idx) => idx === i ? {
        ...p,
        competitorData: { ...p.competitorData, status: 'searching' }
      } : p));

      setSearchProgress({ current: i + 1, total: updatedList.length });
      const enriched = await searchCompetitorForItem(item);
      updatedList[i] = enriched;
      setShoppingList([...updatedList]);
    }

    setIsSearchingAll(false);
    toast.success(`Competitive price intelligence complete for all ${shoppingList.length} items!`, { id: 'search-batch' });
  };

  // Summary Metrics calculations
  const totals = useMemo(() => {
    let totalItems = shoppingList.length;
    let totalUnits = 0;
    let ourCostTotal = 0;
    let ourRetailTotal = 0;
    let kentTotal = 0;
    let homeDepotTotal = 0;
    let comparedItemsCount = 0;
    let prospacesCheaperCount = 0;
    let kentCheaperCount = 0;
    let hdCheaperCount = 0;

    shoppingList.forEach(item => {
      const qty = item.quantity || 1;
      totalUnits += qty;
      const { activeCost } = getItemCostDetails(item);
      ourCostTotal += activeCost * qty;
      ourRetailTotal += (item.unitPrice || 0) * qty;

      const comp = item.competitorData;
      if (comp && comp.status === 'found') {
        comparedItemsCount++;
        const kPrice = comp.kent?.price || 0;
        const hdPrice = comp.homeDepot?.price || 0;
        if (kPrice > 0) kentTotal += kPrice * qty;
        if (hdPrice > 0) homeDepotTotal += hdPrice * qty;

        if (comp.bestDeal === 'prospaces') prospacesCheaperCount++;
        else if (comp.bestDeal === 'kent') kentCheaperCount++;
        else if (comp.bestDeal === 'home_depot') hdCheaperCount++;
      }
    });

    const ourMargin = ourRetailTotal > 0 ? ((ourRetailTotal - ourCostTotal) / ourRetailTotal) * 100 : 0;
    const kentDelta = ourRetailTotal > 0 && kentTotal > 0 ? ((kentTotal - ourRetailTotal) / ourRetailTotal) * 100 : 0;
    const hdDelta = ourRetailTotal > 0 && homeDepotTotal > 0 ? ((homeDepotTotal - ourRetailTotal) / ourRetailTotal) * 100 : 0;

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
      comparedItemsCount,
      prospacesCheaperCount,
      kentCheaperCount,
      hdCheaperCount
    };
  }, [shoppingList, costViewMode, getItemCostDetails]);

  // Export to CSV
  const handleExportCSV = () => {
    if (shoppingList.length === 0) return;
    const headers = [
      'SKU',
      'Name',
      'Description',
      'Category',
      'UOM',
      'Quantity',
      'Our Avg Cost ($CAD)',
      'Our Replacement Cost ($CAD)',
      'Our Retail Price ($CAD)',
      'Our Line Total ($CAD)',
      'Kent Price ($CAD)',
      'Kent Diff vs Retail ($CAD)',
      'Home Depot Price ($CAD)',
      'Home Depot Diff vs Retail ($CAD)',
      'Market Best Deal',
      'Last Checked'
    ];

    const rows = shoppingList.map(item => {
      const { avgCost, repCost } = getItemCostDetails(item);
      return [
        `"${item.sku.replace(/"/g, '""')}"`,
        `"${item.name.replace(/"/g, '""')}"`,
        `"${item.description.replace(/"/g, '""')}"`,
        `"${item.category.replace(/"/g, '""')}"`,
        `"${item.unitOfMeasure}"`,
        item.quantity,
        avgCost.toFixed(2),
        repCost.toFixed(2),
        item.unitPrice.toFixed(2),
        (item.unitPrice * item.quantity).toFixed(2),
        item.competitorData?.kent?.price?.toFixed(2) || '',
        item.competitorData?.kent?.priceDifference?.toFixed(2) || '',
        item.competitorData?.homeDepot?.price?.toFixed(2) || '',
        item.competitorData?.homeDepot?.priceDifference?.toFixed(2) || '',
        `"${item.competitorData?.bestDeal || 'N/A'}"`,
        `"${item.competitorData?.lastChecked || ''}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ProSpaces_Shopping_List_Competitors_Halifax_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Shopping list exported to CSV');
  };

  // Print List
  const handlePrint = () => {
    window.print();
  };

  // Saved Lists Handlers
  const fetchSavedLists = async () => {
    setIsLoadingLists(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error("Not authenticated");
      }
      
      const { data: orgData } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', userData.user.id)
        .single();
        
      const orgId = orgData?.organization_id;

      if (!orgId) {
        throw new Error("Organization ID not found");
      }

      const { data, error } = await supabase
        .from('saved_shopping_lists')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedLists(data || []);
    } catch (err: any) {
      console.error("Error fetching saved lists:", err);
      toast.error(err.message || "Failed to load saved lists");
    } finally {
      setIsLoadingLists(false);
    }
  };

  const handleOpenLoadListModal = () => {
    setIsLoadListModalOpen(true);
    fetchSavedLists();
  };

  const handleSaveListSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveListName.trim() || shoppingList.length === 0) return;

    setIsSavingList(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error("Not authenticated");
      }

      const { data: orgData } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', userData.user.id)
        .single();
        
      const orgId = orgData?.organization_id;

      if (!orgId) {
        throw new Error("Organization ID not found");
      }

      const newSavedList = {
        name: saveListName,
        description: saveListDescription,
        organization_id: orgId,
        created_by: userData.user.id,
        items: shoppingList,
        totals: totals, // Save current totals snapshot
      };

      const { data: savedList, error } = await supabase
        .from('saved_shopping_lists')
        .insert(newSavedList)
        .select('id')
        .single();

      if (error) throw error;

      toast.success("Shopping list saved successfully");
      setCurrentSavedListId(savedList.id);
      setIsSaveListModalOpen(false);
      setSaveListName('');
      setSaveListDescription('');
    } catch (err: any) {
      console.error("Error saving list:", err);
      toast.error(err.message || "Failed to save shopping list");
    } finally {
      setIsSavingList(false);
    }
  };

  const handleLoadSavedList = (list: any) => {
    if (!list.items || !Array.isArray(list.items)) return;
    setShoppingList(list.items);
    setCurrentSavedListId(list.id);
    setIsLoadListModalOpen(false);
    toast.success(`Loaded list: ${list.name}`);
  };

  const handleDeleteSavedList = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this saved list?")) return;
    
    try {
      const { error } = await supabase
        .from('saved_shopping_lists')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Saved list deleted");
      setSavedLists(prev => prev.filter(l => l.id !== id));
    } catch (err: any) {
      console.error("Error deleting list:", err);
      toast.error(err.message || "Failed to delete saved list");
    }
  };

  // Filter shopping list items in table
  const filteredShoppingList = useMemo(() => {
    if (!searchQuery.trim()) return shoppingList;
    const q = searchQuery.toLowerCase().trim();
    return shoppingList.filter(item => {
      return (
        (item.name || '').toLowerCase().includes(q) ||
        (item.sku || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q)
      );
    });
  }, [shoppingList, searchQuery]);

  const selectedCount = Object.keys(selectedItemsMap).length;
  const totalPickerPages = Math.ceil(dbPickerTotalCount / pickerItemsPerPage) || 1;

  return (
    <div className="space-y-6">
      {/* Submodule Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card border rounded-xl p-5 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Inventory Shopping List
            </h2>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400">
              <MapPin className="h-3 w-3 mr-1 text-emerald-600" />
              Halifax / Dartmouth / HRM, NS Market
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Competitor Benchmark: Kent & Home Depot
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Build material lists directly from ProSpaces CRM inventory with SKU, Description, UOM, Avg Cost, and Retail price, then benchmark live against Kent Building Supplies & The Home Depot in the Halifax, NS region.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPickerOpen(true)}
            className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
          >
            <ListPlus className="h-4 w-4 mr-1.5 text-emerald-600" />
            Add From Inventory
          </Button>

          <Button
            size="sm"
            onClick={handleSearchAllCompetitors}
            disabled={isSearchingAll || shoppingList.length === 0}
            className="bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm"
          >
            {isSearchingAll ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                Searching ({searchProgress.current}/{searchProgress.total})...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-1.5 text-amber-300" />
                Search Competitor Prices
              </>
            )}
          </Button>

          <div className="flex items-center bg-muted/80 p-1 rounded-lg border shadow-xs ml-2">
            <button
              type="button"
              id="switch-avg-cost"
              onClick={() => handleToggleCostViewMode('avg_cost')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                costViewMode === 'avg_cost' 
                  ? 'bg-background shadow-xs text-foreground font-bold' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Show Average Cost from Supabase inventory table"
            >
              Avg Cost
            </button>
            <button
              type="button"
              id="switch-replacement-cost"
              onClick={() => handleToggleCostViewMode('replacement_cost')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                costViewMode === 'replacement_cost' 
                  ? 'bg-indigo-600 text-white shadow-xs font-bold' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Show Replacement Cost from Supabase inventory table"
            >
              Rep. Cost
            </button>
            {isSyncingCosts && (
              <RefreshCw className="h-3.5 w-3.5 ml-1 mr-1 text-indigo-500 animate-spin" title="Syncing replacement costs from Supabase..." />
            )}
          </div>

          <div className="flex items-center gap-1 border-l pl-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSaveListModalOpen(true)}
              disabled={shoppingList.length === 0}
              title="Save List"
            >
              <Save className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleOpenLoadListModal}
              title="Load Saved List"
            >
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleExportCSV}
              disabled={shoppingList.length === 0}
              title="Export to CSV"
            >
              <Download className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrint}
              disabled={shoppingList.length === 0}
              title="Print Shopping List"
            >
              <Printer className="h-4 w-4 text-muted-foreground" />
            </Button>
            {shoppingList.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePurgeTestItems}
                  title="Purge mock or sample items from list"
                  className="text-xs h-8 text-muted-foreground hover:text-foreground"
                >
                  Clean Test Data
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClearList}
                  title="Clear Shopping List"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* KPI Comparison Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Our Total Basket */}
        <div className="bg-card border rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">ProSpaces Retail</span>
            <Building2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              ${totals.ourRetailTotal.toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground">CAD</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t text-muted-foreground">
            <span>{costViewMode === "replacement_cost" ? "Rep. Cost" : "Avg Cost"}: <strong className="text-foreground">${totals.ourCostTotal.toFixed(2)}</strong></span>
            <span className="text-emerald-600 font-semibold">{totals.ourMargin.toFixed(1)}% margin</span>
          </div>
        </div>

        {/* Card 2: Kent Building Supplies */}
        <div className="bg-card border rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider">Kent Building Supplies</span>
              <Badge variant="outline" className="text-[10px] px-1 py-0 bg-orange-50 text-orange-700 border-orange-200">
                Halifax / Dartmouth
              </Badge>
            </div>
            <Store className="h-4 w-4 text-orange-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {totals.kentTotal > 0 ? `$${totals.kentTotal.toFixed(2)}` : '—'}
            </span>
            {totals.kentTotal > 0 && (
              <Badge
                variant="outline"
                className={`text-xs ${
                  totals.kentDelta >= 0
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-red-50 text-red-700 border-red-300'
                }`}
              >
                {totals.kentDelta >= 0 ? '+' : ''}{totals.kentDelta.toFixed(1)}% vs Our Retail
              </Badge>
            )}
          </div>
          <div className="mt-2 text-xs pt-2 border-t text-muted-foreground flex justify-between">
            <span>Locations: Bayers Lake & Dartmouth</span>
            {totals.kentTotal > 0 && (
              <span className={totals.kentTotal >= totals.ourRetailTotal ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
                {totals.kentTotal >= totals.ourRetailTotal ? "We're lower" : "Kent is lower"}
              </span>
            )}
          </div>
        </div>

        {/* Card 3: The Home Depot */}
        <div className="bg-card border rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider">The Home Depot</span>
              <Badge variant="outline" className="text-[10px] px-1 py-0 bg-amber-50 text-amber-800 border-amber-300">
                Halifax / Dartmouth
              </Badge>
            </div>
            <Store className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {totals.homeDepotTotal > 0 ? `$${totals.homeDepotTotal.toFixed(2)}` : '—'}
            </span>
            {totals.homeDepotTotal > 0 && (
              <Badge
                variant="outline"
                className={`text-xs ${
                  totals.hdDelta >= 0
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-red-50 text-red-700 border-red-300'
                }`}
              >
                {totals.hdDelta >= 0 ? '+' : ''}{totals.hdDelta.toFixed(1)}% vs Our Retail
              </Badge>
            )}
          </div>
          <div className="mt-2 text-xs pt-2 border-t text-muted-foreground flex justify-between">
            <span>Locations: Lacewood & Dartmouth Crossing</span>
            {totals.homeDepotTotal > 0 && (
              <span className={totals.homeDepotTotal >= totals.ourRetailTotal ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
                {totals.homeDepotTotal >= totals.ourRetailTotal ? "We're lower" : "HD is lower"}
              </span>
            )}
          </div>
        </div>

        {/* Card 4: Market Intelligence */}
        <div className="bg-card border rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Market Intelligence</span>
            <BarChart2 className="h-4 w-4 text-violet-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {totals.comparedItemsCount}/{totals.totalItems}
            </span>
            <span className="text-xs text-muted-foreground">items compared</span>
          </div>
          <div className="mt-2 text-xs pt-2 border-t text-muted-foreground flex items-center justify-between">
            <span>Lowest Deal Winner:</span>
            <strong className="text-foreground">
              {totals.prospacesCheaperCount >= Math.max(totals.kentCheaperCount, totals.hdCheaperCount)
                ? '⭐ ProSpaces Best'
                : totals.kentCheaperCount > totals.hdCheaperCount
                ? 'Kent Best'
                : 'Home Depot Best'}
            </strong>
          </div>
        </div>
      </div>

      {/* Quick Add Bar & Starter Presets */}
      <div className="bg-muted/40 border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Quick Add with full live search dropdown */}
        <div className="relative flex-1 max-w-lg">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Quick add from 19k+ catalog (e.g. 2x4, drywall, screws)..."
                value={quickAddSku}
                onChange={e => {
                  setQuickAddSku(e.target.value);
                  setShowQuickAddDropdown(true);
                }}
                onFocus={() => {
                  if (quickAddSuggestions.length > 0) setShowQuickAddDropdown(true);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleQuickAddSubmit();
                  }
                }}
                className="pl-9 pr-8 text-sm bg-background"
              />
              {isSearchingQuickAdd && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <Button size="sm" variant="secondary" onClick={handleQuickAddSubmit}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>

          {/* Autocomplete suggestions dropdown */}
          {showQuickAddDropdown && quickAddSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-popover border rounded-lg shadow-lg overflow-hidden divide-y text-left">
              <div className="p-1.5 text-[11px] font-semibold text-muted-foreground bg-muted/50 px-3 flex justify-between">
                <span>Matching ProSpaces Inventory</span>
                <span>Click to Add</span>
              </div>
              {quickAddSuggestions.map(item => (
                <div
                  key={item.id}
                  onClick={() => handleAddSingleItem(item)}
                  className="p-2.5 hover:bg-muted/60 cursor-pointer flex items-center justify-between text-xs transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-foreground">{item.sku}</span>
                      <span className="font-medium text-foreground truncate">{item.name}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {item.category} • {item.description}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-foreground">${item.unitPrice.toFixed(2)}</div>
                    <div className="text-[10px] text-muted-foreground">UOM: {item.unitOfMeasure}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" /> Sample Lists:
          </span>
          {PRESET_LISTS.map((preset, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              onClick={() => handleLoadPreset(preset)}
              className="text-xs h-7 px-2.5 bg-background hover:bg-muted"
            >
              {preset.name.split(' ')[0]} {preset.name.split(' ')[1]}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Shopping List Table */}
      {shoppingList.length === 0 ? (
        <div className="border border-dashed rounded-2xl p-12 text-center bg-card">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
            <ShoppingCart className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">Your Shopping List is Empty</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            Add materials from your full ProSpaces CRM inventory or pick a sample list below to compare live competitive pricing at Kent Building Supplies and The Home Depot in Halifax, Nova Scotia.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button onClick={() => setIsPickerOpen(true)} className="bg-emerald-700 hover:bg-emerald-800 text-white">
              <ListPlus className="h-4 w-4 mr-2" />
              Add Items from Inventory
            </Button>
            <Button variant="outline" onClick={() => handleLoadPreset(PRESET_LISTS[0])}>
              Load Halifax Framing & Lumber Sample
            </Button>
          </div>
        </div>
      ) : filteredShoppingList.length === 0 ? (
        <div className="border border-dashed rounded-2xl p-12 text-center bg-card">
          <div className="w-16 h-16 bg-muted flex items-center justify-center mx-auto mb-4 text-muted-foreground rounded-full">
            <Search className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">No matches found</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Your search query "{searchQuery}" did not match any items on your Shopping List.
          </p>
        </div>
      ) : (
        <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-muted/60 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4 min-w-[200px]">Description & Material</th>
                  <th className="py-3 px-3 text-center">UOM</th>
                  <th className="py-3 px-3 text-right">{costViewMode === "replacement_cost" ? "Rep. Cost" : "Avg Cost"}</th>
                  <th className="py-3 px-3 text-right">Retail</th>
                  <th className="py-3 px-3 text-center w-24">Qty</th>
                  <th className="py-3 px-3 text-right">Line Total</th>
                  <th className="py-3 px-4 bg-orange-50/50 dark:bg-orange-950/20 border-l border-orange-200/60 min-w-[170px]">
                    <div className="flex items-center justify-between gap-1 text-orange-900 dark:text-orange-300">
                      <span>Kent Building Supply</span>
                      <Store className="h-3.5 w-3.5 text-orange-600" />
                    </div>
                  </th>
                  <th className="py-3 px-4 bg-amber-50/50 dark:bg-amber-950/20 border-l border-amber-200/60 min-w-[170px]">
                    <div className="flex items-center justify-between gap-1 text-amber-950 dark:text-amber-300">
                      <span>The Home Depot</span>
                      <Store className="h-3.5 w-3.5 text-amber-600" />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center min-w-[130px]">Market Deal</th>
                  <th className="py-3 px-3 text-center w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredShoppingList.map((item) => {
                  const comp = item.competitorData;
                  const isSearching = comp?.status === 'searching';
                  const hasCompetitor = comp?.status === 'found';
                  const kent = comp?.kent;
                  const hd = comp?.homeDepot;
                  const lineRetail = (item.unitPrice || 0) * (item.quantity || 1);

                  const kentConfidence = Number(kent?.matchConfidencePct ?? 0);
                  const isKentListed = hasCompetitor && kent && kent.price > 0 && kentConfidence >= 80;

                  const hdConfidence = Number(hd?.matchConfidencePct ?? 0);
                  const isHdListed = hasCompetitor && hd && hd.price > 0 && hdConfidence >= 80;

                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      {/* SKU */}
                      <td className="py-3 px-4 font-mono font-semibold text-xs text-foreground">
                        {item.sku}
                      </td>

                      {/* Description & Category */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground">
                          {item.description || item.name}
                        </div>
                        {item.description && item.name && item.description !== item.name && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.name}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded font-medium">
                            {item.category || 'General'}
                          </span>
                          {item.mfgPartNumber && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 rounded font-mono font-medium border border-blue-200/60" title="Supplier SKU / MFG Part Number">
                              MFG #: {item.mfgPartNumber}
                            </span>
                          )}
                          {item.upc && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded font-mono font-medium border border-emerald-200/60" title="UPC Barcode">
                              UPC: {item.upc}
                            </span>
                          )}
                          {item.manufacturer && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded font-medium">
                              {item.manufacturer}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* UOM */}
                      <td className="py-3 px-3 text-center font-mono text-xs uppercase font-medium text-muted-foreground">
                        {item.unitOfMeasure || 'EA'}
                      </td>

                      {/* Avg Cost / Rep Cost */}
                      {(() => {
                        const itemCostInfo = getItemCostDetails(item);
                        return (
                          <td className="py-3 px-3 text-right font-medium">
                            <div className="flex flex-col items-end">
                              <span className={costViewMode === "replacement_cost" ? "text-indigo-700 dark:text-indigo-300 font-bold" : "text-foreground font-semibold"}>
                                ${itemCostInfo.activeCost.toFixed(2)}
                              </span>
                              {costViewMode === "replacement_cost" && itemCostInfo.avgCost > 0 && Math.abs(itemCostInfo.repCost - itemCostInfo.avgCost) > 0.001 && (
                                <span className="text-[10px] text-muted-foreground font-normal">
                                  Avg: ${itemCostInfo.avgCost.toFixed(2)}
                                </span>
                              )}
                              {costViewMode === "avg_cost" && itemCostInfo.repCost > 0 && Math.abs(itemCostInfo.repCost - itemCostInfo.avgCost) > 0.001 && (
                                <span className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 font-normal">
                                  Rep: ${itemCostInfo.repCost.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })()}

                      {/* Retail Price (Editable) */}
                      <td className="py-3 px-3 text-right">
                        {editingCell?.itemId === item.id && editingCell?.competitor === 'ourRetail' ? (
                          <div className="inline-flex items-center gap-1 justify-end">
                            <span className="text-xs font-bold text-foreground">$</span>
                            <input
                              type="number"
                              step="0.01"
                              autoFocus
                              value={tempEditPrice}
                              onChange={e => setTempEditPrice(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  handleUpdateOurRetailPrice(item.id, tempEditPrice);
                                  setEditingCell(null);
                                } else if (e.key === 'Escape') {
                                  setEditingCell(null);
                                }
                              }}
                              className="w-16 px-1.5 py-0.5 text-xs font-semibold border rounded text-right bg-background focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                            <Button
                              size="sm"
                              onClick={() => {
                                handleUpdateOurRetailPrice(item.id, tempEditPrice);
                                setEditingCell(null);
                              }}
                              className="h-6 px-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px]"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="group/retail inline-flex items-center gap-1 justify-end">
                            <span className="font-semibold text-foreground">
                              ${Number(item.unitPrice || 0).toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCell({ itemId: item.id, competitor: 'ourRetail' });
                                setTempEditPrice(String(item.unitPrice || 0));
                              }}
                              className="opacity-0 group-hover/retail:opacity-100 text-muted-foreground hover:text-emerald-700 p-0.5 rounded transition-opacity"
                              title="Edit our Retail Price"
                            >
                              <Pencil className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center border rounded-md bg-background">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.id, (item.quantity || 1) - 1)}
                            className="px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity || 1}
                            onChange={e => handleUpdateQuantity(item.id, parseInt(e.target.value) || 1)}
                            className="w-10 text-center text-xs border-x bg-transparent py-0.5"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.id, (item.quantity || 1) + 1)}
                            className="px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Line Retail Total */}
                      <td className="py-3 px-3 text-right font-semibold text-emerald-700 dark:text-emerald-400">
                        <div>${lineRetail.toFixed(2)}</div>
                        <div className="text-[10px] text-muted-foreground font-normal">
                          {costViewMode === "replacement_cost" ? "Rep" : "Cost"}: ${(getItemCostDetails(item).activeCost * (item.quantity || 1)).toFixed(2)}
                        </div>
                      </td>

                      {/* Kent Building Supply Column */}
                      <td className="py-3 px-4 bg-orange-50/30 dark:bg-orange-950/10 border-l border-orange-200/40">
                        {isSearching ? (
                          <div className="flex items-center gap-1.5 text-xs text-orange-700 animate-pulse">
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            Searching Kent NS...
                          </div>
                        ) : editingCell?.itemId === item.id && editingCell?.competitor === 'kent' ? (
                          <div className="space-y-1.5 min-w-[130px]">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-bold text-orange-800">$</span>
                              <input
                                type="number"
                                step="0.01"
                                autoFocus
                                value={tempEditPrice}
                                onChange={e => setTempEditPrice(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    handleManualPriceUpdate(item.id, 'kent', tempEditPrice);
                                  } else if (e.key === 'Escape') {
                                    setEditingCell(null);
                                  }
                                }}
                                placeholder="3.98"
                                className="w-20 px-2 py-0.5 text-xs font-semibold border rounded bg-white dark:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                              />
                              <Button
                                size="sm"
                                onClick={() => handleManualPriceUpdate(item.id, 'kent', tempEditPrice)}
                                className="h-6 px-1.5 bg-orange-600 hover:bg-orange-700 text-white text-[10px]"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingCell(null)}
                                className="h-6 px-1 text-muted-foreground hover:text-foreground text-[10px]"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="text-[10px] text-muted-foreground">Press Enter to save</div>
                          </div>
                        ) : isKentListed && kent ? (
                          <div className="space-y-1">
                            <div className="flex items-baseline justify-between gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-foreground text-sm">${kent.price.toFixed(2)}</span>
                                <Badge variant="outline" className="text-[9px] px-1 py-0 bg-orange-100 text-orange-900 border-orange-200">
                                  {kentConfidence}% conf
                                </Badge>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCell({ itemId: item.id, competitor: 'kent' });
                                    setTempEditPrice(String(kent.price));
                                  }}
                                  className="text-muted-foreground hover:text-orange-700 p-0.5 rounded transition-colors"
                                  title="Edit Kent price"
                                >
                                  <Pencil className="h-2.5 w-2.5" />
                                </button>
                              </div>
                              <span className={`text-[11px] font-semibold ${
                                (kent.variancePct ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-600'
                              }`}>
                                {(kent.variancePct ?? 0) >= 0 ? '+' : ''}{kent.variancePct}%
                              </span>
                            </div>
                            {item.unitPrice !== kent.price && (
                              <button
                                type="button"
                                onClick={() => handleUpdateOurRetailPrice(item.id, kent.price)}
                                className="text-[10px] text-orange-800 dark:text-orange-300 hover:underline font-medium block text-left"
                                title="Set our retail price to match Kent"
                              >
                                + Match Our Retail: ${kent.price.toFixed(2)}
                              </button>
                            )}
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                              <span className="truncate max-w-[90px]">{kent.storeLocation || 'Bayers Lake'}</span>
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={kent.googleSearchUrl || `https://www.google.com/search?q=${encodeURIComponent(`kent building supplies, bayers lake, price on ${getItemSearchQuery(item)}`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center gap-0.5 font-medium"
                                  title={`Google: "kent building supplies, bayers lake, price on ${getItemSearchQuery(item)}"`}
                                >
                                  Google <ExternalLink className="h-2.5 w-2.5 inline" />
                                </a>
                                <span>•</span>
                                <a
                                  href={kent.url || `https://kent.ca/catalogsearch/result/?q=${encodeURIComponent(getItemSearchQuery(item))}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-orange-700 hover:underline flex items-center gap-0.5 font-medium"
                                  title="View on Kent.ca"
                                >
                                  kent.ca <ExternalLink className="h-2.5 w-2.5 inline" />
                                </a>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-1">
                              {kent?.notes && /not (sold|carried|stocked|offered)/i.test(kent.notes) ? (
                                <span className="text-[10px] font-semibold text-orange-800 dark:text-orange-300 bg-orange-100/70 dark:bg-orange-950/40 px-1.5 py-0.5 rounded border border-orange-200" title={kent.notes}>
                                  Not Carried
                                </span>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-700" title={`Confidence score ${kentConfidence}% is under 80% threshold`}>
                                    Unlisted
                                  </span>
                                  <span className="text-[10px] text-muted-foreground font-normal">(&lt;80% conf)</span>
                                </div>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingCell({ itemId: item.id, competitor: 'kent' });
                                  setTempEditPrice('');
                                }}
                                className="h-5 text-[10px] px-1.5 border-orange-300 text-orange-800 bg-orange-50/80 hover:bg-orange-100"
                                title="Enter price found on Google / Kent store"
                              >
                                <Plus className="h-2.5 w-2.5 mr-0.5" /> Enter Price
                              </Button>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px]">
                              <a
                                href={kent?.googleSearchUrl || `https://www.google.com/search?q=${encodeURIComponent(`kent building supplies, bayers lake, price on ${getItemSearchQuery(item)}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-0.5 font-medium"
                                title={`Search Google for "kent building supplies, bayers lake, price on ${getItemSearchQuery(item)}"`}
                              >
                                Search Google <ExternalLink className="h-2.5 w-2.5 inline" />
                              </a>
                              <span>•</span>
                              <a
                                href={kent?.url || `https://kent.ca/catalogsearch/result/?q=${encodeURIComponent(getItemSearchQuery(item))}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-orange-700 hover:underline flex items-center gap-0.5"
                                title={`Search kent.ca for "${getItemSearchQuery(item)}"`}
                              >
                                kent.ca <ExternalLink className="h-2.5 w-2.5 inline" />
                              </a>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* The Home Depot Column */}
                      <td className="py-3 px-4 bg-amber-50/30 dark:bg-amber-950/10 border-l border-amber-200/40">
                        {isSearching ? (
                          <div className="flex items-center gap-1.5 text-xs text-amber-800 animate-pulse">
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            Searching Home Depot NS...
                          </div>
                        ) : editingCell?.itemId === item.id && editingCell?.competitor === 'homeDepot' ? (
                          <div className="space-y-1.5 min-w-[130px]">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-bold text-amber-900">$</span>
                              <input
                                type="number"
                                step="0.01"
                                autoFocus
                                value={tempEditPrice}
                                onChange={e => setTempEditPrice(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    handleManualPriceUpdate(item.id, 'homeDepot', tempEditPrice);
                                  } else if (e.key === 'Escape') {
                                    setEditingCell(null);
                                  }
                                }}
                                placeholder="3.98"
                                className="w-20 px-2 py-0.5 text-xs font-semibold border rounded bg-white dark:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                              <Button
                                size="sm"
                                onClick={() => handleManualPriceUpdate(item.id, 'homeDepot', tempEditPrice)}
                                className="h-6 px-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[10px]"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingCell(null)}
                                className="h-6 px-1 text-muted-foreground hover:text-foreground text-[10px]"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="text-[10px] text-muted-foreground">Press Enter to save</div>
                          </div>
                        ) : isHdListed && hd ? (
                          <div className="space-y-1">
                            <div className="flex items-baseline justify-between gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-foreground text-sm">${hd.price.toFixed(2)}</span>
                                <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-100 text-amber-900 border-amber-200">
                                  {hdConfidence}% conf
                                </Badge>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCell({ itemId: item.id, competitor: 'homeDepot' });
                                    setTempEditPrice(String(hd.price));
                                  }}
                                  className="text-muted-foreground hover:text-amber-800 p-0.5 rounded transition-colors"
                                  title="Edit Home Depot price"
                                >
                                  <Pencil className="h-2.5 w-2.5" />
                                </button>
                              </div>
                              <span className={`text-[11px] font-semibold ${
                                (hd.variancePct ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-600'
                              }`}>
                                {(hd.variancePct ?? 0) >= 0 ? '+' : ''}{hd.variancePct}%
                              </span>
                            </div>
                            {item.unitPrice !== hd.price && (
                              <button
                                type="button"
                                onClick={() => handleUpdateOurRetailPrice(item.id, hd.price)}
                                className="text-[10px] text-amber-800 dark:text-amber-300 hover:underline font-medium block text-left"
                                title="Set our retail price to match Home Depot"
                              >
                                + Match Our Retail: ${hd.price.toFixed(2)}
                              </button>
                            )}
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                              <span className="truncate max-w-[90px]">{hd.storeLocation || 'Halifax Lacewood'}</span>
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={hd.googleSearchUrl || `https://www.google.com/search?q=${encodeURIComponent(`the home depot, halifax lacewood, price on ${getItemSearchQuery(item)}`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center gap-0.5 font-medium"
                                  title={`Google: "the home depot, halifax lacewood, price on ${getItemSearchQuery(item)}"`}
                                >
                                  Google <ExternalLink className="h-2.5 w-2.5 inline" />
                                </a>
                                <span>•</span>
                                <a
                                  href={hd.url || `https://www.homedepot.ca/en/home/search.html?q=${encodeURIComponent(getItemSearchQuery(item))}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-amber-800 hover:underline flex items-center gap-0.5 font-medium"
                                  title="View on HomeDepot.ca"
                                >
                                  homedepot.ca <ExternalLink className="h-2.5 w-2.5 inline" />
                                </a>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-1">
                              {hd?.notes && /not (sold|carried|stocked|offered)/i.test(hd.notes) ? (
                                <span className="text-[10px] font-semibold text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-300" title={hd.notes}>
                                  Not Carried at HD
                                </span>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-700" title={`Confidence score ${hdConfidence}% is under 80% threshold`}>
                                    Unlisted
                                  </span>
                                  <span className="text-[10px] text-muted-foreground font-normal">(&lt;80% conf)</span>
                                </div>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingCell({ itemId: item.id, competitor: 'homeDepot' });
                                  setTempEditPrice('');
                                }}
                                className="h-5 text-[10px] px-1.5 border-amber-300 text-amber-900 bg-amber-50/80 hover:bg-amber-100"
                                title="Enter price found on Google / Home Depot store"
                              >
                                <Plus className="h-2.5 w-2.5 mr-0.5" /> Enter Price
                              </Button>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px]">
                              <a
                                href={hd?.googleSearchUrl || `https://www.google.com/search?q=${encodeURIComponent(`the home depot, halifax lacewood, price on ${getItemSearchQuery(item)}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-0.5 font-medium"
                                title={`Search Google for "the home depot, halifax lacewood, price on ${getItemSearchQuery(item)}"`}
                              >
                                Search Google <ExternalLink className="h-2.5 w-2.5 inline" />
                              </a>
                              <span>•</span>
                              <a
                                href={hd?.url || `https://www.homedepot.ca/en/home/search.html?q=${encodeURIComponent(getItemSearchQuery(item))}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-amber-800 hover:underline flex items-center gap-0.5"
                                title={`Search homedepot.ca for "${getItemSearchQuery(item)}"`}
                              >
                                homedepot.ca <ExternalLink className="h-2.5 w-2.5 inline" />
                              </a>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Market Deal Badge */}
                      <td className="py-3 px-3 text-center">
                        {hasCompetitor ? (
                          <button
                            type="button"
                            onClick={() => setSelectedDetailItem(item)}
                            className="inline-flex items-center"
                          >
                            <Badge
                              variant="outline"
                              className={`text-[11px] cursor-pointer hover:opacity-80 ${
                                comp?.bestDeal === 'prospaces'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
                                  : comp?.bestDeal === 'kent'
                                  ? 'bg-orange-100 text-orange-800 border-orange-300 font-semibold'
                                  : 'bg-amber-100 text-amber-900 border-amber-300 font-semibold'
                              }`}
                            >
                              {comp?.bestDeal === 'prospaces' && '⭐ ProSpaces Lowest'}
                              {comp?.bestDeal === 'kent' && 'Kent Lower'}
                              {comp?.bestDeal === 'home_depot' && 'HD Lower'}
                              {comp?.bestDeal === 'tie' && 'Price Matched'}
                            </Badge>
                          </button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSearchSingleItem(item.id)}
                            className="h-7 text-xs text-emerald-700 hover:bg-emerald-50"
                          >
                            <Sparkles className="h-3 w-3 mr-1 text-emerald-600" />
                            Search
                          </Button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => handleSearchSingleItem(item.id)}
                            title="Refresh Competitor Search"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${isSearching ? 'animate-spin' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleRemoveItem(item.id)}
                            title="Remove Item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/80 font-semibold text-xs border-t-2">
                  <td colSpan={5} className="py-3 px-4 text-right">Total Basket ({totals.totalUnits} Units):</td>
                  <td className="py-3 px-3 text-center">{totals.totalUnits}</td>
                  <td className="py-3 px-3 text-right text-emerald-700 dark:text-emerald-400 font-bold">
                    ${totals.ourRetailTotal.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 bg-orange-100/50 dark:bg-orange-950/30 border-l border-orange-300/60 font-bold text-orange-900 dark:text-orange-200">
                    {totals.kentTotal > 0 ? `$${totals.kentTotal.toFixed(2)}` : '—'}
                  </td>
                  <td className="py-3 px-4 bg-amber-100/50 dark:bg-amber-950/30 border-l border-amber-300/60 font-bold text-amber-950 dark:text-amber-200">
                    {totals.homeDepotTotal > 0 ? `$${totals.homeDepotTotal.toFixed(2)}` : '—'}
                  </td>
                  <td colSpan={2} className="py-3 px-4 text-center text-muted-foreground text-[11px]">
                    Halifax, NS Market Benchmark
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Save List Modal */}
      <Dialog open={isSaveListModalOpen} onOpenChange={setIsSaveListModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="h-5 w-5 text-indigo-600" />
              Save Shopping List
            </DialogTitle>
            <DialogDescription>
              Save this list with all quantities, prices, and settings.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveListSubmit} className="space-y-4 my-2">
            <div>
              <label htmlFor="listName" className="block text-sm font-medium mb-1">List Name</label>
              <Input
                id="listName"
                value={saveListName}
                onChange={(e) => setSaveListName(e.target.value)}
                placeholder="e.g. Deck Framing Phase 1"
                required
              />
            </div>
            <div>
              <label htmlFor="listDesc" className="block text-sm font-medium mb-1">Description (Optional)</label>
              <Input
                id="listDesc"
                value={saveListDescription}
                onChange={(e) => setSaveListDescription(e.target.value)}
                placeholder="Optional details or project reference"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsSaveListModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isSavingList || !saveListName.trim()}>
                {isSavingList ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save List
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Load List Modal */}
      <Dialog open={isLoadListModalOpen} onOpenChange={setIsLoadListModalOpen}>
        <DialogContent className="max-w-xl max-h-[80vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-indigo-600" />
              Load Saved List
            </DialogTitle>
            <DialogDescription>
              Select a previously saved shopping list to load it into the editor.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2 mt-4 space-y-3">
            {isLoadingLists ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : savedLists.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                <p>No saved lists found.</p>
              </div>
            ) : (
              savedLists.map(list => (
                <div key={list.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/10 transition-colors">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-foreground truncate">{list.name}</h4>
                    {list.description && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{list.description}</p>
                    )}
                    <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
                      <span>{list.items?.length || 0} items</span>
                      <span>•</span>
                      <span>Updated {new Date(list.updated_at).toLocaleDateString()}</span>
                      {list.totals?.ourRetailTotal && (
                        <>
                          <span>•</span>
                          <span>Total: ${list.totals.ourRetailTotal.toFixed(2)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLoadSavedList(list)}
                    >
                      Load
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => handleDeleteSavedList(list.id, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex justify-end pt-4 mt-2 border-t">
            <Button variant="outline" onClick={() => setIsLoadListModalOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inventory Item Picker Modal with Live Database Search */}
      <Dialog open={isPickerOpen} onOpenChange={setIsPickerOpen}>
        <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5 text-emerald-600" />
              Select Items from ProSpaces Inventory
            </DialogTitle>
            <DialogDescription>
              Search across your entire 19,000+ item catalog with real-time keyword matching to add materials to your Shopping List.
            </DialogDescription>
          </DialogHeader>

          {/* Filter & Search Controls */}
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search SKU, 2x4, drywall, screws, paint, framing..."
                value={pickerSearchQuery}
                onChange={e => setPickerSearchQuery(e.target.value)}
                className="pl-9 pr-8"
                autoFocus
              />
              {pickerSearchQuery && (
                <button
                  type="button"
                  onClick={() => setPickerSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <select
              value={pickerCategory}
              onChange={e => setPickerCategory(e.target.value)}
              className="h-10 px-3 rounded-md border bg-background text-sm max-w-xs"
            >
              <option value="all">All Categories ({categories.length > 0 ? categories.length : 'All'})</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Search Status & Selection Bar */}
          <div className="flex items-center justify-between px-1 py-1 text-xs text-muted-foreground mt-1">
            <div className="flex items-center gap-2">
              {isPickerLoading ? (
                <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching catalog database...
                </span>
              ) : (
                <span>
                  Found <strong className="text-foreground">{dbPickerTotalCount.toLocaleString()}</strong> item{dbPickerTotalCount !== 1 ? 's' : ''}
                  {debouncedPickerSearch && ` matching "${debouncedPickerSearch}"`}
                  {pickerCategory !== 'all' && ` in ${pickerCategory}`}
                </span>
              )}
            </div>
            {selectedCount > 0 && (
              <span className="font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
              </span>
            )}
          </div>

          {/* Item List Table */}
          <div className="flex-1 overflow-y-auto border rounded-lg mt-1 divide-y min-h-[300px] max-h-[450px]">
            {isPickerLoading && dbPickerItems.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <p className="text-sm font-medium">Searching inventory database...</p>
              </div>
            ) : dbPickerItems.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <h4 className="font-semibold text-foreground mb-1">No items found</h4>
                <p className="text-xs max-w-sm mx-auto">
                  No materials matched your search query "{pickerSearchQuery}". Try searching for dimensions like "2x4", "2 x", "SPF", or a specific SKU.
                </p>
              </div>
            ) : (
              dbPickerItems.map(item => {
                const isSelected = !!selectedItemsMap[item.id];
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItemSelection(item)}
                    className={`flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                      isSelected ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-l-4 border-emerald-600' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Handled by parent container click
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-foreground bg-muted px-1.5 py-0.5 rounded">
                            {item.sku}
                          </span>
                          <span className="font-medium text-sm text-foreground truncate">{item.name}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-background text-muted-foreground">
                            {item.category}
                          </Badge>
                        </div>
                        {item.description && item.description !== item.name && (
                          <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {item.description}
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                          <span>UOM: <strong className="text-foreground">{item.unitOfMeasure}</strong></span>
                          <span>•</span>
                          <span>On Hand: <strong className="text-foreground">{item.quantityOnHand}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-bold text-sm text-foreground">
                        ${item.unitPrice.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Cost: ${item.cost.toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Controls */}
          {totalPickerPages > 1 && (
            <div className="flex items-center justify-between pt-2 px-1 text-xs text-muted-foreground">
              <span>
                Page {pickerPage} of {totalPickerPages} ({dbPickerTotalCount.toLocaleString()} total items)
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPickerPage(p => Math.max(1, p - 1))}
                  disabled={pickerPage <= 1 || isPickerLoading}
                  className="h-7 px-2"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
                </Button>
                <span className="px-2 font-medium text-foreground">{pickerPage}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPickerPage(p => Math.min(totalPickerPages, p + 1))}
                  disabled={pickerPage >= totalPickerPages || isPickerLoading}
                  className="h-7 px-2"
                >
                  Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-4 border-t mt-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
              </span>
              {selectedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedItemsMap({})}
                  className="text-xs text-red-600 hover:underline"
                >
                  Clear selection
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setIsPickerOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddItemsFromPicker}
                disabled={selectedCount === 0}
                className="bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                Add {selectedCount > 0 ? `(${selectedCount})` : ''} to Shopping List
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Competitor Price Details & Sources Modal */}
      {selectedDetailItem && selectedDetailItem.competitorData && (
        <Dialog open={!!selectedDetailItem} onOpenChange={() => setSelectedDetailItem(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Store className="h-5 w-5 text-emerald-600" />
                Halifax Market Price Intelligence
              </DialogTitle>
              <DialogDescription>
                Live competitive pricing and web search intelligence for <strong className="text-foreground">{selectedDetailItem.name}</strong> ({selectedDetailItem.sku})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-2">
              {/* ProSpaces Competitive Pricing Intelligence Module */}
              <CompetitivePricingPanel
                productId={selectedDetailItem.sku || selectedDetailItem.id}
                sku={selectedDetailItem.sku}
                productName={selectedDetailItem.name || selectedDetailItem.description}
                description={selectedDetailItem.description}
                currentPrice={selectedDetailItem.unitPrice || 0}
                unitOfMeasure={selectedDetailItem.unitOfMeasure || 'EA'}
                manufacturerPartNumber={selectedDetailItem.mfgPartNumber}
                upc={selectedDetailItem.upc}
                category={selectedDetailItem.category}
              />

              {/* Natural Language Web Search Bar & Controls */}
              <div className="p-3.5 rounded-lg border border-indigo-200 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-950 dark:text-indigo-200">
                    <Search className="h-4 w-4 text-indigo-600" />
                    <span>Live Web Search Criteria (Google / Edge Style)</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-indigo-100 text-indigo-800 border-indigo-300">
                    Live Grounding Enabled
                  </Badge>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={modalSearchQuery}
                    onChange={e => setModalSearchQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (selectedDetailItem) {
                          setIsModalSearching(true);
                          handleSearchSingleItem(selectedDetailItem.id, modalSearchQuery).finally(() => setIsModalSearching(false));
                        }
                      }
                    }}
                    placeholder="Enter search criteria e.g. UPC, Supplier SKU (MFG #), or Description..."
                    className="flex-1 px-3 py-1.5 text-xs border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <Button
                    size="sm"
                    disabled={isModalSearching || !modalSearchQuery.trim()}
                    onClick={() => {
                      if (selectedDetailItem) {
                        setIsModalSearching(true);
                        handleSearchSingleItem(selectedDetailItem.id, modalSearchQuery).finally(() => setIsModalSearching(false));
                      }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-3 flex items-center gap-1.5"
                  >
                    {isModalSearching ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="h-3.5 w-3.5" />
                        Search Web
                      </>
                    )}
                  </Button>
                </div>

                {/* Quick Search Preset Chips */}
                <div className="space-y-1.5">
                  <div className="text-[11px] text-muted-foreground font-medium">Matching Criteria Presets (Click to Search):</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDetailItem.upc && (
                      <button
                        type="button"
                        onClick={() => setModalSearchQuery(`UPC ${selectedDetailItem.upc} price Canada`)}
                        className="px-2 py-0.5 rounded text-[11px] bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 font-medium transition-colors"
                      >
                        UPC: {selectedDetailItem.upc}
                      </button>
                    )}
                    {selectedDetailItem.mfgPartNumber && (
                      <button
                        type="button"
                        onClick={() => setModalSearchQuery(`${selectedDetailItem.mfgPartNumber} price Canada`.trim())}
                        className="px-2 py-0.5 rounded text-[11px] bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-300 font-medium transition-colors"
                      >
                        Supplier SKU (MFG #): {selectedDetailItem.mfgPartNumber}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setModalSearchQuery(`${selectedDetailItem.description || selectedDetailItem.name} price Canada`)}
                      className="px-2 py-0.5 rounded text-[11px] bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 font-medium transition-colors"
                    >
                      Description: {selectedDetailItem.description || selectedDetailItem.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalSearchQuery([selectedDetailItem.mfgPartNumber, selectedDetailItem.description, selectedDetailItem.upc ? `UPC ${selectedDetailItem.upc}` : ''].filter(Boolean).join(' '))}
                      className="px-2 py-0.5 rounded text-[11px] bg-indigo-100 hover:bg-indigo-200 text-indigo-900 border border-indigo-300 font-semibold transition-colors"
                    >
                      All 3 Criteria Combined
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalSearchQuery(`KENT BUILDING SUPPLIES PRICE FOR ${selectedDetailItem.description || selectedDetailItem.name}`)}
                      className="px-2 py-0.5 rounded text-[11px] bg-orange-100 hover:bg-orange-200 text-orange-900 border border-orange-200 transition-colors text-left"
                    >
                      Kent Query
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalSearchQuery(`THE HOME DEPOT CANADA PRICE FOR ${selectedDetailItem.description || selectedDetailItem.name}`)}
                      className="px-2 py-0.5 rounded text-[11px] bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-200 transition-colors text-left"
                    >
                      Home Depot Query
                    </button>
                  </div>
                </div>

                {/* Direct 1-Click Search Engine Links */}
                <div className="pt-2 border-t border-indigo-200/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-[11px] text-muted-foreground font-medium">Direct Search Links:</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(`kent building supplies, bayers lake, price on ${modalSearchQuery || getItemSearchQuery(selectedDetailItem)}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-medium"
                    >
                      Google Kent (Bayers Lake) <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(`the home depot, halifax lacewood, price on ${modalSearchQuery || getItemSearchQuery(selectedDetailItem)}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 font-medium"
                    >
                      Google HD (Lacewood) <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                    <a
                      href={`https://www.bing.com/search?q=${encodeURIComponent(`kent building supplies, bayers lake, price on ${modalSearchQuery || getItemSearchQuery(selectedDetailItem)}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-cyan-50 text-cyan-800 border border-cyan-200 hover:bg-cyan-100 font-medium"
                    >
                      Bing / Edge Search <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* ProSpaces Card */}
              <div className="p-3.5 rounded-lg border bg-muted/40 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase text-muted-foreground">ProSpaces CRM</span>
                  <div className="text-sm font-semibold text-foreground mt-0.5">
                    {selectedDetailItem.description || selectedDetailItem.name}
                  </div>
                  {selectedDetailItem.description && selectedDetailItem.name && selectedDetailItem.description !== selectedDetailItem.name && (
                    <div className="text-xs text-muted-foreground mt-0.5">Internal Name: {selectedDetailItem.name}</div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>UOM: {selectedDetailItem.unitOfMeasure}</span>
                    <span>•</span>
                    {(() => {
                      const costInfo = getItemCostDetails(selectedDetailItem);
                      return (
                        <>
                          <span>Avg Cost: <strong>${costInfo.avgCost.toFixed(2)}</strong></span>
                          <span>•</span>
                          <span className="text-indigo-700 dark:text-indigo-300 font-semibold">Rep. Cost: <strong>${costInfo.repCost.toFixed(2)}</strong></span>
                        </>
                      );
                    })()}
                    {selectedDetailItem.mfgPartNumber && (
                      <>
                        <span>•</span>
                        <span className="font-mono font-medium text-blue-700 dark:text-blue-300">MFG #: {selectedDetailItem.mfgPartNumber}</span>
                      </>
                    )}
                    {selectedDetailItem.upc && (
                      <>
                        <span>•</span>
                        <span className="font-mono font-medium text-emerald-700 dark:text-emerald-300">UPC: {selectedDetailItem.upc}</span>
                      </>
                    )}
                    {selectedDetailItem.manufacturer && (
                      <>
                        <span>•</span>
                        <span>Brand: {selectedDetailItem.manufacturer}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-foreground">${selectedDetailItem.unitPrice.toFixed(2)}</div>
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Our Retail</Badge>
                </div>
              </div>

              {/* Kent Card */}
              {selectedDetailItem.competitorData.kent && (
                <div className="p-3.5 rounded-lg border border-orange-200 bg-orange-50/40 dark:bg-orange-950/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm text-orange-900 dark:text-orange-300">Kent Building Supplies</strong>
                        <Badge variant="outline" className="text-[10px] bg-orange-100 text-orange-800 border-orange-300">
                          {selectedDetailItem.competitorData.kent.storeLocation || 'Halifax / Bayers Lake, NS'}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Product: {selectedDetailItem.competitorData.kent.productTitle || selectedDetailItem.name}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px]">
                        {selectedDetailItem.competitorData.kent.sku && (
                          <span className="font-mono bg-orange-100/80 text-orange-950 px-1.5 py-0.5 rounded border border-orange-200">
                            SKU: {selectedDetailItem.competitorData.kent.sku}
                          </span>
                        )}
                        {selectedDetailItem.competitorData.kent.modelNumber && (
                          <span className="font-mono bg-orange-100/80 text-orange-950 px-1.5 py-0.5 rounded border border-orange-200">
                            Model #: {selectedDetailItem.competitorData.kent.modelNumber}
                          </span>
                        )}
                        {selectedDetailItem.competitorData.kent.stockStatus && (
                          <span className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${
                            selectedDetailItem.competitorData.kent.inStock ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {selectedDetailItem.competitorData.kent.stockStatus}
                          </span>
                        )}
                      </div>
                      {selectedDetailItem.competitorData.kent.notes && (
                        <div className="text-[11px] text-muted-foreground mt-1 italic">
                          {selectedDetailItem.competitorData.kent.notes}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      {selectedDetailItem.competitorData.kent.price > 0 && (selectedDetailItem.competitorData.kent.matchConfidencePct ?? 90) >= 80 ? (
                        <>
                          <div className="flex items-center gap-1.5 justify-end">
                            <span className="text-lg font-bold text-orange-950 dark:text-orange-200">
                              ${selectedDetailItem.competitorData.kent.price.toFixed(2)} CAD
                            </span>
                            <Badge variant="outline" className="text-[10px] bg-orange-100 text-orange-900 border-orange-300">
                              {selectedDetailItem.competitorData.kent.matchConfidencePct ?? 90}% conf
                            </Badge>
                          </div>
                          <div className={`text-xs font-semibold ${
                            (selectedDetailItem.competitorData.kent.variancePct ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-600'
                          }`}>
                            {(selectedDetailItem.competitorData.kent.variancePct ?? 0) >= 0 ? '+' : ''}{selectedDetailItem.competitorData.kent.variancePct}% vs Our Retail
                          </div>
                          {selectedDetailItem.unitPrice !== selectedDetailItem.competitorData.kent.price && (
                            <button
                              type="button"
                              onClick={() => {
                                handleUpdateOurRetailPrice(selectedDetailItem.id, selectedDetailItem.competitorData.kent.price);
                                setSelectedDetailItem(prev => prev ? { ...prev, unitPrice: selectedDetailItem.competitorData.kent.price } : null);
                              }}
                              className="mt-1 text-[11px] font-medium text-orange-800 dark:text-orange-300 hover:underline block ml-auto"
                              title="Update ProSpaces Retail price to match Kent"
                            >
                              Match ProSpaces Retail to Kent (${selectedDetailItem.competitorData.kent.price.toFixed(2)})
                            </button>
                          )}
                        </>
                      ) : selectedDetailItem.competitorData.kent.notes && /not (sold|carried|stocked|offered)/i.test(selectedDetailItem.competitorData.kent.notes) ? (
                        <span className="text-xs font-semibold text-orange-900 dark:text-orange-300 bg-orange-100/90 dark:bg-orange-950/60 px-2 py-0.5 rounded border border-orange-300">Not Carried</span>
                      ) : (
                        <div className="text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-300">
                            Unlisted
                          </span>
                          <div className="text-[10px] text-muted-foreground mt-0.5">Confidence &lt; 80% threshold</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Manual Kent Price Override / Entry */}
                  <div className="mt-3 pt-2.5 border-t border-orange-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-orange-950 dark:text-orange-200">
                        Update / Set Verified Kent Price ($ CAD):
                      </span>
                      {selectedDetailItem.competitorData.kent.price > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const p = selectedDetailItem.competitorData.kent.price.toFixed(2);
                            setModalCustomKentPrice(p);
                            handleManualPriceUpdate(selectedDetailItem.id, 'kent', p);
                          }}
                          className="text-[10px] px-2 py-0.5 rounded bg-orange-100 hover:bg-orange-200 text-orange-900 border border-orange-300 font-medium transition-colors"
                        >
                          + Apply Verified Kent: ${selectedDetailItem.competitorData.kent.price.toFixed(2)} /EA
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={modalCustomKentPrice}
                          onChange={e => setModalCustomKentPrice(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleManualPriceUpdate(selectedDetailItem.id, 'kent', modalCustomKentPrice);
                            }
                          }}
                          placeholder={selectedDetailItem.competitorData.kent.price > 0 ? selectedDetailItem.competitorData.kent.price.toFixed(2) : "0.00"}
                          className="w-full pl-6 pr-3 py-1 text-xs font-semibold border rounded bg-background focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleManualPriceUpdate(selectedDetailItem.id, 'kent', modalCustomKentPrice)}
                        className="bg-orange-600 hover:bg-orange-700 text-white text-xs h-7 px-3 flex items-center gap-1"
                      >
                        <Save className="h-3 w-3" /> Save Kent Price
                      </Button>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-orange-200/60 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <a
                        href={selectedDetailItem.competitorData.kent.googleSearchUrl || `https://www.google.com/search?q=${encodeURIComponent(`kent building supplies, bayers lake, price on ${modalSearchQuery || getItemSearchQuery(selectedDetailItem)}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
                      >
                        Google Search <ExternalLink className="h-3 w-3" />
                      </a>
                      <span>•</span>
                      <a
                        href={selectedDetailItem.competitorData.kent.bingSearchUrl || `https://www.bing.com/search?q=${encodeURIComponent(`kent building supplies, bayers lake, price on ${modalSearchQuery || getItemSearchQuery(selectedDetailItem)}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-cyan-700 hover:underline flex items-center gap-1 font-medium"
                      >
                        Bing Search <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    {selectedDetailItem.competitorData.kent.url && (
                      <a
                        href={selectedDetailItem.competitorData.kent.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-orange-700 hover:underline flex items-center gap-1 font-medium"
                      >
                        Verify on kent.ca <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Home Depot Card */}
              {selectedDetailItem.competitorData.homeDepot && (
                <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/40 dark:bg-amber-950/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm text-amber-950 dark:text-amber-300">The Home Depot</strong>
                        <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-900 border-amber-300">
                          {selectedDetailItem.competitorData.homeDepot.storeLocation || 'Halifax Lacewood / Dartmouth Crossing, NS'}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Product: {selectedDetailItem.competitorData.homeDepot.productTitle || selectedDetailItem.name}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px]">
                        {selectedDetailItem.competitorData.homeDepot.sku && (
                          <span className="font-mono bg-amber-100/80 text-amber-950 px-1.5 py-0.5 rounded border border-amber-200">
                            SKU: {selectedDetailItem.competitorData.homeDepot.sku}
                          </span>
                        )}
                        {selectedDetailItem.competitorData.homeDepot.modelNumber && (
                          <span className="font-mono bg-amber-100/80 text-amber-950 px-1.5 py-0.5 rounded border border-amber-200">
                            Model #: {selectedDetailItem.competitorData.homeDepot.modelNumber}
                          </span>
                        )}
                        {selectedDetailItem.competitorData.homeDepot.stockStatus && (
                          <span className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${
                            selectedDetailItem.competitorData.homeDepot.inStock ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {selectedDetailItem.competitorData.homeDepot.stockStatus}
                          </span>
                        )}
                      </div>
                      {selectedDetailItem.competitorData.homeDepot.notes && (
                        <div className="text-[11px] text-muted-foreground mt-1 italic">
                          {selectedDetailItem.competitorData.homeDepot.notes}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      {selectedDetailItem.competitorData.homeDepot.price > 0 && (selectedDetailItem.competitorData.homeDepot.matchConfidencePct ?? 90) >= 80 ? (
                        <>
                          <div className="flex items-center gap-1.5 justify-end">
                            <span className="text-lg font-bold text-amber-950 dark:text-amber-200">
                              ${selectedDetailItem.competitorData.homeDepot.price.toFixed(2)} CAD
                            </span>
                            <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-900 border-amber-300">
                              {selectedDetailItem.competitorData.homeDepot.matchConfidencePct ?? 90}% conf
                            </Badge>
                          </div>
                          <div className={`text-xs font-semibold ${
                            (selectedDetailItem.competitorData.homeDepot.variancePct ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-600'
                          }`}>
                            {(selectedDetailItem.competitorData.homeDepot.variancePct ?? 0) >= 0 ? '+' : ''}{selectedDetailItem.competitorData.homeDepot.variancePct}% vs Our Retail
                          </div>
                          {selectedDetailItem.unitPrice !== selectedDetailItem.competitorData.homeDepot.price && (
                            <button
                              type="button"
                              onClick={() => {
                                handleUpdateOurRetailPrice(selectedDetailItem.id, selectedDetailItem.competitorData.homeDepot.price);
                                setSelectedDetailItem(prev => prev ? { ...prev, unitPrice: selectedDetailItem.competitorData.homeDepot.price } : null);
                              }}
                              className="mt-1 text-[11px] font-medium text-amber-800 dark:text-amber-300 hover:underline block ml-auto"
                              title="Update ProSpaces Retail price to match Home Depot"
                            >
                              Match ProSpaces Retail to HD (${selectedDetailItem.competitorData.homeDepot.price.toFixed(2)})
                            </button>
                          )}
                        </>
                      ) : selectedDetailItem.competitorData.homeDepot.notes && /not (sold|carried|stocked|offered)/i.test(selectedDetailItem.competitorData.homeDepot.notes) ? (
                        <span className="text-xs font-semibold text-amber-900 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-300">Not Carried</span>
                      ) : (
                        <div className="text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-300">
                            Unlisted
                          </span>
                          <div className="text-[10px] text-muted-foreground mt-0.5">Confidence &lt; 80% threshold</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Manual Home Depot Price Override / Entry */}
                  <div className="mt-3 pt-2.5 border-t border-amber-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-amber-950 dark:text-amber-200">
                        Update / Set Verified Home Depot Price ($ CAD):
                      </span>
                      {selectedDetailItem.competitorData.homeDepot.price > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const p = selectedDetailItem.competitorData.homeDepot.price.toFixed(2);
                            setModalCustomHdPrice(p);
                            handleManualPriceUpdate(selectedDetailItem.id, 'homeDepot', p);
                          }}
                          className="text-[10px] px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-medium transition-colors"
                        >
                          + Apply Verified HD: ${selectedDetailItem.competitorData.homeDepot.price.toFixed(2)} /EA
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={modalCustomHdPrice}
                          onChange={e => setModalCustomHdPrice(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleManualPriceUpdate(selectedDetailItem.id, 'homeDepot', modalCustomHdPrice);
                            }
                          }}
                          placeholder={selectedDetailItem.competitorData.homeDepot.price > 0 ? selectedDetailItem.competitorData.homeDepot.price.toFixed(2) : "0.00"}
                          className="w-full pl-6 pr-3 py-1 text-xs font-semibold border rounded bg-background focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleManualPriceUpdate(selectedDetailItem.id, 'homeDepot', modalCustomHdPrice)}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-7 px-3 flex items-center gap-1"
                      >
                        <Save className="h-3 w-3" /> Save HD Price
                      </Button>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-amber-200/60 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <a
                        href={selectedDetailItem.competitorData.homeDepot.googleSearchUrl || `https://www.google.com/search?q=${encodeURIComponent(`the home depot, halifax lacewood, price on ${modalSearchQuery || getItemSearchQuery(selectedDetailItem)}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
                      >
                        Google Search <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    {selectedDetailItem.competitorData.homeDepot.url && (
                      <a
                        href={selectedDetailItem.competitorData.homeDepot.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-amber-800 hover:underline flex items-center gap-1 font-medium"
                      >
                        Verify on homedepot.ca <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Recommendation Note */}
              {selectedDetailItem.competitorData.marketRecommendation && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 rounded-lg text-xs text-blue-900 dark:text-blue-200">
                  <div className="font-semibold flex items-center gap-1 mb-0.5">
                    <Info className="h-3.5 w-3.5" /> Market Pricing Recommendation:
                  </div>
                  {selectedDetailItem.competitorData.marketRecommendation}
                </div>
              )}

              {/* Grounding Web Sources */}
              {selectedDetailItem.competitorData.groundingSources && selectedDetailItem.competitorData.groundingSources.length > 0 && (
                <div className="p-3 bg-muted/50 border rounded-lg space-y-1.5">
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Search Grounding & Verified Web Sources ({selectedDetailItem.competitorData.groundingSources.length})</span>
                  </div>
                  <div className="space-y-1">
                    {selectedDetailItem.competitorData.groundingSources.map((src, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-0.5">
                        <span className="text-muted-foreground truncate max-w-[420px]">{src.title}</span>
                        {src.url && (
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1 font-medium text-[11px] ml-2 shrink-0"
                          >
                            Open Link <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setSelectedDetailItem(null)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
