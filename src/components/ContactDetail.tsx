import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { getGlobalTaxRate, getGlobalTaxRate2, priceLevelToTier, getPriceTierLabel, getDefaultQuoteTerms } from '../lib/global-settings';
import { useDebounce } from '../utils/useDebounce';
import { advancedSearch } from '../utils/advanced-search';
import { 
  ArrowLeft, 
  Edit, 
  Mail, 
  Phone, 
  Building, 
  DollarSign,
  Plus,
  Trash2,
  UserPlus,
  MapPin,
  Loader2,
  MoreVertical,
  AlertCircle,
  Target,
  Calendar,
  Eye,
  TrendingUp,
  FileText,
  Upload,
  Download,
  File,
  Receipt,
  ShoppingCart,
  Search,
  RefreshCw,
  StickyNote
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { projectManagersAPI, bidsAPI, quotesAPI, inventoryAPI, settingsAPI, notesAPI, emailAPI } from '../utils/api';
import type { User } from '../App';
import { canAdd, canChange, canDelete } from '../utils/permissions';
// BidLineItems no longer needed — Add Deal now uses the same inline dialog as the Deals module
import { ProjectManagersTableSetup } from './ProjectManagersTableSetup';
import { FixContactsTable } from './FixContactsTable';
import { PortalAccessManager } from './portal/PortalAccessManager';
import { 
  getAllDocumentsClient, 
  uploadDocumentClient, 
  deleteDocumentClient,
  downloadDocumentClient,
  type Document 
} from '../utils/documents-client';
import { toast } from 'sonner@2.0.3';
import { appointmentsAPI } from '../utils/api';
import { CustomerModuleHelp } from './CustomerModuleHelp';
import { buildServerFunctionUrl } from '../utils/server-function-url';
import { getServerHeaders } from '../utils/server-headers';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: string;
  priceLevel: string;
  createdAt: string;
  legacyNumber?: string;
  accountOwnerNumber?: string;
  ptdSales?: number;
  ptdGpPercent?: number;
  ytdSales?: number;
  ytdGpPercent?: number;
  lyrSales?: number;
  lyrGpPercent?: number;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  notes?: string;
  tags?: string[];
  title?: string;
  customFields?: Record<string, any>;
}

interface ProjectManager {
  id: string;
  customerId: string;
  name: string;
  email: string;
  phone: string;
  mailingAddress: string;
  createdAt: string;
  updatedAt: string;
}

interface Opportunity {
  id: string;
  title: string;
  description: string;
  customerId: string;
  status: 'open' | 'in_progress' | 'won' | 'lost';
  value: number;
  expectedCloseDate: string;
  createdAt: string;
  updatedAt: string;
}

interface Bid {
  id: string;
  title: string;
  opportunity_id: string;
  amount: number;
  status: string;
  valid_until: string;
  notes?: string;
  terms?: string;
  created_at: string;
  project_managers?: { id: string; name: string };
  line_items?: string | LineItem[]; // Can be JSON string from DB or parsed array
  subtotal?: number;
  discount_percent?: number;
  discount_amount?: number;
  tax_percent?: number;
  tax_percent_2?: number;
  tax_amount?: number;
  tax_amount_2?: number;
  total?: number;
  _source?: 'bids' | 'quotes'; // Tracks which table the record came from
}

interface LineItem {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  description?: string;
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
  priceTier2?: number;
  priceTier3?: number;
  priceTier4?: number;
  priceTier5?: number;
  price_tier_1: number;
  status?: string;
}

interface ContactDetailProps {
  contact: Contact;
  user: User;
  onBack: () => void;
  onEdit: (contact: Contact) => void;
  totalContacts?: number;
  onSearchExample?: (query: string) => void;
  onFilterByStatus?: (status: 'Active' | 'Prospect' | 'Inactive') => void;
  onClearFilters?: () => void;
  onOpenAddContact?: () => void;
}

export function ContactDetail({
  contact,
  user,
  onBack,
  onEdit,
  totalContacts = 1,
  onSearchExample,
  onFilterByStatus,
  onClearFilters,
  onOpenAddContact,
}: ContactDetailProps) {
  const [projectManagers, setProjectManagers] = useState<ProjectManager[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddPMDialogOpen, setIsAddPMDialogOpen] = useState(false);
  const [isEditPMDialogOpen, setIsEditPMDialogOpen] = useState(false);
  const [editingPM, setEditingPM] = useState<ProjectManager | null>(null);
  const [tableNotFound, setTableNotFound] = useState(false);
  const [newPM, setNewPM] = useState({
    name: '',
    email: '',
    phone: '',
    mailingAddress: '',
  });
  const [documents, setDocuments] = useState<Document[]>([]);
  const [linkedNotes, setLinkedNotes] = useState<any[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [linkedAppointments, setLinkedAppointments] = useState<any[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const emailEditorRef = useRef<HTMLDivElement | null>(null);
  const [isComposeEmailOpen, setIsComposeEmailOpen] = useState(false);
  const [composeEmailTo, setComposeEmailTo] = useState('');
  const [composeEmailSubject, setComposeEmailSubject] = useState('');
  const [composeEmailBody, setComposeEmailBody] = useState('');
  const [selectedEmailQuoteId, setSelectedEmailQuoteId] = useState('none');
  const [emailAccounts, setEmailAccounts] = useState<any[]>([]);
  const [selectedEmailAccount, setSelectedEmailAccount] = useState('');
  const [isLoadingEmailAccounts, setIsLoadingEmailAccounts] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  // Bids management state
  const [isBidsDialogOpen, setIsBidsDialogOpen] = useState(false);
  const [bids, setBids] = useState<Bid[]>([]);
  const [isLoadingBids, setIsLoadingBids] = useState(false);
  const [isAddBidDialogOpen, setIsAddBidDialogOpen] = useState(false);
  const [isEditBidDialogOpen, setIsEditBidDialogOpen] = useState(false);
  const [editingBid, setEditingBid] = useState<Bid | null>(null);

  // Organization settings (loaded from server, like Bids.tsx)
  const [orgSettings, setOrgSettings] = useState<{
    taxRate: number;
    taxRate2: number;
    quoteTerms: string;
  }>({
    taxRate: getGlobalTaxRate(),
    taxRate2: getGlobalTaxRate2(),
    quoteTerms: getDefaultQuoteTerms(),
  });

  // ── Add Deal form state (mirrors Bids.tsx / Deals module exactly) ──
  const [dealFormData, setDealFormData] = useState({
    title: '',
    validUntil: '',
    discountPercent: 0,
    taxPercent: getGlobalTaxRate(),
    taxPercent2: getGlobalTaxRate2(),
    notes: '',
    terms: getDefaultQuoteTerms(),
  });

  // Line items and inventory state
  const [currentLineItems, setCurrentLineItems] = useState<LineItem[]>([]);
  const [editingBidLineItems, setEditingBidLineItems] = useState<LineItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [showLineItemDialog, setShowLineItemDialog] = useState(false);
  const [isEditLineItemDialogOpen, setIsEditLineItemDialogOpen] = useState(false);
  const [editingLineItemId, setEditingLineItemId] = useState<string | null>(null);
  // Edit deal still uses these states
  const [bidTaxRate, setBidTaxRate] = useState(() => {
    const globalTaxRate = getGlobalTaxRate();
    return globalTaxRate.toString();
  });
  const [bidTaxRate2, setBidTaxRate2] = useState(() => {
    const globalTaxRate2 = getGlobalTaxRate2();
    return globalTaxRate2.toString();
  });
  const [bidDiscountPercent, setBidDiscountPercent] = useState(0);
  
  // Inventory search for line items (shared by Add & Edit flows)
  const [inventorySearchQuery, setInventorySearchQuery] = useState('');
  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [lineItemQuantity, setLineItemQuantity] = useState(1);
  const [lineItemDiscount, setLineItemDiscount] = useState(0);
  const [lineItemUnitPrice, setLineItemUnitPrice] = useState(0);
  const [isSearchingInventory, setIsSearchingInventory] = useState(false);
  const addLineItemSearchInputRef = useRef<HTMLInputElement | null>(null);
  const editLineItemSearchInputRef = useRef<HTMLInputElement | null>(null);

  // 🚀 Debounce search query (200ms delay for fast typing)
  const debouncedInventorySearch = useDebounce(inventorySearchQuery, 200);

  // Use state instead of useMemo for inventory search to allow async fallback
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);

  // 🚀 Filter inventory - using advanced search + API fallback
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!debouncedInventorySearch.trim()) {
        setFilteredInventory(inventoryItems.filter(item => item.status === 'active').slice(0, 100)); // Show first 100 active items
        return;
      }
      
      setIsSearchingInventory(true);
      
      // 🚀 Use advanced search with fuzzy matching, plural handling, and multi-word support
      const searchResults = advancedSearch(inventoryItems, debouncedInventorySearch, {
        fuzzyThreshold: 0.6,      // Optimal for typo tolerance
        includeInactive: false,   // Only show active items
        minScore: 0.05,           // Low threshold to catch fuzzy matches
        maxResults: 100,
        sortBy: 'relevance',
      });
      
      if (searchResults.length > 0) {
        setFilteredInventory(searchResults.map(result => result.item));
        setIsSearchingInventory(false);
      } else {
        // Fallback to API search if not found locally
        try {
          const { inventoryAPI } = await import('../utils/api');
          const results = await inventoryAPI.search({ search: debouncedInventorySearch });
          if (results && results.items) {
            const apiItems = results.items.slice(0, 100);
            setFilteredInventory(apiItems);
            // Append to local inventory cache so `.find()` works later
            setInventoryItems(prev => {
              const newItems = [...prev];
              apiItems.forEach((item: any) => {
                if (!newItems.find(i => i.id === item.id)) newItems.push(item);
              });
              return newItems;
            });
          } else {
            setFilteredInventory([]);
          }
        } catch (err) {
          // Search failed
          setFilteredInventory([]);
        } finally {
          setIsSearchingInventory(false);
        }
      }
    };
    
    fetchSearchResults();
  }, [debouncedInventorySearch, inventoryItems]);

  // Auto-populate unit price when inventory item is selected (uses contact's price level)
  useEffect(() => {
    if (selectedInventoryId) {
      const item = inventoryItems.find(i => i.id === selectedInventoryId);
      if (item) {
        const priceTier = priceLevelToTier(contact.priceLevel || getPriceTierLabel(1));
        const price = getPriceForTier(item, priceTier);
        setLineItemUnitPrice(price);
      }
    }
  }, [selectedInventoryId, contact.priceLevel, inventoryItems]);

  // Check if contact has a valid UUID
  useEffect(() => {
    loadProjectManagers();
    loadDocuments();
    loadInventoryItems();
    loadBids();
    loadOrgSettings();
    loadLinkedNotes();
    loadLinkedAppointments();
  }, [contact.id]);

  // Initialize line item dialog (same as Bids.tsx)
  useEffect(() => {
    if (showLineItemDialog) {
      if (!editingLineItemId) {
        setInventorySearchQuery('');
      }
    } else {
      setEditingLineItemId(null);
    }
  }, [showLineItemDialog, editingLineItemId]);

  useEffect(() => {
    if (!showLineItemDialog) return;

    const frame = requestAnimationFrame(() => {
      addLineItemSearchInputRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [showLineItemDialog]);

  useEffect(() => {
    if (!isEditLineItemDialogOpen) return;

    const frame = requestAnimationFrame(() => {
      editLineItemSearchInputRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [isEditLineItemDialogOpen]);

  const loadProjectManagers = async () => {
    try {
      setIsLoading(true);
      setTableNotFound(false);
      const { projectManagers: pms } = await projectManagersAPI.getByCustomer(contact.id);
      setProjectManagers(pms || []);
    } catch (error: any) {
      // Failed to load project managers
      // Check if it's a table not found error
      if (error?.code === 'PGRST205' || error?.code === '42P01' || 
          error?.message?.includes('Could not find the table')) {
        setTableNotFound(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      const { documents: docs } = await getAllDocumentsClient(contact.id);
      setDocuments(docs || []);
    } catch (error: any) {
      // Failed to load documents
    }
  };

  const loadInventoryItems = async () => {
    try {
      const { items } = await inventoryAPI.getAll();
      // Map all 5 price tiers from snake_case (price_tier_N) to camelCase (priceTierN)
      const mappedItems = items.map((item: any) => ({
        ...item,
        priceTier1: item.price_tier_1 || item.priceTier1 || 0,
        priceTier2: item.price_tier_2 || item.priceTier2 || 0,
        priceTier3: item.price_tier_3 || item.priceTier3 || 0,
        priceTier4: item.price_tier_4 || item.priceTier4 || 0,
        priceTier5: item.price_tier_5 || item.priceTier5 || 0,
      }));
      setInventoryItems(mappedItems);
    } catch (error: any) {
      // Failed to load inventory items
    }
  };

  const loadOrgSettings = async () => {
    const orgId = user.organizationId || user.organization_id;
    if (!orgId) return;
    try {
      const orgSettingsData = await settingsAPI.getOrganizationSettings(orgId);
      if (orgSettingsData) {
        setOrgSettings({
          taxRate: orgSettingsData.tax_rate || 0,
          taxRate2: orgSettingsData.tax_rate_2 || 0,
          quoteTerms: orgSettingsData.quote_terms || 'Payment due within 30 days. All prices in USD.',
        });
      }
    } catch (error) {
      // Failed to load org settings, using localStorage fallback
    }
  };

  const loadLinkedNotes = async () => {
    try {
      setIsLoadingNotes(true);
      const { notes } = await notesAPI.getByContact(contact.id);
      setLinkedNotes(notes || []);
    } catch (error) {
      // Failed to load linked notes
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const loadLinkedAppointments = async () => {
    try {
      setIsLoadingAppointments(true);
      const { appointments } = await appointmentsAPI.getAll();
      const linked = (appointments || []).filter((a: any) => a.contact_id === contact.id);
      setLinkedAppointments(linked);
    } catch (error) {
      // Failed to load linked appointments
    } finally {
      setIsLoadingAppointments(false);
    }
  };

  const handleAddProjectManager = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { projectManager } = await projectManagersAPI.create({
        ...newPM,
        customerId: contact.id,
      });
      setProjectManagers([...projectManagers, projectManager]);
      setNewPM({ name: '', email: '', phone: '', mailingAddress: '' });
      setIsAddPMDialogOpen(false);
    } catch (error) {
      // Failed to create project manager
      alert('Failed to create project manager. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditProjectManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPM) return;
    setIsSaving(true);

    try {
      const { projectManager } = await projectManagersAPI.update(editingPM.id, {
        name: editingPM.name,
        email: editingPM.email,
        phone: editingPM.phone,
        mailingAddress: editingPM.mailingAddress,
      });
      setProjectManagers(projectManagers.map(pm => (pm.id === projectManager.id ? projectManager : pm)));
      setEditingPM(null);
      setIsEditPMDialogOpen(false);
    } catch (error) {
      // Failed to update project manager
      alert('Failed to update project manager. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProjectManager = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project manager?')) return;

    try {
      await projectManagersAPI.delete(id);
      setProjectManagers(projectManagers.filter(pm => pm.id !== id));
    } catch (error) {
      // Failed to delete project manager
      alert('Failed to delete project manager. Please try again.');
    }
  };

  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { document } = await uploadDocumentClient(file, {
        contactId: contact.id,
        contactName: `${contact.name} - ${contact.company}`,
      });
      setDocuments([...documents, document]);
      toast.success('Document uploaded successfully');
      // Reset file input
      e.target.value = '';
    } catch (error) {
      // Failed to upload document
      toast.error('Failed to upload document');
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await deleteDocumentClient(id);
      setDocuments(documents.filter(doc => doc.id !== id));
      toast.success('Document deleted successfully');
    } catch (error) {
      // Failed to delete document
      toast.error('Failed to delete document');
    }
  };

  const handleDownloadDocument = async (filePath: string, fileName: string) => {
    try {
      const blob = await downloadDocumentClient(filePath);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Document downloaded successfully');
    } catch (error) {
      // Failed to download document
      toast.error('Failed to download document');
    }
  };

  const loadBids = async () => {
    try {
      setIsLoadingBids(true);
      // Loading bids for contact
      
      // Load both bids and quotes
      const [bidsResult, quotesResult] = await Promise.all([
        bidsAPI.getAll(),
        quotesAPI.getAll(),
      ]);
      
      const bidList = (bidsResult.bids || []).filter((b: any) => 
        b.contactId === contact.id || b.contact_id === contact.id || b.customerId === contact.id
      );
      
      const allQuotes = quotesResult.quotes || [];
      
      // Raw bid data and quotes loaded
      
      // Filter quotes by contact_id matching this contact
      const quotesForContact = allQuotes.filter((q: any) => 
        q.contact_id === contact?.id || q.contactId === contact?.id
      );
      
      // Quotes filtered for this contact
      
      // Parse line items for each bid
      const parsedBids = (bidList || []).map((bid: Bid) => {
        let parsedLineItems: LineItem[] = [];
        if (bid.line_items) {
          try {
            let rawLineItems = [];
            if (typeof bid.line_items === 'string') {
              rawLineItems = JSON.parse(bid.line_items);
            } else if (Array.isArray(bid.line_items)) {
              rawLineItems = bid.line_items;
            }
            // Ensure cost field exists and handle snake_case to camelCase mapping for older records
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
          } catch (error) {
            // Failed to parse line items for bid
          }
        }
        return {
          ...bid,
          line_items: parsedLineItems,
          _source: 'bids', // Tag to identify source
        };
      });
      
      // Parse line items for each quote and convert to bid format
      const parsedQuotes = quotesForContact.map((quote: any) => {
        let parsedLineItems: LineItem[] = [];
        const rawLineItemsField = quote.lineItems || quote.line_items || quote.items;
        if (rawLineItemsField) {
          try {
            let rawLineItems = [];
            if (typeof rawLineItemsField === 'string') {
              rawLineItems = JSON.parse(rawLineItemsField);
            } else if (Array.isArray(rawLineItemsField)) {
              rawLineItems = rawLineItemsField;
            }
            // Ensure cost field exists and handle snake_case to camelCase mapping for older records
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
          } catch (error) {
            // Failed to parse line items for quote
          }
        }
        
        // Convert quote to bid format for display consistency
        return {
          id: quote.id,
          title: quote.title || 'Quote',
          opportunity_id: '',
          amount: quote.total || quote.amount || 0,
          status: quote.status || 'draft',
          valid_until: quote.valid_until || quote.validUntil || new Date().toISOString(),
          notes: quote.notes || '',
          created_at: quote.created_at || quote.createdAt,
          line_items: parsedLineItems,
          subtotal: quote.subtotal || 0,
          discount_percent: quote.discount_percent || quote.discountPercent || 0,
          discount_amount: quote.discount_amount || quote.discountAmount || 0,
          tax_percent: quote.tax_percent || quote.taxPercent || 0,
          tax_amount: quote.tax_amount || quote.taxAmount || 0,
          _source: 'quotes', // Tag to identify source
        };
      });
      
      // Merge bids and quotes
      const allBids = [...parsedBids, ...parsedQuotes].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      // Total merged bids + quotes loaded
      setBids(allBids);
    } catch (error: any) {
      // Failed to load bids
    } finally {
      setIsLoadingBids(false);
    }
  };

  // Helper functions for line items management
  const getPriceForTier = (item: InventoryItem | undefined, tier: number = 1): number => {
    if (!item) return 0;
    // Try priceTier1, priceTier2, etc.
    const tierKey = `priceTier${tier}` as keyof InventoryItem;
    if (tierKey in item) {
      return Number(item[tierKey]) || 0;
    }
    // Fallback to price_tier_1
    return item.price_tier_1 || item.priceTier1 || 0;
  };

  const calculateLineItemTotal = (quantity: number, unitPrice: number, discount: number): number => {
    const subtotal = quantity * unitPrice;
    return subtotal - (subtotal * discount / 100);
  };

  const calculateBidTotals = (items: LineItem[], discountPercent: number, taxPercent: number, taxPercent2: number = 0) => {
    const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
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

  // ── handleSaveDeal: Copied from Bids.tsx handleSave (create-only path) ──
  const handleSaveDeal = async () => {
    if (!dealFormData.title) {
      toast.error('Please fill in the deal title');
      return;
    }
    if (currentLineItems.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }

    setIsSaving(true);
    try {
      const totals = calculateBidTotals(
        currentLineItems,
        dealFormData.discountPercent,
        dealFormData.taxPercent,
        dealFormData.taxPercent2 || 0
      );

      // Generate quote number (same as Bids.tsx)
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const quoteNumber = `QT-${year}${month}-${random}`;

      // Map to snake_case for database (exact same payload as Bids.tsx)
      const quoteData = {
        quote_number: quoteNumber,
        title: dealFormData.title,
        contact_id: contact.id,
        contact_name: contact.name,
        price_tier: priceLevelToTier(contact.priceLevel || getPriceTierLabel(1)),
        status: 'draft' as const,
        valid_until: dealFormData.validUntil,
        line_items: JSON.stringify(currentLineItems),
        subtotal: totals.subtotal,
        discount_percent: dealFormData.discountPercent,
        discount_amount: totals.discountAmount,
        tax_percent: dealFormData.taxPercent,
        tax_percent_2: dealFormData.taxPercent2 || 0,
        tax_amount: totals.taxAmount,
        tax_amount_2: totals.taxAmount2 || 0,
        total: totals.total,
        notes: dealFormData.notes,
        terms: dealFormData.terms,
      };

      await quotesAPI.create(quoteData);
      toast.success('Deal created successfully');

      setIsAddBidDialogOpen(false);
      await loadBids();
    } catch (error) {
      // Failed to save deal
      toast.error('Failed to save deal');
    } finally {
      setIsSaving(false);
    }
  };

  // ── handleOpenAddDeal: reset form when opening (same as Bids.tsx handleOpenDialog create path) ──
  const handleOpenAddDeal = () => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    setDealFormData({
      title: '',
      validUntil: defaultDate.toISOString().split('T')[0],
      discountPercent: 0,
      taxPercent: orgSettings.taxRate,
      taxPercent2: orgSettings.taxRate2,
      notes: '',
      terms: orgSettings.quoteTerms,
    });
    setCurrentLineItems([]);
    setIsAddBidDialogOpen(true);
  };

  // ── Line item handlers (copied from Bids.tsx) ──
  const handleEditLineItem = (item: LineItem) => {
    setEditingLineItemId(item.id);
    setSelectedInventoryId(item.itemId);
    setLineItemQuantity(item.quantity);
    setLineItemUnitPrice(item.unitPrice);
    setInventorySearchQuery(item.itemName);
    setShowLineItemDialog(true);
  };

  const handleAddLineItem = () => {
    if (!selectedInventoryId) {
      toast.error('Please select a product');
      return;
    }

    const item = filteredInventory.find(i => i.id === selectedInventoryId) ||
                 inventoryItems.find(i => i.id === selectedInventoryId);
    if (!item) {
      toast.error('Product not found in inventory');
      return;
    }

    const total = lineItemQuantity * lineItemUnitPrice;

    if (editingLineItemId) {
      const updatedItems = currentLineItems.map(line => {
        if (line.id === editingLineItemId) {
          return {
            ...line,
            itemId: item.id,
            itemName: item.name,
            sku: item.sku,
            description: item.description,
            quantity: lineItemQuantity,
            unitPrice: lineItemUnitPrice,
            cost: item.cost || 0,
            total: total,
          };
        }
        return line;
      });
      setCurrentLineItems(updatedItems);
      toast.success('Item updated');
    } else {
      const lineItem: LineItem = {
        id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        itemId: item.id,
        itemName: item.name,
        sku: item.sku,
        description: item.description,
        quantity: lineItemQuantity,
        unitPrice: lineItemUnitPrice,
        cost: item.cost || 0,
        discount: 0,
        total,
      };
      setCurrentLineItems([...currentLineItems, lineItem]);
      toast.success('Item added to deal');
    }

    setSelectedInventoryId('');
    setLineItemQuantity(1);
    setLineItemUnitPrice(0);
    setEditingLineItemId(null);
    setShowLineItemDialog(false);
  };

  const handleRemoveLineItem = (id: string) => {
    setCurrentLineItems(currentLineItems.filter(item => item.id !== id));
  };

  // ── Refresh Prices (used for new deals) ──
  const handleRefreshPrices = async () => {
    if (!currentLineItems || currentLineItems.length === 0) return;
    
    setIsRepricing(true);
    try {
      const { inventoryAPI } = await import('../utils/api');
      
      const newItems = await Promise.all(currentLineItems.map(async (item) => {
        // STRATEGY 1: Match by SKU (most reliable - SKUs are unique)
        let inventoryItem = item.sku ? inventoryItems.find(i => i.sku && i.sku.toLowerCase() === item.sku.toLowerCase()) : null;
        
        // STRATEGY 2: Match by itemId (fallback)
        if (!inventoryItem && item.itemId) {
          inventoryItem = inventoryItems.find(i => i.id === item.itemId);
        }
        
        // STRATEGY 3: If not found locally, try API search by SKU
        if (!inventoryItem && item.sku) {
          const results = await inventoryAPI.search({ search: item.sku });
          if (results && results.items && results.items.length > 0) {
            inventoryItem = results.items.find((i: any) => i.sku && i.sku.toLowerCase() === item.sku.toLowerCase()) || results.items[0];
          }
        }

        if (inventoryItem) {
          // Matched line item to inventory for repricing
          // get price for the selected price tier
          const tier = priceLevelToTier(contact.priceLevel || getPriceTierLabel(1));
          
          const newUnitPrice = getPriceForTier(inventoryItem, tier);
          
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

      setCurrentLineItems(newItems);
      
      toast.success('Line items repriced successfully');
    } catch (error) {
      // Error repricing line items
      toast.error('Failed to reprice line items');
    } finally {
      setIsRepricing(false);
    }
  };

  // Handlers for editing bid line items
  const handleAddEditLineItem = () => {
    if (!selectedInventoryId) {
      alert('Please select a product');
      return;
    }

    const item = inventoryItems.find(i => i.id === selectedInventoryId);
    if (!item) {
      alert('Product not found');
      return;
    }

    // Use the custom unit price (already set via useEffect or manually edited)
    const total = calculateLineItemTotal(lineItemQuantity, lineItemUnitPrice, lineItemDiscount);

    const lineItem: LineItem = {
      id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      itemId: item.id,
      itemName: item.name,
      sku: item.sku,
      quantity: lineItemQuantity,
      unitPrice: lineItemUnitPrice, // Use editable unit price
      cost: item.cost || 0, // Include cost from inventory
      discount: lineItemDiscount,
      total,
    };

    setEditingBidLineItems([...editingBidLineItems, lineItem]);
    setSelectedInventoryId('');
    setLineItemQuantity(1);
    setLineItemDiscount(0);
    setLineItemUnitPrice(0);
    setIsEditLineItemDialogOpen(false);
  };

  const handleRemoveEditLineItem = (id: string) => {
    setEditingBidLineItems(editingBidLineItems.filter(item => item.id !== id));
  };

  const handleUpdateEditLineItem = (id: string, field: keyof LineItem, value: number) => {
    setEditingBidLineItems(prev => prev.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value as never };
        // Recalculate total for this item
        const subtotal = updatedItem.quantity * updatedItem.unitPrice;
        updatedItem.total = subtotal - (subtotal * updatedItem.discount / 100);
        return updatedItem;
      }
      return item;
    }));
  };

  const [isRepricing, setIsRepricing] = useState(false);

  const handleRepriceEditBid = async () => {
    // Reprice button clicked
    
    if (!editingBidLineItems || editingBidLineItems.length === 0) {
      // No line items to reprice
      toast.error('No line items to reprice');
      return;
    }
    
    setIsRepricing(true);
    try {
      // Starting repricing process
      const { inventoryAPI } = await import('../utils/api');
      
      const newItems = await Promise.all(editingBidLineItems.map(async (item) => {
        // Processing item
        
        // STRATEGY 1: Match by SKU (most reliable - SKUs are unique)
        let inventoryItem = item.sku ? inventoryItems.find(i => i.sku && i.sku.toLowerCase() === item.sku.toLowerCase()) : null;
        
        // STRATEGY 2: Match by itemId (fallback)
        if (!inventoryItem && item.itemId) {
          inventoryItem = inventoryItems.find(i => i.id === item.itemId);
        }
        
        // Found in local inventory check
        
        // STRATEGY 3: If not found locally, try API search by SKU
        if (!inventoryItem && item.sku) {
          // Searching API for SKU
          const results = await inventoryAPI.search({ search: item.sku });
          if (results && results.items && results.items.length > 0) {
            inventoryItem = results.items.find((i: any) => i.sku && i.sku.toLowerCase() === item.sku.toLowerCase()) || results.items[0];
            // Found via API check
          }
        }

        if (inventoryItem) {
          // get price for the selected price tier
          const tier = priceLevelToTier(contact.priceLevel || getPriceTierLabel(1));
          // Price tier determined
          
          const newUnitPrice = getPriceForTier(inventoryItem, tier);
          // Price updated
          
          const subtotal = item.quantity * newUnitPrice;
          const newTotal = subtotal - (subtotal * (item.discount || 0) / 100);

          return {
            ...item,
            unitPrice: newUnitPrice,
            cost: inventoryItem.cost || item.cost,
            total: newTotal
          };
        }

        // Could not find inventory item, keeping as is
        return item; // if couldn't find, keep as is
      }));

      // Repriced items ready
      setEditingBidLineItems(newItems);
      
      toast.success('Line items repriced successfully');
    } catch (error) {
      // Error repricing line items
      toast.error('Failed to reprice line items');
    } finally {
      setIsRepricing(false);
    }
  };

  const handleEditBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBid) return;
    setIsSaving(true);

    try {
      // Calculate totals from line items
      const totals = calculateBidTotals(
        editingBidLineItems,
        bidDiscountPercent,
        parseFloat(bidTaxRate) || 0,
        parseFloat(bidTaxRate2) || 0
      );

      // Use the same routing pattern as Bids.tsx — check _source to determine table
      const source = editingBid._source;
      const taxRate = parseFloat(bidTaxRate) || 0;
      const taxRate2 = parseFloat(bidTaxRate2) || 0;

      // Build snake_case payload matching the Deals module pattern
      const quoteData: Record<string, any> = {
        title: editingBid.title,
        contact_id: contact.id,
        contact_name: contact.name,
        price_tier: priceLevelToTier(contact.priceLevel || getPriceTierLabel(1)),
        status: editingBid.status,
        valid_until: editingBid.valid_until,
        line_items: JSON.stringify(editingBidLineItems),
        subtotal: totals.subtotal,
        discount_percent: bidDiscountPercent,
        discount_amount: totals.discountAmount,
        tax_percent: taxRate,
        tax_percent_2: taxRate2,
        tax_amount: totals.taxAmount,
        tax_amount_2: totals.taxAmount2,
        total: totals.total,
        notes: editingBid.notes || '',
        terms: editingBid.terms || '',
      };

      if (source === 'bids') {
        // For bids table, swap contact_id to opportunity_id (bids table schema)
        const { contact_id, contact_name, ...bidFields } = quoteData;
        await bidsAPI.update(editingBid.id, {
          ...bidFields,
          opportunity_id: contact.id,
        });
      } else {
        // Quotes table — use quotesAPI (same as Deals module)
        await quotesAPI.update(editingBid.id, quoteData);
      }
      
      // Reload bids from server to ensure we have the latest data
      await loadBids();
      
      setEditingBid(null);
      setEditingBidLineItems([]);
      setIsEditBidDialogOpen(false);
      toast.success('Deal updated successfully');
    } catch (error) {
      // Failed to update deal
      toast.error('Failed to update deal. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBid = async (id: string) => {
    if (!confirm('Are you sure you want to delete this deal?')) return;

    try {
      // Check _source to route to correct API (same pattern as Bids.tsx handleDelete)
      const bidToDelete = bids.find(b => b.id === id);
      if (bidToDelete && bidToDelete._source === 'quotes') {
        await quotesAPI.delete(id);
      } else {
        await bidsAPI.delete(id);
      }
      // Reload bids from server to ensure we have the latest data
      await loadBids();
      toast.success('Deal deleted successfully');
    } catch (error) {
      // Failed to delete deal
      toast.error('Failed to delete deal. Please try again.');
    }
  };

  const userDisplayName = (user as any)?.name || user.email || 'Team member';
  const contactType = contact.status === 'Prospect' ? 'Lead' : 'Customer';
  const totalDealValue = bids.reduce((sum, bid) => sum + Number(bid.amount || bid.total || 0), 0);
  const contactTitle =
    contact.title ||
    (typeof contact.customFields?.title === 'string' ? contact.customFields.title : '') ||
    contact.tags?.find((tag) => /ceo|coo|cfo|cio|director|manager|owner/i.test(tag)) ||
    'Primary Contact';

  const normalizeDisplayText = (value?: string) => {
    if (!value) return '—';
    const trimmed = value.trim();
    if (!trimmed) return '—';

    const isMostlyUppercase = /[A-Z]/.test(trimmed) && !/[a-z]/.test(trimmed);
    if (!isMostlyUppercase) return trimmed;

    return trimmed
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const displayName = normalizeDisplayText(contact.name);
  const displayCompany = normalizeDisplayText(contact.company || 'Customer workspace overview');
  const displayTitle = normalizeDisplayText(contactTitle);
  const displayEmail = contact.email?.trim() ? contact.email.trim().toLowerCase() : '—';
  const displayPriceLevel = normalizeDisplayText(
    contact.priceLevel?.replace(/tier/gi, 'Tier ') || getPriceTierLabel(1)
  );
  const companyDomain = contact.email?.includes('@') ? `https://${contact.email.split('@')[1].toLowerCase()}` : '—';

  const formatMoney = (value?: number) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDateTime = (value?: string) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const activityFeed = [
    {
      id: `created-${contact.id}`,
      kind: 'created',
      heading: 'Item created',
      date: contact.createdAt,
      title: `${userDisplayName} added ${contact.name}`,
      body: contact.company || 'Customer record created',
    },
    ...linkedAppointments.map((apt: any) => ({
      id: `apt-${apt.id}`,
      kind: 'appointment',
      heading: apt.title || 'Meeting',
      date: apt.start_time,
      title: apt.title || 'Scheduled appointment',
      body: apt.description || apt.location || 'Follow-up activity scheduled.',
    })),
    ...linkedNotes.map((note: any) => ({
      id: `note-${note.id}`,
      kind: 'note',
      heading: note.title || 'Note',
      date: note.created_at,
      title: note.title || 'Linked note',
      body: note.content || 'No note content available.',
    })),
    ...bids.slice(0, 3).map((bid) => ({
      id: `deal-${bid.id}`,
      kind: 'deal',
      heading: bid._source === 'quotes' ? 'Quote' : 'Deal',
      date: bid.created_at,
      title: bid.title,
      body: `${formatMoney(Number(bid.amount || bid.total || 0))} • ${(bid.status || 'draft').toUpperCase()}`,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  const hasFinancialData =
    contact.ptdSales != null ||
    contact.ptdGpPercent != null ||
    contact.ytdSales != null ||
    contact.ytdGpPercent != null ||
    contact.lyrSales != null ||
    contact.lyrGpPercent != null;

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const loadEmailAccounts = async () => {
    setIsLoadingEmailAccounts(true);
    try {
      const { accounts } = await emailAPI.getAccounts();
      const availableAccounts = accounts || [];
      setEmailAccounts(availableAccounts);

      if (availableAccounts.length > 0) {
        const persisted = localStorage.getItem('prospaces_selected_email_account') || '';
        const preferred = availableAccounts.find((account: any) => account.id === persisted);
        setSelectedEmailAccount(preferred ? preferred.id : availableAccounts[0].id);
      } else {
        setSelectedEmailAccount('');
      }
    } catch (error) {
      toast.error('Unable to load Email module accounts.');
      setEmailAccounts([]);
      setSelectedEmailAccount('');
    } finally {
      setIsLoadingEmailAccounts(false);
    }
  };

  const handleSendEmail = async () => {
    if (!contact.email?.trim()) {
      toast.error('This contact does not have an email address yet.');
      return;
    }

    const defaultBody = `<p></p>`;
    setComposeEmailTo(contact.email.trim());
    setComposeEmailSubject(`Hello ${displayName}`);
    setComposeEmailBody(defaultBody);
    setSelectedEmailQuoteId('none');
    setIsComposeEmailOpen(true);
    await loadEmailAccounts();

    requestAnimationFrame(() => {
      if (emailEditorRef.current) {
        emailEditorRef.current.innerHTML = defaultBody;
      }
    });
  };

  const syncComposeEmailBody = () => {
    if (emailEditorRef.current) {
      setComposeEmailBody(emailEditorRef.current.innerHTML);
    }
  };

  const applyEmailFormat = (command: 'bold' | 'italic' | 'underline' | 'insertUnorderedList') => {
    emailEditorRef.current?.focus();
    document.execCommand(command, false);
    syncComposeEmailBody();
  };

  const handleAttachQuoteToEmail = (quoteId: string) => {
    setSelectedEmailQuoteId(quoteId);

    if (quoteId === 'none') {
      return;
    }

    const selectedQuote = bids.find((bid) => bid.id === quoteId);
    if (!selectedQuote) {
      return;
    }

    const quoteSummary = `<p><strong>Attached Quote:</strong> ${selectedQuote.title} — ${formatMoney(Number(selectedQuote.amount || selectedQuote.total || 0))}</p>`;
    emailEditorRef.current?.focus();
    document.execCommand('insertHTML', false, quoteSummary);
    syncComposeEmailBody();
  };

  const handleCreateEmailDraft = async () => {
    if (!selectedEmailAccount) {
      toast.error('Please connect or select an email account from the Email module first.');
      return;
    }

    if (!composeEmailTo.trim()) {
      toast.error('Please enter a recipient email address.');
      return;
    }

    if (!composeEmailSubject.trim()) {
      toast.error('Please enter a subject.');
      return;
    }

    const editorHtml = emailEditorRef.current?.innerHTML || composeEmailBody;
    const selectedQuote = bids.find((bid) => bid.id === selectedEmailQuoteId);
    const quoteHtml = selectedQuote
      ? `<hr/><p><strong>Attached Quote:</strong> ${selectedQuote.title} — ${formatMoney(Number(selectedQuote.amount || selectedQuote.total || 0))}</p>`
      : '';

    setIsSendingEmail(true);
    try {
      const headers = await getServerHeaders();
      const response = await fetch(buildServerFunctionUrl('/email-send'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          accountId: selectedEmailAccount,
          to: composeEmailTo.trim(),
          subject: composeEmailSubject.trim(),
          body: `${editorHtml}${quoteHtml}`,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.error || `Send failed with status ${response.status}`);
      }

      toast.success('Email sent successfully.');
      setIsComposeEmailOpen(false);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to send email using the Email module setup.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleCallContact = () => {
    if (!contact.phone?.trim()) {
      toast.error('This contact does not have a phone number yet.');
      return;
    }
    window.location.href = `tel:${contact.phone.trim()}`;
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
      <div className="mx-auto max-w-[1720px] space-y-4">
        <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6 lg:px-8">
            <div>
              <Button
                variant="ghost"
                onClick={onBack}
                className="mb-3 -ml-2 h-9 px-2 text-[15px] font-medium text-slate-600 hover:bg-slate-100"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Contacts
              </Button>
              <h1 className="text-[24px] font-semibold tracking-tight text-slate-800 sm:text-[28px]">{displayName}</h1>
              <p className="mt-1 text-sm text-slate-500 sm:text-base">{displayCompany}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600">
                {bids.length} deals
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600">
                {formatMoney(totalDealValue)} value
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600">
                {contactType}
              </span>
              {onSearchExample && onFilterByStatus && onClearFilters && onOpenAddContact && (
                <CustomerModuleHelp
                  userId={user.id}
                  totalContacts={totalContacts}
                  onSearchExample={onSearchExample}
                  onFilterByStatus={onFilterByStatus}
                  onClearFilters={onClearFilters}
                  onOpenAddContact={onOpenAddContact}
                />
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-[15px] text-slate-600 sm:px-6 lg:px-8">
            <span className="mr-1 font-semibold text-slate-900">Quick Jumps:</span>
            <a href="#contact-activity" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800">Activity</a>
            <a href="#contact-overview" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800">Contact Info</a>
            {hasFinancialData && (
              <a href="#contact-financials" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800">Financials</a>
            )}
            <a href="#contact-project-managers" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800">Project Managers</a>
            <a href="#contact-deals" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800">Deals</a>
            <a href="#contact-documents" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800">Documents</a>
          </div>
        </div>

      {tableNotFound && <ProjectManagersTableSetup />}

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,2.1fr)_430px] xl:grid-cols-[minmax(0,1.85fr)_380px]">
        <div id="contact-activity" className="scroll-mt-24 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3 sm:px-5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 gap-2 px-3 text-[15px] text-slate-700">
                  <Plus className="h-4 w-4" />
                  Add activity
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem onClick={handleSendEmail}>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Email
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCallContact}>
                  <Phone className="mr-2 h-4 w-4" />
                  Call Contact
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => scrollToSection('contact-notes')}>
                  <StickyNote className="mr-2 h-4 w-4" />
                  Open Notes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => scrollToSection('contact-appointments')}>
                  <Calendar className="mr-2 h-4 w-4" />
                  View Appointments
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsAddPMDialogOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Project Manager
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleOpenAddDeal}>
                  <FileText className="mr-2 h-4 w-4" />
                  Create Deal
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => document.getElementById('document-upload')?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(contact)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Contact
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" className="h-10 gap-2 px-3 text-[15px] text-slate-700">
              <TrendingUp className="h-4 w-4" />
              Summarize
            </Button>
          </div>

          <div className="space-y-4 bg-slate-50/70 p-4 sm:p-5">
            {activityFeed.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                No recent customer activity yet.
              </div>
            ) : (
              activityFeed.map((activity) => {
                const accentClass =
                  activity.kind === 'appointment'
                    ? 'bg-violet-500'
                    : activity.kind === 'deal'
                      ? 'bg-emerald-500'
                      : activity.kind === 'note'
                        ? 'bg-amber-500'
                        : 'bg-cyan-500';

                return (
                  <div key={activity.id} className="grid grid-cols-[30px_1fr] gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`mt-1 h-8 w-8 rounded-lg ${accentClass}`} />
                      <div className="mt-2 h-full w-px bg-slate-200" />
                    </div>
                    <div>
                      <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-medium text-slate-700">{activity.heading}</p>
                        <p className="text-sm text-slate-500">{formatDateTime(activity.date)}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                        <p className="text-[18px] font-semibold leading-6 text-slate-800">{normalizeDisplayText(activity.title)}</p>
                        <p className="mt-2 text-[15px] leading-6 text-slate-600">{activity.body}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div id="contact-overview" className="scroll-mt-24 rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 shadow-sm sm:p-5 xl:sticky xl:top-4 xl:self-start">
          <div className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
            <div>
              <p className="mb-2 text-[14px] font-semibold text-slate-700">Name</p>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-800">{displayName}</div>
            </div>
            <div>
              <p className="mb-2 text-[14px] font-semibold text-slate-700">Email</p>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-blue-600">{displayEmail}</div>
            </div>
            <div>
              <p className="mb-2 text-[14px] font-semibold text-slate-700">Activity Timeline</p>
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                {Array.from({ length: 18 }).map((_, index) => {
                  const activity = activityFeed[index];
                  const color = !activity
                    ? 'bg-slate-200'
                    : activity.kind === 'appointment'
                      ? 'bg-sky-400'
                      : activity.kind === 'note'
                        ? 'bg-pink-500'
                        : activity.kind === 'deal'
                          ? 'bg-emerald-400'
                          : 'bg-cyan-400';

                  return <span key={index} className={`h-8 w-2.5 rounded-full ${color} opacity-90`} />;
                })}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[14px] font-semibold text-slate-700">Accounts</p>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-800">{displayCompany}</div>
            </div>
            <div>
              <p className="mb-2 text-[14px] font-semibold text-slate-700">Deals</p>
              <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                {bids.length > 0 ? (
                  bids.slice(0, 2).map((bid) => (
                    <Badge key={bid.id} className="bg-cyan-100 text-slate-700 hover:bg-cyan-100">
                      {bid.title}
                    </Badge>
                  ))
                ) : (
                  <span className="text-[15px] text-slate-500">No deals yet</span>
                )}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[14px] font-semibold text-slate-700">Deals value</p>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-[17px] font-medium text-slate-800">{formatMoney(totalDealValue)}</div>
            </div>
            <div>
              <p className="mb-2 text-[14px] font-semibold text-slate-700">Phone</p>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-blue-600">{contact.phone || '—'}</div>
            </div>
            <div>
              <p className="mb-2 text-[14px] font-semibold text-slate-700">Title</p>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-[15px] text-slate-800">{displayTitle}</div>
            </div>
            <div>
              <p className="mb-2 text-[14px] font-semibold text-slate-700">Price Level</p>
              <div className="rounded-xl bg-violet-100 px-4 py-3 text-center text-[15px] font-medium text-violet-700">
                {displayPriceLevel}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[14px] font-semibold text-slate-700">Status</p>
              <div className={`rounded-xl px-4 py-3 text-center text-[15px] font-medium ${contact.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : contact.status === 'Inactive' ? 'bg-slate-200 text-slate-700' : 'bg-amber-100 text-amber-700'}`}>
                {normalizeDisplayText(contact.status || 'Prospect')}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[14px] font-semibold text-slate-700">Comments</p>
              <div className="min-h-[96px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-700">
                {contact.notes || 'No comments added yet.'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sales & Financial Data */}
      {hasFinancialData && (
        <Card id="contact-financials" className="scroll-mt-24">
          <CardHeader>
            <CardTitle>Sales & Financial Data</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-blue-900 font-semibold">PTD Sales</Label>
              <Input 
                readOnly 
                value={contact.ptdSales != null ? `$${contact.ptdSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''} 
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-blue-900 font-semibold">PTD GP%</Label>
              <Input 
                readOnly 
                value={contact.ptdGpPercent != null ? `${Number(contact.ptdGpPercent).toFixed(1)}%` : ''} 
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-blue-900 font-semibold">YTD Sales</Label>
              <Input 
                readOnly 
                value={contact.ytdSales != null ? `$${contact.ytdSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''} 
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-blue-900 font-semibold">YTD GP%</Label>
              <Input 
                readOnly 
                value={contact.ytdGpPercent != null ? `${Number(contact.ytdGpPercent).toFixed(1)}%` : ''} 
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-blue-900 font-semibold">LYR Sales</Label>
              <Input 
                readOnly 
                value={contact.lyrSales != null ? `$${contact.lyrSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''} 
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-blue-900 font-semibold">LYR GP%</Label>
              <Input 
                readOnly 
                value={contact.lyrGpPercent != null ? `${Number(contact.lyrGpPercent).toFixed(1)}%` : ''} 
                className="bg-background"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer Portal Access */}
      {canChange('contacts', user.role) && (
        <PortalAccessManager
          contactId={contact.id}
          contactName={contact.name}
          contactEmail={contact.email}
        />
      )}

      {/* Project Managers */}
      <Card id="contact-project-managers" className="scroll-mt-24">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Project Managers</CardTitle>
            {canAdd('contacts', user.role) && (
              <Dialog open={isAddPMDialogOpen} onOpenChange={setIsAddPMDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Project Manager
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto bg-background">
                  <DialogHeader>
                    <DialogTitle>Add Project Manager</DialogTitle>
                    <DialogDescription>
                      Add a new project manager for {contact.name}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddProjectManager} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="pm-name">Full Name *</Label>
                      <Input
                        id="pm-name"
                        value={newPM.name}
                        onChange={(e) => setNewPM({ ...newPM, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pm-email">Email Address *</Label>
                      <Input
                        id="pm-email"
                        type="email"
                        value={newPM.email}
                        onChange={(e) => setNewPM({ ...newPM, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pm-phone">Phone Number *</Label>
                      <Input
                        id="pm-phone"
                        value={newPM.phone}
                        onChange={(e) => setNewPM({ ...newPM, phone: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pm-mailingAddress">Mailing Address *</Label>
                      <Textarea
                        id="pm-mailingAddress"
                        value={newPM.mailingAddress}
                        onChange={(e) => setNewPM({ ...newPM, mailingAddress: e.target.value })}
                        rows={3}
                        required
                      />
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setNewPM({ name: '', email: '', phone: '', mailingAddress: '' });
                          setIsAddPMDialogOpen(false);
                        }}
                        className="flex-1"
                        disabled={isSaving}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" className="flex-1" disabled={isSaving}>
                        {isSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          'Add Project Manager'
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : tableNotFound ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Project Managers table not found</p>
              <p className="text-sm mt-1">Please contact your administrator to set up the table</p>
            </div>
          ) : projectManagers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No project managers added yet</p>
              <p className="text-sm mt-1">Add project managers to keep track of key contacts</p>
            </div>
          ) : (
            <div className="space-y-4">
              {projectManagers.map((pm) => (
                <div key={pm.id} className="border rounded-lg p-4 hover:bg-muted">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                          {pm.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">{pm.name}</h4>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {pm.email}
                          </div>
                        </div>
                      </div>
                      <div className="ml-12 space-y-1 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {pm.phone}
                        </div>
                        <div className="flex items-start gap-2 text-muted-foreground">
                          <MapPin className="h-3 w-3 mt-0.5" />
                          <span>{pm.mailingAddress}</span>
                        </div>
                      </div>
                    </div>
                    {canChange('contacts', user.role) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingPM(pm);
                              setIsEditPMDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {canDelete('contacts', user.role) && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteProjectManager(pm.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bids */}
      <Card id="contact-deals" className="scroll-mt-24">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Deals & Proposals</CardTitle>
            <div className="flex items-center gap-2">
              {canAdd('contacts', user.role) && (
                <Button size="sm" onClick={handleOpenAddDeal}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Deal
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingBids ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : bids.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No deals added yet</p>
              <p className="text-sm mt-1">Create deals to send proposals to this contact</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bids.map((bid) => {
                const statusColors = {
                  draft: 'bg-muted text-foreground',
                  sent: 'bg-blue-100 text-blue-700',
                  viewed: 'bg-indigo-100 text-indigo-700',
                  accepted: 'bg-green-100 text-green-700',
                  rejected: 'bg-red-100 text-red-700',
                  won: 'bg-green-100 text-green-700',
                  lost: 'bg-red-100 text-red-700',
                  expired: 'bg-orange-100 text-orange-700',
                };
                
                // Safe access to status color with fallback
                const status = (bid.status || 'draft').toLowerCase();
                const badgeClass = statusColors[status as keyof typeof statusColors] || 'bg-muted text-foreground';
                
                return (
                  <div key={bid.id} className="border rounded-lg p-4 hover:bg-muted transition">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-5 w-5 text-blue-600" />
                          <h4 className="font-semibold text-foreground">{bid.title}</h4>
                          <Badge variant="outline">{bid._source === 'quotes' ? 'Quote' : 'Deal'}</Badge>
                          <Badge className={badgeClass}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Badge>
                        </div>
                        {bid.notes && <p className="text-sm text-muted-foreground mb-3 ml-7">{bid.notes}</p>}
                        <div className="ml-7 flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <DollarSign className="h-4 w-4" />
                            <span>${(bid.amount || bid.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          {bid.valid_until && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>Valid Until: {new Date(bid.valid_until).toLocaleDateString()}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <TrendingUp className="h-4 w-4" />
                            <span>Created: {new Date(bid.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setEditingBid({
                              ...bid,
                              terms: bid.terms || orgSettings.quoteTerms || getDefaultQuoteTerms()
                            });
                            // Ensure line items are typed correctly and normalize field names
                            const items = Array.isArray(bid.line_items) ? bid.line_items : [];
                            // Loading line items for editing
                            
                            // Normalize line items to ensure all expected fields are present
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
                              // Normalized item
                              return normalized;
                            });
                            
                            setEditingBidLineItems(normalizedItems as LineItem[]);
                            // Set tax rates from bid or default from org settings (server-loaded)
                            setBidTaxRate((bid.tax_percent || orgSettings.taxRate || 0).toString());
                            setBidTaxRate2((bid.tax_percent_2 || orgSettings.taxRate2 || 0).toString());
                            setBidDiscountPercent(bid.discount_percent || 0);
                            setIsEditBidDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteBid(bid.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents */}
      <Card id="contact-documents" className="scroll-mt-24">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Documents</CardTitle>
            {canAdd('contacts', user.role) && (
              <div className="flex items-center gap-2">
                <Label htmlFor="document-upload" className="sr-only">Upload Document</Label>
                <Input
                  id="document-upload"
                  type="file"
                  onChange={handleUploadDocument}
                  className="hidden"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => document.getElementById('document-upload')?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No documents added yet</p>
              <p className="text-sm mt-1">Upload documents to keep track of important files</p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc.id} className="border rounded-lg p-4 hover:bg-muted">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <File className="h-5 w-5 text-blue-600" />
                        <h4 className="font-semibold text-foreground">{doc.fileName}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 ml-7">{doc.description}</p>
                      <div className="ml-7 flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Uploaded: {new Date(doc.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    {canChange('contacts', user.role) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleDownloadDocument(doc.filePath, doc.fileName)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          {canDelete('contacts', user.role) && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteDocument(doc.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linked Notes */}
      <Card id="contact-notes" className="scroll-mt-24">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Linked Notes</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingNotes ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : linkedNotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <StickyNote className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No notes linked to this contact</p>
              <p className="text-sm mt-1">Link notes to this contact from the Notes module</p>
            </div>
          ) : (
            <div className="space-y-4">
              {linkedNotes.map((note) => (
                <div key={note.id} className="border rounded-lg p-4 hover:bg-muted">
                  <div className="flex items-start gap-3">
                    <StickyNote className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground">{note.title || 'Untitled Note'}</h4>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-4">{note.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(note.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linked Appointments */}
      <Card id="contact-appointments" className="scroll-mt-24">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Linked Appointments</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingAppointments ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : linkedAppointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No appointments linked to this contact</p>
              <p className="text-sm mt-1">Link appointments from the Appointments module</p>
            </div>
          ) : (
            <div className="space-y-4">
              {linkedAppointments
                .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                .map((apt) => {
                  const startDate = new Date(apt.start_time);
                  const isUpcoming = startDate > new Date();
                  return (
                    <div key={apt.id} className="border rounded-lg p-4 hover:bg-muted">
                      <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-foreground">{apt.title}</h4>
                            {isUpcoming && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-green-100 text-green-800">
                                Upcoming
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                            <span>
                              {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span>
                              {startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                              {apt.end_time && ` - ${new Date(apt.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
                            </span>
                          </div>
                          {apt.location && (
                            <p className="text-sm text-muted-foreground mt-1">{apt.location}</p>
                          )}
                          {apt.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{apt.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isComposeEmailOpen} onOpenChange={setIsComposeEmailOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[760px] h-[85vh] max-h-[90vh] overflow-hidden bg-background p-0">
          <div className="flex h-full min-h-0 flex-col">
            <DialogHeader className="border-b border-slate-200 px-4 py-4 sm:px-6">
              <DialogTitle>Create Email</DialogTitle>
              <DialogDescription>
                Send email to this contact.
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-scroll px-4 py-4 pr-3 sm:px-6 sm:pr-5 [scrollbar-width:auto] [scrollbar-color:#94a3b8_#f1f5f9] [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 hover:[&::-webkit-scrollbar-thumb]:bg-slate-500">
              <div className="space-y-2">
                <Label htmlFor="compose-account">From Account</Label>
                <Select value={selectedEmailAccount} onValueChange={setSelectedEmailAccount}>
                  <SelectTrigger id="compose-account">
                    <SelectValue placeholder={isLoadingEmailAccounts ? 'Loading accounts...' : 'Select connected email account'} />
                  </SelectTrigger>
                  <SelectContent>
                    {emailAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.email} ({account.provider})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isLoadingEmailAccounts && emailAccounts.length === 0 && (
                  <p className="text-sm text-amber-600">No email accounts are connected. Set one up in the Email module first.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="compose-to">To</Label>
                <Input
                  id="compose-to"
                  value={composeEmailTo}
                  onChange={(e) => setComposeEmailTo(e.target.value)}
                  placeholder="customer@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="compose-subject">Subject</Label>
                <Input
                  id="compose-subject"
                  value={composeEmailSubject}
                  onChange={(e) => setComposeEmailSubject(e.target.value)}
                  placeholder="Subject"
                />
              </div>

              {bids.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="compose-quote">Attach Quote / Proposal</Label>
                  <Select value={selectedEmailQuoteId} onValueChange={handleAttachQuoteToEmail}>
                    <SelectTrigger id="compose-quote">
                      <SelectValue placeholder="Select a quote or proposal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No attachment</SelectItem>
                      {bids.map((bid) => (
                        <SelectItem key={bid.id} value={bid.id}>
                          {bid.title} — {formatMoney(Number(bid.amount || bid.total || 0))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Body</Label>
                <div className="flex flex-wrap gap-2 rounded-md border border-slate-200 bg-slate-50 p-2">
                  <Button type="button" variant="outline" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => applyEmailFormat('bold')}>
                    <span className="font-bold">B</span>
                  </Button>
                  <Button type="button" variant="outline" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => applyEmailFormat('italic')}>
                    <span className="italic">I</span>
                  </Button>
                  <Button type="button" variant="outline" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => applyEmailFormat('underline')}>
                    <span className="underline">U</span>
                  </Button>
                  <Button type="button" variant="outline" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => applyEmailFormat('insertUnorderedList')}>
                    • List
                  </Button>
                </div>

                <div
                  ref={emailEditorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={syncComposeEmailBody}
                  className="min-h-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="border-t border-slate-200 bg-background px-4 py-3 sm:px-6">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setIsComposeEmailOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleCreateEmailDraft} disabled={isSendingEmail || isLoadingEmailAccounts}>
                  {isSendingEmail ? 'Sending...' : 'Send Email'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Project Manager Dialog */}
      <Dialog open={isEditPMDialogOpen} onOpenChange={setIsEditPMDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-background">
          <DialogHeader>
            <DialogTitle>Edit Project Manager</DialogTitle>
            <DialogDescription>
              Update the project manager's information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditProjectManager} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-pm-name">Full Name *</Label>
              <Input
                id="edit-pm-name"
                value={editingPM?.name || ''}
                onChange={(e) => setEditingPM(editingPM ? { ...editingPM, name: e.target.value } : null)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-pm-email">Email Address *</Label>
              <Input
                id="edit-pm-email"
                type="email"
                value={editingPM?.email || ''}
                onChange={(e) => setEditingPM(editingPM ? { ...editingPM, email: e.target.value } : null)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-pm-phone">Phone Number *</Label>
              <Input
                id="edit-pm-phone"
                value={editingPM?.phone || ''}
                onChange={(e) => setEditingPM(editingPM ? { ...editingPM, phone: e.target.value } : null)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-pm-mailingAddress">Mailing Address *</Label>
              <Textarea
                id="edit-pm-mailingAddress"
                value={editingPM?.mailingAddress || ''}
                onChange={(e) => setEditingPM(editingPM ? { ...editingPM, mailingAddress: e.target.value } : null)}
                rows={3}
                required
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingPM(null);
                  setIsEditPMDialogOpen(false);
                }}
                className="flex-1"
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>



      {/* Create Deal Dialog (copied from Bids.tsx / Deals module) */}
      <Dialog open={isAddBidDialogOpen} onOpenChange={setIsAddBidDialogOpen}>
        <DialogContent className="max-w-[1400px] w-[95vw] h-[90vh] flex flex-col bg-background p-0 border-0 shadow-2xl">
          <div className="p-6 border-b flex-shrink-0">
            <DialogHeader>
              <DialogTitle>Create New Deal</DialogTitle>
              <DialogDescription>
                Fill in the details to create a new deal for {contact.name} with line items and pricing.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            <div className="grid md:grid-cols-2 gap-4">
            {/* Basic Information */}
            <div className="space-y-2">
              <Label>Deal Title *</Label>
              <Input
                value={dealFormData.title}
                onChange={(e) => setDealFormData({ ...dealFormData, title: e.target.value })}
                placeholder="Enter deal title"
              />
            </div>
            <div className="space-y-2">
              <Label>Valid Until</Label>
              <Input
                type="date"
                value={dealFormData.validUntil}
                onChange={(e) => setDealFormData({ ...dealFormData, validUntil: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Contact</Label>
              <Input
                value={contact.name}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Price Level</Label>
              <Input
                value={contact.priceLevel || getPriceTierLabel(1)}
                disabled
                className="bg-muted"
              />
            </div>

            {/* Line Items */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm text-foreground">Line Items</h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshPrices}
                    title="Update prices to current inventory rates"
                    disabled={isRepricing || currentLineItems.length === 0}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRepricing ? 'animate-spin' : ''}`} />
                    Reprice
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowLineItemDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>
              </div>

              {currentLineItems.length === 0 ? (
                <div className="text-center py-8 bg-muted rounded-lg">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-muted-foreground">No items added yet</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full min-w-[500px]">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left py-2 px-3 text-xs text-muted-foreground">Item</th>
                        <th className="text-right py-2 px-3 text-xs text-muted-foreground whitespace-nowrap">Cost</th>
                        <th className="text-right py-2 px-3 text-xs text-muted-foreground">Qty</th>
                        <th className="text-right py-2 px-3 text-xs text-muted-foreground whitespace-nowrap">Unit Price</th>
                        <th className="text-right py-2 px-3 text-xs text-muted-foreground">Total</th>
                        <th className="w-20"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentLineItems.map(item => {
                        // STRATEGY 1: Match by SKU (most reliable)
                        let inventoryItem = item.sku ? inventoryItems.find(inv => inv.sku && inv.sku.toLowerCase() === item.sku.toLowerCase()) : null;
                        // STRATEGY 2: Match by itemId (fallback)
                        if (!inventoryItem && item.itemId) {
                          inventoryItem = inventoryItems.find(inv => inv.id === item.itemId);
                        }
                        const displaySku = item.sku || inventoryItem?.sku || '';
                        const displayDesc = item.description || inventoryItem?.description || '';
                        const displayName = item.itemName || inventoryItem?.name || inventoryItem?.sku || item.sku || item.itemId || 'Unknown Item';
                        const currentCost = inventoryItem?.cost ?? item.cost ?? 0;

                        return (
                          <tr key={item.id} className="border-t">
                            <td className="py-2 px-3">
                              <p className="text-sm font-medium text-foreground break-words max-w-[200px]">{displayName}</p>
                              {displayDesc && (
                                <p className="text-xs text-muted-foreground truncate max-w-[200px] mt-0.5">{displayDesc}</p>
                              )}
                              {displaySku && (
                                <p className="text-xs text-muted-foreground mt-0.5">SKU: {displaySku}</p>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right text-sm whitespace-nowrap">
                              ${currentCost.toFixed(2)}
                              {!inventoryItem && inventoryItems.length > 0 && (
                                <span className="block text-[10px] text-orange-500">Archived</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right text-sm">{item.quantity}</td>
                            <td className="py-2 px-3 text-right text-sm whitespace-nowrap">${(item.unitPrice ?? 0).toFixed(2)}</td>
                            <td className="py-2 px-3 text-right text-sm whitespace-nowrap">${(item.total ?? 0).toFixed(2)}</td>
                            <td className="py-2 px-3">
                              <div className="flex justify-end items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditLineItem(item)}
                                >
                                  <Edit className="h-4 w-4 text-blue-600" />
                                </Button>
                                <Button
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
              )}
            </div>

            {/* Pricing */}
            {currentLineItems.length > 0 && (
              <div className="md:col-span-2 space-y-4">
                <h3 className="text-sm text-foreground">Pricing</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quote Discount (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={dealFormData.discountPercent}
                      onChange={(e) => setDealFormData({ ...dealFormData, discountPercent: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tax Rate 1 (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={dealFormData.taxPercent}
                      onChange={(e) => setDealFormData({ ...dealFormData, taxPercent: Number(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground">Primary tax rate</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Tax Rate 2 (%) - Optional</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={dealFormData.taxPercent2 || 0}
                      onChange={(e) => setDealFormData({ ...dealFormData, taxPercent2: Number(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground">Secondary tax rate</p>
                  </div>
                </div>

                {/* Quote Summary */}
                <div className="bg-muted rounded-lg p-4">
                  <div className="space-y-2">
                    {(() => {
                      const totals = calculateBidTotals(currentLineItems, dealFormData.discountPercent, dealFormData.taxPercent, dealFormData.taxPercent2 || 0);
                      return (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal:</span>
                            <span className="text-foreground">${totals.subtotal.toFixed(2)}</span>
                          </div>
                          {dealFormData.discountPercent > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Discount ({dealFormData.discountPercent}%):</span>
                              <span className="text-red-600">-${totals.discountAmount.toFixed(2)}</span>
                            </div>
                          )}
                          {dealFormData.taxPercent > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Tax 1 ({dealFormData.taxPercent}%):</span>
                              <span className="text-foreground">${totals.taxAmount.toFixed(2)}</span>
                            </div>
                          )}
                          {(dealFormData.taxPercent2 || 0) > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Tax 2 ({dealFormData.taxPercent2}%):</span>
                              <span className="text-foreground">${(totals.taxAmount2 || 0).toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between pt-2 border-t border-border">
                            <span className="text-foreground">Total:</span>
                            <span className="text-xl text-foreground">${totals.total.toFixed(2)}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Additional Information */}
            <div className="md:col-span-2 grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Notes (Internal)</Label>
                <Textarea
                  value={dealFormData.notes}
                  onChange={(e) => setDealFormData({ ...dealFormData, notes: e.target.value })}
                  placeholder="Internal notes (not visible to client)"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Terms & Conditions</Label>
                <Textarea
                  value={dealFormData.terms}
                  onChange={(e) => setDealFormData({ ...dealFormData, terms: e.target.value })}
                  placeholder="Payment terms and conditions"
                  rows={2}
                />
              </div>
            </div>

            </div>
          </div>

          <div className="p-6 border-t flex-shrink-0 bg-muted">
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAddBidDialogOpen(false)} className="flex-1" disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSaveDeal} className="flex-1" disabled={isSaving || !dealFormData.title}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Quote'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Line Item Dialog (copied from Bids.tsx / Deals module) ── */}
      <Dialog open={showLineItemDialog} onOpenChange={setShowLineItemDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background">
          <DialogHeader>
            <DialogTitle>{editingLineItemId ? 'Edit Line Item' : 'Add Line Item'}</DialogTitle>
            <DialogDescription>
              Select a product from inventory and specify quantity and price.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Search Inventory</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Try: 'Hammers under $40', 'Screws', 'Paint red'..."
                  value={inventorySearchQuery}
                  onChange={(e) => setInventorySearchQuery(e.target.value)}
                  ref={addLineItemSearchInputRef}
                  className="pl-10"
                />
              </div>
              {filteredInventory.length === 0 && inventorySearchQuery && (
                <p className="text-xs text-red-600 mt-1">{isSearchingInventory ? 'Searching...' : 'No items found. Try a different search.'}</p>
              )}
              {!inventorySearchQuery && (
                <p className="text-xs text-muted-foreground mt-1">Supports natural language: plurals, typos, and price filters</p>
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
                    filteredInventory.map(item => {
                      const priceTier = priceLevelToTier(contact.priceLevel || getPriceTierLabel(1));
                      const price = getPriceForTier(item, priceTier);
                      return (
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
                            <span className="text-sm text-muted-foreground whitespace-nowrap ml-2">${price.toFixed(2)}</span>
                          </div>
                        </SelectItem>
                      );
                    })
                  ) : (
                    <SelectItem value="no-items" disabled>
                      {isSearchingInventory ? 'Searching...' : (inventorySearchQuery ? 'No items found' : 'Type above to search')}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {selectedInventoryId && (
                <div className="mt-2 p-3 bg-blue-50 rounded text-xs text-blue-700">
                  {filteredInventory.find(i => i.id === selectedInventoryId)?.description}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Unit Price *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={lineItemUnitPrice}
                  onChange={(e) => setLineItemUnitPrice(Number(e.target.value))}
                />
                {selectedInventoryId && (() => {
                  const priceLevel = contact.priceLevel || getPriceTierLabel(1);
                  const priceTier = priceLevelToTier(priceLevel);
                  const invItem = inventoryItems.find(i => i.id === selectedInventoryId);
                  return invItem ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      {priceLevel} default: ${getPriceForTier(invItem, priceTier).toFixed(2)}
                    </p>
                  ) : null;
                })()}
              </div>
              <div>
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min="1"
                  value={lineItemQuantity}
                  onChange={(e) => setLineItemQuantity(Number(e.target.value))}
                />
              </div>
            </div>

            {selectedInventoryId && lineItemUnitPrice > 0 && (() => {
              const selectedItem = inventoryItems.find(i => i.id === selectedInventoryId);
              return (
                <div className="bg-muted rounded-lg p-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cost:</span>
                      <span className="text-foreground">${(selectedItem?.cost || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Unit Price:</span>
                      <span className="text-foreground">${lineItemUnitPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quantity:</span>
                      <span className="text-foreground">{lineItemQuantity}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-foreground">Line Total:</span>
                      <span className="text-foreground">
                        ${(lineItemQuantity * lineItemUnitPrice).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
            <Button variant="outline" onClick={() => setShowLineItemDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddLineItem}>
              {editingLineItemId ? 'Update Item' : 'Add Item'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Deal Dialog */}
      <Dialog open={isEditBidDialogOpen} onOpenChange={setIsEditBidDialogOpen}>
        <DialogContent className="!max-w-none w-[98vw] h-[90vh] flex flex-col bg-background p-0 border-0 shadow-2xl">
          <div className="p-6 border-b flex-shrink-0">
            <DialogHeader>
              <DialogTitle>Edit Deal</DialogTitle>
              <DialogDescription>
                Update the deal's information and line items
              </DialogDescription>
            </DialogHeader>
          </div>
          <form onSubmit={handleEditBid} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid md:grid-cols-3 gap-4">
                {/* Basic Information */}
              <div className="space-y-2">
                <Label htmlFor="edit-bid-title">Title *</Label>
                <Input
                  id="edit-bid-title"
                  value={editingBid?.title || ''}
                  onChange={(e) => setEditingBid(editingBid ? { ...editingBid, title: e.target.value } : null)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-bid-status">Status *</Label>
                <Select
                  value={editingBid?.status || ''}
                  onValueChange={(value) => setEditingBid(editingBid ? { ...editingBid, status: value } : null)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue>{editingBid?.status || 'draft'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-bid-validUntil">Valid Until *</Label>
                <Input
                  id="edit-bid-validUntil"
                  type="date"
                  value={editingBid?.valid_until || ''}
                  onChange={(e) => setEditingBid(editingBid ? { ...editingBid, valid_until: e.target.value } : null)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Price Level</Label>
                <Input
                  value={contact.priceLevel || getPriceTierLabel(1)}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-bid-project-manager">Project Manager</Label>
                <Select
                  value={editingBid?.project_managers?.id || ''}
                  onValueChange={(value) => {
                    if (editingBid) {
                      const pm = projectManagers.find(p => p.id === value);
                      setEditingBid({ 
                        ...editingBid, 
                        project_managers: pm ? { id: pm.id, name: pm.name } : undefined 
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectManagers.map((pm) => (
                      <SelectItem key={pm.id} value={pm.id}>
                        {pm.name} ({pm.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Bids and quotes will be emailed to this person
                </p>
              </div>

            {/* Line Items Section */}
            <div className="md:col-span-3 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm text-foreground">Line Items</h3>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRepriceEditBid();
                    }}
                    disabled={isRepricing || editingBidLineItems.length === 0}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRepricing ? 'animate-spin' : ''}`} />
                    Reprice
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditLineItemDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </div>

              {editingBidLineItems.length === 0 ? (
                <div className="text-center py-8 bg-muted rounded-lg">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-muted-foreground">No items added yet</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full min-w-[500px]">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left py-2 px-4 text-xs text-muted-foreground">SKU</th>
                        <th className="text-left py-2 px-4 text-xs text-muted-foreground">Item Name</th>
                        <th className="text-right py-2 px-4 text-xs text-muted-foreground">Quote Qty</th>
                        <th className="text-right py-2 px-4 text-xs text-muted-foreground">Cost (Base)</th>
                        <th className="text-right py-2 px-4 text-xs text-muted-foreground">Tier {editingBid?.price_tier || 1} Price</th>
                        <th className="text-right py-2 px-4 text-xs text-muted-foreground">Total</th>
                        <th className="w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {editingBidLineItems.map(item => {
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
                        const tier = editingBid?.price_tier || 1;
                        const tierKey = `priceTier${tier}` as keyof typeof inventoryItem;
                        const snakeKey = `price_tier_${tier}` as keyof typeof inventoryItem;
                        const tierPrice = inventoryItem ? Number(inventoryItem[tierKey] || inventoryItem[snakeKey] || item.unitPrice || 0) : Number(item.unitPrice || 0);
                        const baseCost = inventoryItem?.cost || item.cost || 0;
                        
                        // Line item display data ready

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
                                onClick={() => handleRemoveEditLineItem(item.id)}
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
              )}
            </div>

            {/* Pricing */}
            {editingBidLineItems.length > 0 && (
              <div className="md:col-span-3 space-y-4">
                <h3 className="text-sm text-foreground">Pricing</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Bid Discount (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={bidDiscountPercent}
                      onChange={(e) => setBidDiscountPercent(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tax Rate 1 (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={bidTaxRate}
                      onChange={(e) => setBidTaxRate(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Primary tax rate
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Tax Rate 2 (%) - Optional</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={bidTaxRate2}
                      onChange={(e) => setBidTaxRate2(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Secondary tax rate
                    </p>
                  </div>
                </div>

                {/* Bid Summary */}
                {(() => {
                  const editTotals = calculateBidTotals(editingBidLineItems, bidDiscountPercent, parseFloat(bidTaxRate) || 0, parseFloat(bidTaxRate2) || 0);
                  return (
                    <div className="bg-muted rounded-lg p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span className="text-foreground">
                            ${editTotals.subtotal.toFixed(2)}
                          </span>
                        </div>
                        {bidDiscountPercent > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Discount ({bidDiscountPercent}%):</span>
                            <span className="text-red-600">
                              -${editTotals.discountAmount.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {parseFloat(bidTaxRate) > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Tax 1 ({bidTaxRate}%):</span>
                            <span className="text-foreground">
                              ${editTotals.taxAmount.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {parseFloat(bidTaxRate2) > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Tax 2 ({bidTaxRate2}%):</span>
                            <span className="text-foreground">
                              ${editTotals.taxAmount2.toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between pt-2 border-t border-border">
                          <span className="text-foreground">Total:</span>
                          <span className="text-xl text-foreground">
                            ${editTotals.total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Additional Information */}
            <div className="md:col-span-3 grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-bid-notes">Notes (Internal)</Label>
                <Textarea
                  id="edit-bid-notes"
                  value={editingBid?.notes || ''}
                  onChange={(e) => setEditingBid(editingBid ? { ...editingBid, notes: e.target.value } : null)}
                  placeholder="Internal notes (not visible to client)"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-bid-terms">Terms & Conditions</Label>
                <Textarea
                  id="edit-bid-terms"
                  value={editingBid?.terms || ''}
                  onChange={(e) => setEditingBid(editingBid ? { ...editingBid, terms: e.target.value } : null)}
                  placeholder="Payment terms and conditions"
                  rows={2}
                />
              </div>
            </div>
            </div>
            </div>

            <div className="p-6 border-t flex-shrink-0 bg-muted">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingBid(null);
                    setEditingBidLineItems([]);
                    setIsEditBidDialogOpen(false);
                  }}
                  className="flex-1"
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Line Item Dialog for Edit Bid */}
      <Dialog open={isEditLineItemDialogOpen} onOpenChange={setIsEditLineItemDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background">
          <DialogHeader>
            <DialogTitle>Add Line Item</DialogTitle>
            <DialogDescription>
              Select a product from inventory and specify quantity and discount.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Search Inventory</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Type to search by name, SKU, or item number..."
                  value={inventorySearchQuery}
                  onChange={(e) => setInventorySearchQuery(e.target.value)}
                  ref={editLineItemSearchInputRef}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label>Select Product *</Label>
              <Select value={selectedInventoryId} onValueChange={setSelectedInventoryId}>
                <SelectTrigger>
                  <SelectValue placeholder={filteredInventory.length > 0 ? "Choose from results below" : "Search above to find products"} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  {filteredInventory.length > 0 ? (
                    filteredInventory.map(item => {
                      const priceTier = priceLevelToTier(contact.priceLevel || getPriceTierLabel(1));
                      const price = getPriceForTier(item, priceTier);
                      return (
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
                            <span className="text-sm text-muted-foreground whitespace-nowrap ml-2">${price.toFixed(2)}</span>
                          </div>
                        </SelectItem>
                      );
                    })
                  ) : (
                    <SelectItem value="no-items" disabled>
                      {isSearchingInventory ? 'Searching...' : (inventorySearchQuery ? 'No items found' : 'Type above to search')}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {selectedInventoryId && (
                <div className="mt-2 p-3 bg-blue-50 rounded text-xs text-blue-700">
                  {filteredInventory.find(i => i.id === selectedInventoryId)?.description}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Unit Price *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={lineItemUnitPrice}
                  onChange={(e) => setLineItemUnitPrice(Number(e.target.value))}
                />
                {selectedInventoryId && (() => {
                  const priceLevel = contact.priceLevel || getPriceTierLabel(1);
                  const priceTier = priceLevelToTier(priceLevel);
                  return (
                    <p className="text-xs text-muted-foreground mt-1">
                      {priceLevel} default: $
                      {getPriceForTier(inventoryItems.find(i => i.id === selectedInventoryId)!, priceTier).toFixed(2)}
                    </p>
                  );
                })()}
              </div>
              <div>
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min="1"
                  value={lineItemQuantity}
                  onChange={(e) => setLineItemQuantity(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Line Discount (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={lineItemDiscount}
                  onChange={(e) => setLineItemDiscount(Number(e.target.value))}
                />
              </div>
            </div>

            {selectedInventoryId && lineItemUnitPrice > 0 && (
              <div className="bg-muted rounded-lg p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Unit Price:</span>
                    <span className="text-foreground">${lineItemUnitPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quantity:</span>
                    <span className="text-foreground">{lineItemQuantity}</span>
                  </div>
                  {lineItemDiscount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Discount:</span>
                      <span className="text-red-600">{lineItemDiscount}%</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-foreground">Line Total:</span>
                    <span className="text-foreground">
                      ${calculateLineItemTotal(
                        lineItemQuantity,
                        lineItemUnitPrice,
                        lineItemDiscount
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
            <Button 
              type="button"
              variant="outline" 
              onClick={() => {
                setIsEditLineItemDialogOpen(false);
                setSelectedInventoryId('');
                setLineItemQuantity(1);
                setLineItemDiscount(0);
                setInventorySearchQuery('');
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleAddEditLineItem}>
              Add Item
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}