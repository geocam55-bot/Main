import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Plus, Edit, Trash2, Eye, FileText, Search, Filter, Calendar, DollarSign, User, MoreVertical, Send, Building, AlertCircle, ShoppingCart, RefreshCw } from 'lucide-react';
import { bidsAPI, quotesAPI, contactsAPI, inventoryAPI, settingsAPI } from '../utils/api';
import { BidLineItems } from './BidLineItems';
import { DealsKanban, Quote, LineItem } from './DealsKanban';
import { EmailQuoteDialog } from './EmailQuoteDialog';
import { createClient } from '../utils/supabase/client';
import { SubscriptionAgreement, Organization } from './SubscriptionAgreement';
import { getPriceTierLabel, getActivePriceLevels, priceLevelToTier } from '../lib/global-settings';
import { toast } from 'sonner@2.0.3';
import { DealsModuleHelp } from './DealsModuleHelp';

interface User {
  id: string;
  email: string;
  role: string;
  organization_id?: string;
}

interface Contact {
  id: string;
  name: string;
  email?: string;
  company?: string;
  priceLevel?: string;
}

interface BidsProps {
  user: User;
}

interface EditQuoteFormData extends Partial<Quote> {
  useManualSubtotal?: boolean;
  manualSubtotal?: number;
}

// Legacy Bid interface (from bids table)
interface Bid {
  id: string;
  clientName: string;
  projectName: string;
  description?: string;
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  validUntil: string;
  notes?: string;
  terms?: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  organizationId?: string;
}

export function Bids({ user }: BidsProps) {
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [legacyBids, setLegacyBids] = useState<Bid[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<EditQuoteFormData>({});
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewQuote, setPreviewQuote] = useState<Quote | null>(null);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailQuote, setEmailQuote] = useState<Quote | null>(null);
  const [viewingAgreement, setViewingAgreement] = useState<Quote | null>(null);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [isLineItemDialogOpen, setIsLineItemDialogOpen] = useState(false);
  const [orgSettings, setOrgSettings] = useState<any>(null);

  const [orgData, setOrgData] = useState<Organization | null>(null);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  // Fetch organization data when viewing an agreement
  useEffect(() => {
    if (viewingAgreement) {
      const getOrgData = async (): Promise<void> => {
        try {
          const supabase = createClient();
          const { data, error } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', user.organization_id)
            .single();
          
          if (error) throw error;
          
          setOrgData({
            id: data.id,
            name: data.name,
            ai_suggestions_enabled: data.ai_suggestions_enabled,
            marketing_enabled: data.marketing_enabled,
            inventory_enabled: data.inventory_enabled,
            import_export_enabled: data.import_export_enabled,
            documents_enabled: data.documents_enabled,
          });
        } catch (err) {
          setOrgData(null);
        }
      };
      
      getOrgData();
    } else {
      setOrgData(null);
    }
  }, [viewingAgreement, user.organization_id]);

  useEffect(() => {
    if (isDialogOpen) {
      if (selectedQuote) {
        // Normalize line items to ensure all expected fields are present
        const items = selectedQuote.lineItems || [];
        
        const normalizedItems = items.map((item: any) => {
          const normalized = {
            id: item.id,
            itemId: item.itemId || item.item_id || '',
            itemName: item.itemName || item.item_name || item.description || item.name || '',
            sku: item.sku || '',
            description: item.description || item.itemName || item.item_name || '',
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unitPrice || item.unit_price || item.price || 0),
            cost: Number(item.cost || 0),
            discount: Number(item.discount || 0),
            total: Number(item.total || 0)
          };
          return normalized;
        });
        
        const hasLineItems = normalizedItems.length > 0;
        setEditFormData({
          title: selectedQuote.title || '',
          contactId: selectedQuote.contactId || '',
          status: selectedQuote.status || 'draft',
          validUntil: selectedQuote.validUntil && !isNaN(new Date(selectedQuote.validUntil).getTime()) ? new Date(selectedQuote.validUntil).toISOString().split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          notes: selectedQuote.notes || '',
          terms: selectedQuote.terms || orgSettings?.quote_terms || 'Payment due within 30 days. All prices in USD.',
          priceTier: selectedQuote.priceTier || 1,
          lineItems: normalizedItems,
          discountPercent: selectedQuote.discountPercent || 0,
          taxPercent: selectedQuote.taxPercent || orgSettings?.tax_rate || 0,
          taxPercent2: selectedQuote.taxPercent2 || orgSettings?.tax_rate_2 || 0,
          useManualSubtotal: !hasLineItems,
          manualSubtotal: Number(selectedQuote.subtotal || 0),
        });
      } else {
        setEditFormData({
          title: '',
          contactId: '',
          status: 'draft',
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          notes: '',
          terms: orgSettings?.quote_terms || 'Payment due within 30 days. All prices in USD.',
          priceTier: 1,
          lineItems: [],
          discountPercent: 0,
          taxPercent: orgSettings?.tax_rate || 0,
          taxPercent2: orgSettings?.tax_rate_2 || 0,
          useManualSubtotal: true,
          manualSubtotal: 0,
        });
      }
    }
  }, [selectedQuote, isDialogOpen]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const scope = 'personal';
      
      // Load both quotes and legacy bids
      const [quotesResponse, bidsResponse, contactsResponse, inventoryResponse, settingsData] = await Promise.all([
        quotesAPI.getAll(scope),
        bidsAPI.getAll(scope),
        contactsAPI.getAll(scope),
        inventoryAPI.getAll(),
        settingsAPI.getOrganizationSettings(user.organizationId || user.organization_id || '')
      ]);
      
      if (settingsData) {
        setOrgSettings(settingsData);
      }

      const dbQuotes = quotesResponse.quotes || [];
      const loadedContacts = contactsResponse.contacts || [];

      // Format db quotes to match Quote interface, and look up contact names
      const mappedQuotes: Quote[] = dbQuotes.map((q: any) => {
        const contact = loadedContacts.find((c: any) => c.id === q.contact_id);
        let parsedLineItems: LineItem[] = [];
        if (q.line_items) {
          try {
            const rawLineItemsField = typeof q.line_items === 'string' ? JSON.parse(q.line_items) : q.line_items;
            const rawLineItems = Array.isArray(rawLineItemsField) ? rawLineItemsField : [];
            parsedLineItems = rawLineItems.map((item: any) => ({
              id: item.id || `line-${Math.random().toString(36).substr(2, 9)}`,
              itemId: item.itemId || item.item_id || item.product_id || '',
              itemName: item.itemName || item.item_name || item.name || item.title || item.description || '',
              sku: item.sku || item.item || '',
              description: item.description || item.desc || '',
              quantity: item.quantity || item.qty || 1,
              unitPrice: item.unitPrice ?? item.unit_price ?? item.price ?? 0,
              cost: item.cost ?? 0,
              discount: item.discount ?? 0,
              total: item.total ?? 0,
            }));
          } catch (e) {
          }
        }
        
        return {
          id: q.id,
          quoteNumber: q.quote_number,
          title: q.title,
          contactId: q.contact_id,
          contactName: q.contact_name || contact?.name || contact?.company || '',
          contactEmail: contact?.email || '',
          priceTier: q.price_tier || 1,
          status: q.status || 'draft',
          validUntil: q.valid_until,
          lineItems: parsedLineItems,
          subtotal: q.subtotal || 0,
          discountPercent: q.discount_percent || 0,
          discountAmount: q.discount_amount || 0,
          taxPercent: q.tax_percent || 0,
          taxPercent2: q.tax_percent_2 || 0,
          taxAmount: q.tax_amount || 0,
          taxAmount2: q.tax_amount_2 || 0,
          total: q.total || 0,
          notes: q.notes || '',
          terms: q.terms || '',
          createdAt: q.created_at || new Date().toISOString(),
          updatedAt: q.updated_at || new Date().toISOString(),
          ownerId: q.created_by,
          organizationId: q.organization_id || q.organizationId || user.organization_id || '',
          readAt: q.read_at,
          _source: 'quotes'
        };
      });

      setQuotes(mappedQuotes);
      setLegacyBids(bidsResponse.bids || []);
      setContacts(loadedContacts);
      setInventoryItems(inventoryResponse.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // Convert legacy bid to Quote format for display
  const convertBidToQuote = (bid: any, loadedContacts: any[]): Quote => {
    let parsedLineItems: LineItem[] = [];
    if (bid.line_items || bid.lineItems) {
      try {
        const rawLineItemsField = bid.line_items || bid.lineItems;
        const rawLineItems = typeof rawLineItemsField === 'string' ? JSON.parse(rawLineItemsField) : rawLineItemsField;
        if (Array.isArray(rawLineItems)) {
          parsedLineItems = rawLineItems.map((item: any) => ({
            id: item.id || `line-${Math.random().toString(36).substr(2, 9)}`,
            itemId: item.itemId || item.item_id || item.product_id || '',
            itemName: item.itemName || item.item_name || item.name || item.title || item.description || '',
            sku: item.sku || item.item || '',
            description: item.description || item.desc || '',
            quantity: item.quantity || item.qty || 1,
            unitPrice: item.unitPrice ?? item.unit_price ?? item.price ?? 0,
            cost: item.cost ?? 0,
            discount: item.discount ?? 0,
            total: item.total ?? 0,
          }));
        }
      } catch (e) {
      }
    }

    const contact = loadedContacts.find((c: any) => c.id === (bid.contact_id || bid.contactId));

    return {
      id: bid.id || `bid-${Math.random()}`,
      quoteNumber: bid.id ? `BID-${bid.id.slice(0, 8)}` : `BID-UNKNOWN`,
      title: bid.projectName || bid.title || 'Untitled',
      contactId: bid.contact_id || bid.contactId || '',
      contactName: bid.clientName || bid.contact_name || contact?.name || contact?.company || 'Unknown Client',
      contactEmail: contact?.email || undefined,
      priceTier: bid.price_tier || bid.priceTier || 1,
      status: bid.status === 'sent' ? 'sent' : 
              bid.status === 'accepted' ? 'accepted' : 
              bid.status === 'rejected' ? 'rejected' : 
              bid.status === 'expired' ? 'expired' : 'draft',
      validUntil: bid.validUntil || bid.valid_until,
      lineItems: parsedLineItems,
      subtotal: bid.subtotal || 0,
      discountPercent: bid.discount_percent || bid.discountPercent || 0,
      discountAmount: bid.discount_amount || bid.discountAmount || 0,
      taxPercent: bid.tax_percent || bid.taxPercent || (bid.subtotal ? (bid.tax / bid.subtotal * 100) : 0) || 0,
      taxAmount: bid.tax_amount || bid.taxAmount || bid.tax || 0,
      total: bid.total || 0,
      notes: bid.notes,
      terms: bid.terms,
      createdAt: bid.createdAt || bid.created_at,
      updatedAt: bid.updatedAt || bid.updated_at,
      ownerId: bid.ownerId || bid.owner_id,
      organizationId: bid.organizationId || bid.organization_id || user.organization_id || '',
      readAt: bid.readAt || bid.read_at,
      _source: 'bids',
    };
  };

  // Merge quotes and legacy bids
  const allQuotes = [
    ...quotes,
    ...legacyBids.map(bid => convertBidToQuote(bid, contacts))
  ];

  // Filter quotes
  const filteredQuotes = allQuotes.filter(quote => {
    const matchesSearch = !searchTerm || 
      quote.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const dealsHelpSearchExample = allQuotes[0]?.contactName || allQuotes[0]?.title || 'Quote';

  const handleStatusChange = async (quote: Quote, newStatus: Quote['status']) => {
    try {
      if (quote._source === 'bids') {
        await bidsAPI.update(quote.id, { status: newStatus });
      } else {
        await quotesAPI.update(quote.id, { status: newStatus });
      }
      await loadData();
      toast.success('Status updated successfully');
    } catch (err: any) {
      toast.error('Failed to update status: ' + err.message);
    }
  };

  const handleEdit = (quote: Quote) => {
    setSelectedQuote(quote);
    setIsDialogOpen(true);
  };

  const calculateBidTotals = (
    items: LineItem[],
    discountPercent: number,
    taxPercent: number,
    taxPercent2: number = 0,
    manualSubtotal: number | null = null,
  ) => {
    const computedSubtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const subtotal = manualSubtotal !== null ? manualSubtotal : computedSubtotal;
    const discountAmount = subtotal * (discountPercent / 100);
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * (taxPercent / 100);
    const taxAmount2 = afterDiscount * (taxPercent2 / 100);
    const total = afterDiscount + taxAmount + taxAmount2;

    return {
      subtotal,
      discountAmount,
      taxAmount,
      taxAmount2,
      total,
    };
  };

  const handleAddLineItem = (item: LineItem) => {
    setEditFormData(prev => ({
      ...prev,
      lineItems: [...(prev.lineItems || []), item]
    }));
  };

  const handleRemoveLineItem = (id: string) => {
    setEditFormData(prev => ({
      ...prev,
      lineItems: (prev.lineItems || []).filter(item => item.id !== id)
    }));
  };

  const handleUpdateLineItem = (id: string, field: keyof LineItem, value: number) => {
    setEditFormData(prev => {
      const newLineItems = (prev.lineItems || []).map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value as any };
          // Recalculate total for this item
          const subtotal = updatedItem.quantity * updatedItem.unitPrice;
          updatedItem.total = subtotal - (subtotal * updatedItem.discount / 100);
          return updatedItem;
        }
        return item;
      });
      return { ...prev, lineItems: newLineItems };
    });
  };

  const [isRepricing, setIsRepricing] = useState(false);

  const handleReprice = async () => {
    if (!editFormData.lineItems || editFormData.lineItems.length === 0) return;
    
    setIsRepricing(true);
    try {
      const { inventoryAPI } = await import('../utils/api');
      
      const newItems = await Promise.all(editFormData.lineItems.map(async (item) => {
        // STRATEGY 1: Match by SKU (most reliable - SKUs are unique)
        let inventoryItem = item.sku ? inventoryItems.find(i => i.sku && i.sku.toLowerCase() === item.sku.toLowerCase()) : null;
        
        // STRATEGY 2: Match by itemId (fallback)
        if (!inventoryItem && item.itemId) {
          inventoryItem = inventoryItems.find(i => i.id === item.itemId);
        }
        
        // STRATEGY 3: If not found, try matching by name
        if (!inventoryItem && item.itemName) {
          inventoryItem = inventoryItems.find(inv => 
            inv.name && item.itemName && inv.name.toLowerCase().includes(item.itemName.toLowerCase())
          );
        }
        
        // STRATEGY 4: If still not found, try reverse match (item name contains inventory name)
        if (!inventoryItem && item.itemName) {
          inventoryItem = inventoryItems.find(inv => 
            inv.name && item.itemName && item.itemName.toLowerCase().includes(inv.name.toLowerCase())
          );
        }

        if (inventoryItem) {
          // get price for the selected price tier
          const tier = editFormData.priceTier || 1;
          const tierKey = `priceTier${tier}` as keyof typeof inventoryItem;
          const snakeKey = `price_tier_${tier}` as keyof typeof inventoryItem;
          
          const newUnitPrice = Number(inventoryItem[tierKey] || inventoryItem[snakeKey] || inventoryItem.price || 0);
          
          const subtotal = item.quantity * newUnitPrice;
          const newTotal = subtotal - (subtotal * (item.discount || 0) / 100);

          return {
            ...item,
            unitPrice: newUnitPrice,
            cost: inventoryItem.cost || item.cost,
            total: newTotal
          };
        }

        return item; // if couldn't find, keep as is
      }));

      setEditFormData(prev => ({
        ...prev,
        lineItems: newItems
      }));
      
      toast.success('Line items repriced successfully');
    } catch (error) {
      toast.error('Failed to reprice line items');
    } finally {
      setIsRepricing(false);
    }
  };

  const handleSave = async () => {
    try {
      const items = editFormData.lineItems || [];
      const parsedManualSubtotal = Number(editFormData.manualSubtotal || 0);
      const isManualSubtotalMode = Boolean(editFormData.useManualSubtotal);
      const hasValidManualSubtotal = Number.isFinite(parsedManualSubtotal) && parsedManualSubtotal >= 0;

      if (isManualSubtotalMode && !hasValidManualSubtotal) {
        toast.error('Please enter a valid subtotal amount.');
        return;
      }

      const totals = calculateBidTotals(
        isManualSubtotalMode ? [] : items,
        editFormData.discountPercent || 0,
        editFormData.taxPercent || 0,
        editFormData.taxPercent2 || 0,
        isManualSubtotalMode ? parsedManualSubtotal : null,
      );

      const dataToSave = {
        title: editFormData.title,
        contact_id: editFormData.contactId,
        status: editFormData.status,
        valid_until: editFormData.validUntil,
        notes: editFormData.notes,
        terms: editFormData.terms,
        price_tier: editFormData.priceTier,
        line_items: JSON.stringify(isManualSubtotalMode ? [] : items),
        subtotal: totals.subtotal,
        discount_percent: editFormData.discountPercent || 0,
        discount_amount: totals.discountAmount,
        tax_percent: editFormData.taxPercent || 0,
        tax_percent_2: editFormData.taxPercent2 || 0,
        tax_amount: totals.taxAmount,
        tax_amount_2: totals.taxAmount2,
        total: totals.total,
        owner_id: user.id
      };
      
      if (selectedQuote) {
        if (selectedQuote._source === 'bids') {
          // It's a legacy bid, save to bids API
          const { contact_id, ...bidFields } = dataToSave;
          await bidsAPI.update(selectedQuote.id, {
            ...bidFields,
            opportunity_id: dataToSave.contact_id
          });
          toast.success('Bid updated successfully');
        } else {
          await quotesAPI.update(selectedQuote.id, dataToSave);
          toast.success('Quote updated successfully');
        }
      } else {
        await quotesAPI.create(dataToSave);
        toast.success('Quote created successfully');
      }
      setIsDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Failed to save quote: ' + err.message);
    }
  };

  const handlePreview = (quote: Quote) => {
    setPreviewQuote(quote);
    setIsPreviewOpen(true);
  };

  const handleDelete = async (id: string, quote?: Quote) => {
    if (!confirm('Are you sure you want to delete this quote/bid?')) return;
    
    try {
      if (quote && quote._source === 'bids') {
        await bidsAPI.delete(id);
      } else {
        await quotesAPI.delete(id);
      }
      await loadData();
      toast.success('Deleted successfully');
    } catch (err: any) {
      toast.error('Failed to delete: ' + err.message);
    }
  };

  const handleEmail = (quote: Quote) => {
    setEmailQuote(quote);
    setIsEmailDialogOpen(true);
  };

  const handleViewAgreement = (quote: Quote) => {
    setViewingAgreement(quote);
  };

  // If viewing agreement, show subscription agreement
  if (viewingAgreement) {
    if (!orgData) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    return (
      <SubscriptionAgreement 
        organization={orgData}
        onBack={() => setViewingAgreement(null)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Deals & Quotes</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your quotes, proposals, and deals
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DealsModuleHelp
              userId={user.id}
              totalDeals={allQuotes.length}
              totalValue={allQuotes.reduce((sum, q) => sum + q.total, 0)}
              searchExample={dealsHelpSearchExample}
              onSearchExample={(query) => {
                setSearchTerm(query);
                setStatusFilter('all');
              }}
              onFilterByStatus={(status) => {
                setStatusFilter(status);
                setSearchTerm('');
              }}
              onClearFilters={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              onOpenNewQuote={() => {
                setSelectedQuote(null);
                setIsDialogOpen(true);
              }}
            />
            <Button onClick={() => { setSelectedQuote(null); setIsDialogOpen(true); }} data-tour="bids-new">
              <Plus className="h-4 w-4 mr-2" />
              New Quote
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 relative" data-tour="bids-search">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search quotes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="viewed">Viewed</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Tabs value={view} onValueChange={(v) => setView(v as 'kanban' | 'list')}>
            <TabsList>
              <TabsTrigger value="kanban">Kanban</TabsTrigger>
              <TabsTrigger value="list">List</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
          <span>{filteredQuotes.length} quotes</span>
          <span>•</span>
          <span>Total Value: ${filteredQuotes.reduce((sum, q) => sum + q.total, 0).toLocaleString()}</span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden" data-tour="bids-list">
        {view === 'kanban' ? (
          <div className="h-full overflow-auto p-6">
            {filteredQuotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <FileText className="h-12 w-12 mb-4" />
                <p className="text-lg font-medium">No bids found</p>
                <p className="text-sm">Create your first quote to get started</p>
              </div>
            ) : (
              <DealsKanban
                quotes={filteredQuotes}
                onStatusChange={handleStatusChange}
                onEdit={handleEdit}
                onPreview={handlePreview}
                onDelete={handleDelete}
                onEmail={handleEmail}
                onViewAgreement={user?.role === 'SUPERADMIN' ? handleViewAgreement : undefined}
              />
            )}
          </div>
        ) : (
          <div className="p-6 overflow-auto">
            {filteredQuotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <FileText className="h-12 w-12 mb-4" />
                <p className="text-lg font-medium">No bids found</p>
                <p className="text-sm">Create your first quote to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredQuotes.map(quote => (
                  <Card key={quote.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{quote.title}</h3>
                            <Badge variant={
                              quote.status === 'accepted' ? 'default' :
                              quote.status === 'rejected' ? 'destructive' :
                              quote.status === 'sent' ? 'secondary' :
                              'outline'
                            }>
                              {quote.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {quote.contactName || 'No Contact'}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              ${quote.total.toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {quote.validUntil && !isNaN(new Date(quote.validUntil).getTime()) ? new Date(quote.validUntil).toLocaleDateString() : ''}
                            </span>
                            <span className="font-mono text-xs">{quote.quoteNumber}</span>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {user?.role === 'SUPERADMIN' && (
                              <>
                                <DropdownMenuItem onClick={() => handleViewAgreement(quote)}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  View Agreement
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem onClick={() => handleEdit(quote)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePreview(quote)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEmail(quote)}>
                              <Send className="h-4 w-4 mr-2" />
                              {quote.status === 'sent' ? 'Resend' : 'Send Quote'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(quote.id, quote)} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Email Dialog */}
      {isEmailDialogOpen && emailQuote && (
        <EmailQuoteDialog
          quote={emailQuote}
          orgSettings={orgSettings}
          open={isEmailDialogOpen}
          onOpenChange={(open) => {
            setIsEmailDialogOpen(open);
            if (!open) setEmailQuote(null);
          }}
          onSuccess={() => {
            setIsEmailDialogOpen(false);
            if (emailQuote.status === 'draft') {
              handleStatusChange(emailQuote, 'sent');
            } else {
              loadData();
            }
            setEmailQuote(null);
          }}
        />
      )}

      {/* Preview Dialog */}
      {isPreviewOpen && previewQuote && (
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
            <DialogHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4">
              <div>
                <DialogTitle>Quote Preview</DialogTitle>
                <DialogDescription>
                  {previewQuote.quoteNumber} - {previewQuote.title}
                </DialogDescription>
              </div>
              {orgSettings?.logo_url ? (
                <img src={orgSettings.logo_url} alt="Organization Logo" className="h-12 w-12 object-contain" />
              ) : orgSettings?.organization_name ? (
                <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xl">
                  {orgSettings.organization_name.charAt(0)}
                </div>
              ) : null}
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Contact</Label>
                  <p className="font-medium">{previewQuote.contactName}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Total</Label>
                  <p className="font-medium">${previewQuote.total.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Status</Label>
                  <Badge>{previewQuote.status}</Badge>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Valid Until</Label>
                  <p className="font-medium">{previewQuote.validUntil && !isNaN(new Date(previewQuote.validUntil).getTime()) ? new Date(previewQuote.validUntil).toLocaleDateString() : ''}</p>
                </div>
              </div>
              {previewQuote.notes && (
                <div>
                  <Label className="text-sm text-muted-foreground">Notes</Label>
                  <p className="text-sm">{previewQuote.notes}</p>
                </div>
              )}
              {previewQuote.terms && (
                <div>
                  <Label className="text-sm text-muted-foreground">Terms</Label>
                  <p className="text-sm">{previewQuote.terms}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="!max-w-none w-[98vw] h-[90vh] flex flex-col bg-background p-0 border-0 shadow-2xl">
          <div className="p-6 border-b flex-shrink-0">
            <DialogHeader>
              <DialogTitle>{selectedQuote ? 'Edit Quote' : 'New Quote'}</DialogTitle>
              <DialogDescription>
                {selectedQuote ? 'Update the details of your quote.' : 'Create a new quote or bid.'}
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="p-6 overflow-y-auto flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title / Project Name</Label>
                <Input
                  id="title"
                  value={editFormData.title || ''}
                  onChange={e => setEditFormData({ ...editFormData, title: e.target.value })}
                  placeholder="e.g., Office Renovation Phase 1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">Contact</Label>
                <Select
                  value={editFormData.contactId || ''}
                  onValueChange={val => {
                    const selectedContact = contacts.find(c => c.id === val);
                    const newTier = selectedContact?.priceLevel ? priceLevelToTier(selectedContact.priceLevel) : 1;
                    setEditFormData(prev => ({ 
                      ...prev, 
                      contactId: val,
                      priceTier: newTier
                    }));
                  }}
                >
                  <SelectTrigger id="contact">
                    <SelectValue placeholder="Select a contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map(contact => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name} {contact.company ? `(${contact.company})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={editFormData.status || 'draft'}
                  onValueChange={(val: any) => setEditFormData({ ...editFormData, status: val })}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="validUntil">Valid Until</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={editFormData.validUntil || ''}
                  onChange={e => setEditFormData({ ...editFormData, validUntil: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priceTier">Pricing Tier</Label>
                <Select
                  value={String(editFormData.priceTier || '1')}
                  onValueChange={(val) => setEditFormData({ ...editFormData, priceTier: parseInt(val) })}
                >
                  <SelectTrigger id="priceTier">
                    <SelectValue placeholder="Select tier" />
                  </SelectTrigger>
                  <SelectContent>
                    {getActivePriceLevels().map(level => (
                      <SelectItem key={level} value={String(priceLevelToTier(level))}>
                        Tier {priceLevelToTier(level)} - {getPriceTierLabel(level)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Notes (Internal)</Label>
                <Textarea
                  value={editFormData.notes || ''}
                  onChange={e => setEditFormData({ ...editFormData, notes: e.target.value })}
                  placeholder="Internal notes about this quote..."
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Terms & Conditions (Visible to client)</Label>
                <Textarea
                  value={editFormData.terms || ''}
                  onChange={e => setEditFormData({ ...editFormData, terms: e.target.value })}
                  placeholder="Terms and conditions..."
                  rows={2}
                />
              </div>
            </div>
            
            {/* Line Items Section */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="manualSubtotalMode"
                  checked={Boolean(editFormData.useManualSubtotal)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    const currentItems = editFormData.lineItems || [];
                    const computedSubtotal = currentItems.reduce((sum, item) => sum + (item.total || 0), 0);

                    setEditFormData(prev => ({
                      ...prev,
                      useManualSubtotal: checked,
                      manualSubtotal: checked ? Number(prev.manualSubtotal ?? computedSubtotal) : prev.manualSubtotal,
                    }));
                  }}
                  className="w-4 h-4 rounded border-border"
                />
                <Label htmlFor="manualSubtotalMode" className="text-sm font-normal cursor-pointer">
                  Enter subtotal manually (without line items)
                </Label>
              </div>

              {editFormData.useManualSubtotal && (
                <div className="max-w-sm">
                  <Label htmlFor="manualSubtotal" className="text-sm mb-1.5 block">Subtotal Amount *</Label>
                  <Input
                    id="manualSubtotal"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editFormData.manualSubtotal ?? 0}
                    onChange={(e) => setEditFormData({ ...editFormData, manualSubtotal: Number(e.target.value) })}
                    placeholder="4000.00"
                  />
                </div>
              )}

              {!editFormData.useManualSubtotal && (
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">Line Items</h3>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleReprice}
                    disabled={isRepricing || !(editFormData.lineItems && editFormData.lineItems.length > 0)}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRepricing ? 'animate-spin' : ''}`} />
                    Reprice
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsLineItemDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </div>
              )}

              {!editFormData.useManualSubtotal && !(editFormData.lineItems && editFormData.lineItems.length > 0) ? (
                <div className="text-center py-8 bg-muted rounded-lg">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-muted-foreground">No items added yet</p>
                </div>
              ) : !editFormData.useManualSubtotal ? (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left py-2 px-4 text-xs text-muted-foreground">SKU</th>
                        <th className="text-left py-2 px-4 text-xs text-muted-foreground">Item Name</th>
                        <th className="text-right py-2 px-4 text-xs text-muted-foreground">Quote Qty</th>
                        <th className="text-right py-2 px-4 text-xs text-muted-foreground">Cost (Base)</th>
                        <th className="text-right py-2 px-4 text-xs text-muted-foreground">Tier {editFormData.priceTier || 1} Price</th>
                        <th className="text-right py-2 px-4 text-xs text-muted-foreground">Total</th>
                        <th className="w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {editFormData.lineItems.map(item => {
                        // STRATEGY 1: Match by SKU (most reliable - SKUs are unique)
                        let inventoryItem = item.sku ? inventoryItems.find(inv => inv.sku && inv.sku.toLowerCase() === item.sku.toLowerCase()) : null;
                        
                        // STRATEGY 2: Match by itemId (fallback)
                        if (!inventoryItem && item.itemId) {
                          inventoryItem = inventoryItems.find(inv => inv.id === item.itemId);
                        }
                        
                        // STRATEGY 3: If not found, try matching by name
                        if (!inventoryItem && item.itemName) {
                          inventoryItem = inventoryItems.find(inv => 
                            inv.name && item.itemName && inv.name.toLowerCase().includes(item.itemName.toLowerCase())
                          );
                        }
                        
                        // STRATEGY 4: If still not found, try reverse match (item name contains inventory name)
                        if (!inventoryItem && item.itemName) {
                          inventoryItem = inventoryItems.find(inv => 
                            inv.name && item.itemName && item.itemName.toLowerCase().includes(inv.name.toLowerCase())
                          );
                        }
                        
                        const displaySku = item.sku || inventoryItem?.sku || '';
                        const displayName = item.itemName || inventoryItem?.name || 'Unknown Item';
                        
                        // Get pricing from inventory item if available
                        const tier = editFormData.priceTier || 1;
                        const tierKey = `priceTier${tier}` as keyof typeof inventoryItem;
                        const snakeKey = `price_tier_${tier}` as keyof typeof inventoryItem;
                        const tierPrice = inventoryItem ? Number(inventoryItem[tierKey] || inventoryItem[snakeKey] || item.unitPrice || 0) : Number(item.unitPrice || 0);
                        const baseCost = inventoryItem?.cost || item.cost || 0;

                        return (
                        <tr key={item.id} className="border-t hover:bg-muted">
                          <td className="py-2 px-4">
                            <p className="text-sm font-mono text-foreground">{displaySku || '-'}</p>
                          </td>
                          <td className="py-2 px-4">
                            <p className="text-sm text-foreground">{displayName}</p>
                            {item.description && item.description !== displayName && (
                              <p className="text-xs text-muted-foreground">{item.description}</p>
                            )}
                          </td>
                          <td className="py-2 px-4 text-right">
                            <p className="text-sm text-foreground">{item.quantity || 1}</p>
                          </td>
                          <td className="py-2 px-4 text-right">
                            <p className="text-sm text-foreground">${Number(baseCost || 0).toFixed(2)}</p>
                          </td>
                          <td className="py-2 px-4 text-right">
                            <p className="text-sm text-foreground">${Number(tierPrice || 0).toFixed(2)}</p>
                          </td>
                          <td className="py-2 px-4 text-right">
                            <p className="text-sm font-medium text-foreground">${(item.total || 0).toFixed(2)}</p>
                          </td>
                          <td className="py-2 px-4">
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // TODO: Open edit line item dialog
                                  toast.info('Edit line item coming soon');
                                }}
                              >
                                <Edit className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveLineItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>

            {/* Pricing */}
            {(editFormData.useManualSubtotal || (editFormData.lineItems && editFormData.lineItems.length > 0)) && (
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-medium text-foreground">Pricing</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Bid Discount (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editFormData.discountPercent || 0}
                      onChange={(e) => setEditFormData({ ...editFormData, discountPercent: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tax Rate 1 (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editFormData.taxPercent || 0}
                      onChange={(e) => setEditFormData({ ...editFormData, taxPercent: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tax Rate 2 (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editFormData.taxPercent2 || 0}
                      onChange={(e) => setEditFormData({ ...editFormData, taxPercent2: Number(e.target.value) })}
                    />
                  </div>
                </div>

                {/* Bid Summary */}
                {(() => {
                  const manualSubtotal = Number(editFormData.manualSubtotal || 0);
                  const editTotals = calculateBidTotals(
                    editFormData.useManualSubtotal ? [] : (editFormData.lineItems || []),
                    editFormData.discountPercent || 0, 
                    editFormData.taxPercent || 0, 
                    editFormData.taxPercent2 || 0,
                    editFormData.useManualSubtotal ? manualSubtotal : null,
                  );
                  return (
                    <div className="bg-muted rounded-lg p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span className="text-foreground">
                            ${editTotals.subtotal.toFixed(2)}
                          </span>
                        </div>
                        {(editFormData.discountPercent || 0) > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Discount ({editFormData.discountPercent}%):</span>
                            <span className="text-red-600">
                              -${editTotals.discountAmount.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {(editFormData.taxPercent || 0) > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Tax 1 ({editFormData.taxPercent}%):</span>
                            <span className="text-foreground">
                              ${editTotals.taxAmount.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {(editFormData.taxPercent2 || 0) > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Tax 2 ({editFormData.taxPercent2}%):</span>
                            <span className="text-foreground">
                              ${editTotals.taxAmount2.toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between pt-2 border-t border-border">
                          <span className="text-foreground font-medium">Total:</span>
                          <span className="text-xl font-bold text-foreground">
                            ${editTotals.total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          <div className="p-6 border-t flex-shrink-0 bg-muted">
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>
                {selectedQuote ? 'Save Changes' : 'Create Quote'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Line Items Dialog */}
      <BidLineItems
        isOpen={isLineItemDialogOpen}
        onClose={() => setIsLineItemDialogOpen(false)}
        inventoryItems={inventoryItems}
        currentItems={editFormData.lineItems || []}
        onAddItem={handleAddLineItem}
        priceTier={editFormData.priceTier || 1}
      />
    </div>
  );
}