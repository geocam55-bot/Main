import { useState, useEffect, useMemo, type FormEvent, type KeyboardEvent } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from './ui/select';
import { Search, Plus, Mail, Phone, Building, MoreVertical, Edit, Trash2, Loader2, Calendar, DollarSign, ArrowLeft, MapPin, Eye, X, Tag, AlertTriangle, Wrench, Users, UserCheck, UserPlus, Target, PlayCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { contactsAPI, projectManagersAPI, bidsAPI, quotesAPI } from '../utils/api';
import { projectId } from '../utils/supabase/info';
import { createClient } from '../utils/supabase/client';
import type { User } from '../App';
import { PermissionGate, PermissionButton } from './PermissionGate';
import { canAdd, canChange, canDelete } from '../utils/permissions';
import { ContactDetail } from './ContactDetail';
// import ImportExport from './ImportExport';
import { useDebounce } from '../utils/useDebounce';
import { getPriceTierLabel, getActivePriceLevels } from '../lib/global-settings';
import { useAudienceSegments } from '../hooks/useAudienceSegments';
import { TagSelector } from './TagSelector';
import { CustomFieldsRenderer } from './CustomFieldsRenderer';
import { toast } from 'sonner';
import { CustomerModuleHelp } from './CustomerModuleHelp';
import { GuidedTour } from './GuidedTour';
import { useTour } from '../hooks/useTour';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  trade?: string;
  status: string;
  ownerId: string;
  createdAt: string;
  priceLevel: string;
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

interface ContactsProps {
  user: User;
  tourIntentKey?: string;
  tourIntentNonce?: number;
}

export function Contacts({ user, tourIntentKey, tourIntentNonce }: ContactsProps) {
  const contactsTourSteps = useMemo(
    () => [
      {
        title: 'Search your contacts',
        body: 'Type a name, email, company, or phone number in this search box to filter contacts instantly.',
        targetSelector: '[data-tour="contacts-search"]',
        placement: 'bottom' as const,
      },
      {
        title: 'Review the contacts list',
        body: 'Each row is a contact record. Click a row to open details, or use the actions menu to edit or delete.',
        targetSelector: '[data-tour="contacts-list"]',
        placement: 'top' as const,
      },
      {
        title: 'Create a new contact',
        body: 'Click Add Contact to open the form, fill in contact details, then save to add them to your CRM.',
        targetSelector: '[data-tour="contacts-add"]',
        placement: 'bottom' as const,
      },
    ],
    []
  );
  const contactsTour = useTour({
    moduleKey: 'contacts-inline-tour',
    userId: user.id,
    steps: contactsTourSteps,
  });
  const canCreateContacts = canAdd('contacts', user.role) || user.role === 'standard_user' || user.role === 'designer';
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // 🚀 Debounce search for better performance
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [dealValueByContactId, setDealValueByContactId] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showContactDetail, setShowContactDetail] = useState(false);
    const [showImportExportWindow, setShowImportExportWindow] = useState(false);
  
  // ⚡ Performance: Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  
  // Load predefined audience segments
  const { segments: audienceSegments } = useAudienceSegments(user.organizationId);
  
  // Ownership fix state
  const [isFixingOwnership, setIsFixingOwnership] = useState(false);
  const [ownershipDiagnosis, setOwnershipDiagnosis] = useState<any>(null);
  const [ownershipFixResult, setOwnershipFixResult] = useState<string | null>(null);
  
  // Tags state
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [tagInput, setTagInput] = useState('');
  const [editTagInput, setEditTagInput] = useState('');
  
  // Form state
  const [isSaving, setIsSaving] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    trade: '',
    status: 'Prospect',
    priceLevel: getPriceTierLabel(1),
    legacyNumber: '',
    accountOwnerNumber: user.email || '', // Default to logged in user's email
    address: '',
    city: '',
    province: '',
    postalCode: '',
    notes: '',
    tags: [] as string[],
    customFields: {} as Record<string, any>,
    ptdSales: '',
    ptdGpPercent: '',
    ytdSales: '',
    ytdGpPercent: '',
    lyrSales: '',
    lyrGpPercent: ''
  });
  
  // Project Manager state
  const [projectManagers, setProjectManagers] = useState<ProjectManager[]>([]);
  const [isAddPMDialogOpen, setIsAddPMDialogOpen] = useState(false);
  const [isEditPMDialogOpen, setIsEditPMDialogOpen] = useState(false);
  const [editingPM, setEditingPM] = useState<ProjectManager | null>(null);
  const [newPM, setNewPM] = useState({
    name: '',
    email: '',
    phone: '',
    mailingAddress: ''
  });
  const [pendingTourConsumed, setPendingTourConsumed] = useState(false);
  
  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    const onStartTour = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string }>).detail;
      if (detail?.key === 'contacts') {
        contactsTour.start(0);
      }
    };

    window.addEventListener('prospaces:start-tour', onStartTour as EventListener);
    return () => window.removeEventListener('prospaces:start-tour', onStartTour as EventListener);
  }, [contactsTour.start]);

  useEffect(() => {
    if (!tourIntentNonce) return;
    if (tourIntentKey !== 'contacts') return;

    const run = () => contactsTour.start(0);
    const t1 = setTimeout(run, 120);
    const t2 = setTimeout(run, 450);
    const t3 = setTimeout(run, 900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [tourIntentKey, tourIntentNonce, contactsTour.start]);

  useEffect(() => {
    if (pendingTourConsumed) return;
    if (showContactDetail) return;
    if (sessionStorage.getItem('prospaces.pending-tour') !== 'contacts') return;

    sessionStorage.removeItem('prospaces.pending-tour');
    setPendingTourConsumed(true);

    const run = () => contactsTour.start(0);
    const t1 = setTimeout(run, 150);
    const t2 = setTimeout(run, 500);
    const t3 = setTimeout(run, 1100);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [pendingTourConsumed, showContactDetail, contactsTour.start]);

  const contactsGuidedTour = (
    <GuidedTour
      isOpen={contactsTour.isOpen}
      steps={contactsTourSteps}
      currentStep={contactsTour.currentStep}
      isFirst={contactsTour.isFirst}
      isLast={contactsTour.isLast}
      progress={contactsTour.progress}
      onNext={contactsTour.next}
      onPrev={contactsTour.prev}
      onClose={contactsTour.close}
      onFinish={contactsTour.close}
    />
  );

  const loadContacts = async () => {
    try {
      setIsLoading(true);
      const [{ contacts: loadedContacts }, bidsResult, quotesResult] = await Promise.all([
        contactsAPI.getAll(),
        bidsAPI.getAll(),
        quotesAPI.getAll(),
      ]);

      const validContacts = (loadedContacts || []).filter(Boolean);
      const normalizeLookup = (value?: string | null) => value?.trim().toLowerCase() || '';
      const combinedDeals = [...(bidsResult?.bids || []), ...(quotesResult?.quotes || [])];

      const nextDealValueMap = validContacts.reduce((acc, contact) => {
        const contactId = normalizeLookup(contact.id);
        const contactEmail = normalizeLookup(contact.email);
        const contactName = normalizeLookup(contact.name);

        const total = combinedDeals.reduce((sum, record: any) => {
          const linkedIds = [record.contactId, record.contact_id, record.customerId, record.customer_id]
            .map(normalizeLookup)
            .filter(Boolean);
          const linkedNames = [record.contactName, record.contact_name, record.customerName, record.customer_name]
            .map(normalizeLookup)
            .filter(Boolean);
          const linkedEmails = [record.contactEmail, record.contact_email, record.email]
            .map(normalizeLookup)
            .filter(Boolean);

          const matchesContact =
            (contactId && linkedIds.includes(contactId)) ||
            (contactEmail && linkedEmails.includes(contactEmail)) ||
            (contactName && linkedNames.includes(contactName));

          if (!matchesContact) return sum;

          const numericValue = Number(record.total ?? record.amount ?? 0);
          return sum + (Number.isFinite(numericValue) ? numericValue : 0);
        }, 0);

        acc[contact.id] = total;
        return acc;
      }, {} as Record<string, number>);

      setContacts(validContacts);
      setDealValueByContactId(nextDealValueMap);
      
      // Also update selectedContact if it's in the loaded data
      // (prevents stale data when re-opening the edit dialog after save)
      if (selectedContact) {
        const refreshed = validContacts.find((c: any) => c?.id === selectedContact.id);
        if (refreshed) {
          setSelectedContact(refreshed);
        }
      }
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate metrics
  const metrics = useMemo(() => {
    const total = contacts.length;
    const active = contacts.filter(c => c?.status === 'Active').length;
    const prospects = contacts.filter(c => c?.status === 'Prospect').length;
    
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newContacts = contacts.filter(c => {
      if (!c?.createdAt) return false;
      const created = new Date(c.createdAt);
      return created >= firstDayOfMonth;
    }).length;

    return { total, active, prospects, newContacts };
  }, [contacts]);

  const getContactType = (contact: Contact) => {
    const tags = (contact.tags || []).map((tag) => tag.toLowerCase());
    if (tags.some((tag) => tag.includes('partner') || tag.includes('vendor') || tag.includes('supplier'))) {
      return 'Partner';
    }
    if (contact.status === 'Prospect') {
      return 'Lead';
    }
    return 'Customer';
  };

  const getContactPriority = (contact: Contact) => {
    const notes = (contact.notes || '').toLowerCase();
    const tags = (contact.tags || []).map((tag) => tag.toLowerCase());
    const salesValue = Number(contact.ytdSales ?? contact.ptdSales ?? 0);

    if (notes.includes('vip') || tags.some((tag) => tag.includes('vip')) || salesValue >= 100000) {
      return 'High';
    }
    if (contact.status === 'Prospect' || salesValue >= 25000) {
      return 'Medium';
    }
    return 'Normal';
  };

  const formatCurrencyCompact = (value?: number) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '—';

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getDisplayedDealValue = (contact: Contact) => {
    const rawValue =
      contact.customFields?.dealValue ??
      contact.customFields?.dealsValue ??
      contact.customFields?.deals_value;

    const customFieldValue = typeof rawValue === 'number' ? rawValue : Number(rawValue);
    const liveDealValue = dealValueByContactId[contact.id] ?? 0;
    const resolvedValue = Math.max(Number.isFinite(customFieldValue) ? customFieldValue : 0, liveDealValue);

    return resolvedValue > 0 ? formatCurrencyCompact(resolvedValue) : '$0';
  };


  const openContactDetail = (contact: Contact) => {
    setSelectedContact(contact);
    setShowContactDetail(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openEditContact = (contact: Partial<Contact> | null) => {
    if (!contact) return;
    setEditingContact(contact as Contact);
    setIsEditDialogOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeEditContact = () => {
    setEditingContact(null);
    setIsEditDialogOpen(false);
  };

  const openCustomerImportExport = (focus: 'contacts-import' | 'contacts-export') => {
    sessionStorage.setItem('prospaces_import_export_focus', focus);
    sessionStorage.setItem('prospaces_import_export_scope', 'contacts-only');
    setShowImportExportWindow(true);
  };

  // Diagnose and fix contact ownership via server endpoint (bypasses RLS)
  const diagnoseAndFixOwnership = async () => {
    setIsFixingOwnership(true);
    setOwnershipDiagnosis(null);
    setOwnershipFixResult(null);
    
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        setOwnershipFixResult('Not authenticated. Please sign in again.');
        return;
      }
      
      // Step 1: Diagnose
      const diagRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/contacts/diagnose-ownership`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );
      
      if (!diagRes.ok) {
        const err = await diagRes.json().catch(() => ({}));
        setOwnershipFixResult(`Diagnosis failed: ${err.error || diagRes.statusText}`);
        return;
      }
      
      const diagnosis = await diagRes.json();
      setOwnershipDiagnosis(diagnosis);
      
      // Step 2: Always attempt fix — it's idempotent and also repairs JWT metadata
      if (diagnosis.stats?.mismatchedOwnership > 0 || diagnosis.stats?.globalEmailMatches > 0 || diagnosis.stats?.wrongOrganization > 0 || !diagnosis.user?.jwt_matches_profile) {
        const fixRes = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/contacts/fix-ownership`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              targetEmail: diagnosis.user?.email,
              organizationId: diagnosis.user?.organization_id,
            }),
          }
        );
        
        if (!fixRes.ok) {
          const err = await fixRes.json().catch(() => ({}));
          setOwnershipFixResult(`Fix failed: ${err.error || fixRes.statusText}`);
          return;
        }
        
        const fixResult = await fixRes.json();
        
        let resultMsg = fixResult.message || 'Fix completed.';
        if (fixResult.jwtFixed) {
          resultMsg += ' NOTE: Your session metadata was updated. Please sign out and sign back in, then reload this page to see your contacts.';
        }
        setOwnershipFixResult(resultMsg);
        
        // Reload contacts after fix (may still need sign out/in if JWT was fixed)
        if (fixResult.fixed > 0 || fixResult.orgFixed > 0) {
          // Small delay to let the DB settle
          await new Promise(r => setTimeout(r, 500));
          await loadContacts();
        }
      } else {
        // Even if no email matches found, still try the fix for JWT metadata
        const fixRes = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/contacts/fix-ownership`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              targetEmail: diagnosis.user?.email,
              organizationId: diagnosis.user?.organization_id,
            }),
          }
        );
        
        const fixResult = fixRes.ok ? await fixRes.json() : null;
        
        let msg = `Found ${diagnosis.stats?.totalContactsInOrg || 0} contacts in your org, ` +
          `${diagnosis.stats?.ownedByUserUUID || 0} owned by your UUID, ` +
          `${diagnosis.stats?.globalEmailMatches || 0} matched by your email globally. `;
        
        if (fixResult?.jwtFixed) {
          msg += 'Your session metadata was repaired — please sign out and sign back in to refresh.';
        } else if ((diagnosis.stats?.globalEmailMatches || 0) === 0) {
          msg += 'No contacts have your email as account_owner_number. Ask your admin to re-import contacts with the correct Account Owner email, or reassign contacts to you from Admin Settings.';
        }
        
        setOwnershipFixResult(msg);
        
        if (fixResult?.fixed > 0 || fixResult?.orgFixed > 0) {
          await new Promise(r => setTimeout(r, 500));
          await loadContacts();
        }
      }
    } catch (error: any) {
      setOwnershipFixResult(`Error: ${error.message}`);
    } finally {
      setIsFixingOwnership(false);
    }
  };

    // ⚡ Performance: Memoize filtered contacts to avoid re-filtering on every render
    const filteredContacts = useMemo(() => {
      let filtered = contacts.filter(Boolean);
      
      // Filter by tag or status
      if (selectedTagFilter && selectedTagFilter !== 'all') {
        if (selectedTagFilter.startsWith('status:')) {
          const status = selectedTagFilter.replace('status:', '');
          const searchStatus = status === 'Prospects' ? 'Prospect' : status;
          filtered = filtered.filter(contact => 
            contact?.status === searchStatus
          );
        } else if (selectedTagFilter.startsWith('tag:')) {
          const tag = selectedTagFilter.replace('tag:', '');
          filtered = filtered.filter(contact => 
            contact?.tags && contact.tags.includes(tag)
          );
        } else {
          // Fallback for any existing tags that didn't have the prefix
          filtered = filtered.filter(contact => 
            contact?.tags && contact.tags.includes(selectedTagFilter)
          );
        }
      }
      
      // Filter by search query
      const query = debouncedSearchQuery.toLowerCase().trim();
      if (query) {
        const statusAliases: Record<string, string> = {
          active: 'active',
          prospect: 'prospect',
          prospects: 'prospect',
          inactive: 'inactive',
        };
        const ignoredTokens = new Set([
          'show',
          'me',
          'all',
          'the',
          'a',
          'an',
          'and',
          'or',
          'with',
          'of',
          'for',
          'to',
          'customer',
          'customers',
          'client',
          'clients',
          'contact',
          'contacts',
          'high',
          'value',
          'values',
          'best',
        ]);

        const tokens = query
          .replace(/[^a-z0-9@.\-\s]/g, ' ')
          .split(/\s+/)
          .map((token) => token.trim())
          .filter((token) => token.length > 0 && !ignoredTokens.has(token));

        filtered = filtered.filter(contact => {
          // Standard text search
          const basicMatch = (
            (contact?.name || '').toLowerCase().includes(query) ||
            (contact?.email || '').toLowerCase().includes(query) ||
            (contact?.company || '').toLowerCase().includes(query) ||
            (contact?.trade || '').toLowerCase().includes(query) ||
            (contact?.phone || '').includes(query) ||
            (contact?.status || '').toLowerCase().includes(query) ||
            (contact?.tags || []).some(tag => tag.toLowerCase().includes(query))
          );

          if (basicMatch) return true;

          // Token-based matching supports natural-language searches from help examples.
          if (tokens.length > 0) {
            const searchableValues = [
              contact?.name,
              contact?.email,
              contact?.company,
              contact?.trade,
              contact?.phone,
              contact?.status,
              contact?.legacyNumber,
              contact?.accountOwnerNumber,
              ...(contact?.tags || []),
              ...Object.values(contact?.customFields || {}).map((val) => String(val)),
            ]
              .filter(Boolean)
              .map((val) => String(val).toLowerCase());

            const status = (contact?.status || '').toLowerCase();
            const tokenMatch = tokens.every((token) => {
              const mappedStatus = statusAliases[token];
              if (mappedStatus) {
                return status === mappedStatus;
              }
              return searchableValues.some((value) => value.includes(token));
            });

            if (tokenMatch) return true;
          }
          
          // Search in custom fields if not matched in basic fields
          if (contact?.customFields) {
            return Object.values(contact.customFields).some(val => 
              String(val).toLowerCase().includes(query)
            );
          }
          
          return false;
        });
      }
      
      return filtered;
    }, [contacts, debouncedSearchQuery, selectedTagFilter]);

  // ⚡ Performance: Paginate filtered contacts - only render current page
  const paginatedContacts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredContacts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredContacts, currentPage, itemsPerPage]);

  // Calculate total pages
  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);
  
  // Get all unique tags from contacts
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    contacts.filter(Boolean).forEach(contact => {
      if (contact?.tags && Array.isArray(contact.tags)) {
        contact.tags.forEach(tag => tagsSet.add(tag));
      }
    });
    return Array.from(tagsSet).sort();
  }, [contacts]);
  
  // Tag management functions
  const handleAddTag = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const trimmedTag = tagInput.trim();
      if (!newContact.tags.includes(trimmedTag)) {
        setNewContact({ ...newContact, tags: [...newContact.tags, trimmedTag] });
      }
      setTagInput('');
    }
  };
  
  const handleRemoveTag = (tagToRemove: string) => {
    setNewContact({ ...newContact, tags: newContact.tags.filter(tag => tag !== tagToRemove) });
  };
  
  const handleAddEditTag = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && editTagInput.trim() && editingContact) {
      e.preventDefault();
      const trimmedTag = editTagInput.trim();
      const currentTags = editingContact.tags || [];
      if (!currentTags.includes(trimmedTag)) {
        setEditingContact({ ...editingContact, tags: [...currentTags, trimmedTag] });
      }
      setEditTagInput('');
    }
  };
  
  const handleRemoveEditTag = (tagToRemove: string) => {
    if (editingContact) {
      setEditingContact({ 
        ...editingContact, 
        tags: (editingContact.tags || []).filter(tag => tag !== tagToRemove) 
      });
    }
  };

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery]);

  const handleAddContact = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const contactData = {
        name: newContact.name,
        email: newContact.email,
        phone: newContact.phone,
        company: newContact.company,
        trade: newContact.trade,
        status: newContact.status,
        priceLevel: newContact.priceLevel,
        legacyNumber: newContact.legacyNumber,
        accountOwnerNumber: newContact.accountOwnerNumber,
        address: newContact.address,
        city: newContact.city,
        province: newContact.province,
        postalCode: newContact.postalCode,
        notes: newContact.notes,
        tags: newContact.tags,
        custom_fields: newContact.customFields,
        ptdSales: newContact.ptdSales ? parseFloat(newContact.ptdSales) : undefined,
        ptdGpPercent: newContact.ptdGpPercent ? parseFloat(newContact.ptdGpPercent) : undefined,
        ytdSales: newContact.ytdSales ? parseFloat(newContact.ytdSales) : undefined,
        ytdGpPercent: newContact.ytdGpPercent ? parseFloat(newContact.ytdGpPercent) : undefined,
        lyrSales: newContact.lyrSales ? parseFloat(newContact.lyrSales) : undefined,
        lyrGpPercent: newContact.lyrGpPercent ? parseFloat(newContact.lyrGpPercent) : undefined
      };
      
      const result = await contactsAPI.create(contactData);
      const contact = result?.contact;
      if (contact) {
        // Add to beginning since contacts are sorted newest-first
        setContacts([contact, ...contacts]);
      } else {
        // Contact was likely created but response was unexpected — reload to be safe
        await loadContacts();
      }
      setNewContact({ name: '', email: '', phone: '', company: '', trade: '', status: 'Prospect', priceLevel: getPriceTierLabel(1), legacyNumber: '', accountOwnerNumber: user.email || '', address: '', city: '', province: '', postalCode: '', notes: '', tags: [], customFields: {}, ptdSales: '', ptdGpPercent: '', ytdSales: '', ytdGpPercent: '', lyrSales: '', lyrGpPercent: '' });
      setTagInput('');
      setIsAddDialogOpen(false);
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to create contact. Please try again.';
      alert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      await contactsAPI.delete(id);
      setContacts(contacts.filter(c => c?.id !== id));
    } catch (error) {
      alert('Failed to delete contact. Please try again.');
    }
  };

  const handleEditContact = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingContact) return;
    setIsSaving(true);

    const contactId = editingContact.id;
    const contactName = editingContact.name;

    try {
      const updateData = {
        name: editingContact.name,
        email: editingContact.email,
        phone: editingContact.phone,
        company: editingContact.company,
        trade: editingContact.trade,
        status: editingContact.status,
        priceLevel: editingContact.priceLevel,
        legacyNumber: editingContact.legacyNumber,
        accountOwnerNumber: editingContact.accountOwnerNumber,
        address: editingContact.address,
        city: editingContact.city,
        province: editingContact.province,
        postalCode: editingContact.postalCode,
        notes: editingContact.notes,
        tags: editingContact.tags,
        ptdSales: editingContact.ptdSales,
        ptdGpPercent: editingContact.ptdGpPercent,
        ytdSales: editingContact.ytdSales,
        ytdGpPercent: editingContact.ytdGpPercent,
        lyrSales: editingContact.lyrSales,
        lyrGpPercent: editingContact.lyrGpPercent
      };

      const { contact } = await contactsAPI.update(editingContact.id, updateData);

      if (contact) {
        // Update contacts list
        setContacts(prev => prev.map(c => (c?.id === contact.id ? contact : c)));
        
        // Update selectedContact with the fresh data from the server
        // We were viewing this contact (that's why the edit dialog was open)
        setSelectedContact(contact);
        
        toast.success(`Contact "${contactName}" saved successfully`);
        
        // Force reload contacts from server to ensure we have the latest data with KV overlay
        await loadContacts();
      } else {
        toast.warning('Update returned empty response — please verify changes');
      }
      closeEditContact();

      // ── POST-SAVE VERIFICATION: re-read from DB directly to confirm ──
      try {
        const supabase = createClient();
        const { data: verifyRow, error: verifyErr } = await supabase
          .from('contacts')
          .select('id, name, email, phone, company, status')
          .eq('id', contactId)
          .single();

        if (verifyErr) {
          toast.error(`DB verification failed: ${verifyErr.message}`);
        } else if (verifyRow) {
          const dbRow = verifyRow as { name?: string; email?: string; status?: string } | null;
          const nameMatch = dbRow?.name === updateData.name;
          const emailMatch = dbRow?.email === updateData.email;
          const statusMatch = dbRow?.status === updateData.status;
          if (!nameMatch || !emailMatch || !statusMatch) {
            toast.error(`DB verification MISMATCH — changes may not have persisted!`);
          }
        }
      } catch (verifyException: any) {
      }

      // Force reload from DB to ensure list shows actual DB state
      await loadContacts();
    } catch (error: any) {
      toast.error(`Failed to save contact: ${error?.message || 'Unknown error'}`);
      alert(`Failed to update contact: ${error?.message || 'Unknown error'}.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddProjectManager = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { projectManager } = await projectManagersAPI.create({
        ...newPM,
        customerId: selectedContact?.id || '',
      });
      setProjectManagers([...projectManagers, projectManager]);
      setNewPM({ name: '', email: '', phone: '', mailingAddress: '' });
      setIsAddPMDialogOpen(false);
    } catch (error) {
      alert('Failed to create project manager. Please try again.');
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
      alert('Failed to delete project manager. Please try again.');
    }
  };

  const handleEditProjectManager = async (e: FormEvent) => {
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
      alert('Failed to update project manager. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const editFieldClassName = 'h-11 rounded-xl border-slate-200 bg-slate-50 text-[15px] text-slate-700 shadow-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-cyan-500';
  const editSelectClassName = 'flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[15px] text-slate-700 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50';
  const editLabelClassName = 'text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-500';

  const renderEditContactDialog = () => {
    if (!isEditDialogOpen || !editingContact) return null;

    const currentStatus = editingContact.status || 'Prospect';
    const statusClass =
      currentStatus === 'Active'
        ? 'bg-emerald-100 text-emerald-700'
        : currentStatus === 'Inactive'
          ? 'bg-slate-200 text-slate-700'
          : 'bg-amber-100 text-amber-700';

    return (
      <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-100">
        <div className="min-h-screen w-full bg-slate-100 px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
          <div className="mx-auto max-w-[1720px] space-y-4">
            <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6 lg:px-8">
                <div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={closeEditContact}
                    className="mb-3 -ml-2 h-9 px-2 text-[15px] font-medium text-slate-600 hover:bg-slate-100"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <h1 className="text-[24px] font-semibold tracking-tight text-slate-800 sm:text-[28px]">Edit Contact</h1>
                  <p className="mt-1 text-sm text-slate-500 sm:text-base">
                    Update customer details in the same full-page workspace used by the contact detail view.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                    {editingContact.name || 'Contact record'}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600">
                    {editingContact.company || 'No account assigned'}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusClass}`}>
                    {currentStatus}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleEditContact} className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Mail className="h-4 w-4 text-cyan-700" />
                <h3 className="text-base font-semibold text-slate-800">Basic details</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className={editLabelClassName}>Name</Label>
                  <Input
                    id="edit-name"
                    className={editFieldClassName}
                    value={editingContact?.name || ''}
                    onChange={(e) => setEditingContact(editingContact ? { ...editingContact, name: e.target.value } : null)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email" className={editLabelClassName}>Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    className={editFieldClassName}
                    value={editingContact?.email || ''}
                    onChange={(e) => setEditingContact(editingContact ? { ...editingContact, email: e.target.value } : null)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone" className={editLabelClassName}>Phone</Label>
                  <Input
                    id="edit-phone"
                    className={editFieldClassName}
                    value={editingContact?.phone || ''}
                    onChange={(e) => setEditingContact(editingContact ? { ...editingContact, phone: e.target.value } : null)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-company" className={editLabelClassName}>Company</Label>
                  <Input
                    id="edit-company"
                    className={editFieldClassName}
                    value={editingContact?.company || ''}
                    onChange={(e) => setEditingContact(editingContact ? { ...editingContact, company: e.target.value } : null)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-trade" className={editLabelClassName}>Trade</Label>
                  <Input
                    id="edit-trade"
                    className={editFieldClassName}
                    value={editingContact?.trade || ''}
                    onChange={(e) => setEditingContact(editingContact ? { ...editingContact, trade: e.target.value } : null)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status" className={editLabelClassName}>Status</Label>
                  <select
                    id="edit-status"
                    value={editingContact?.status || 'Prospect'}
                    onChange={(e) => setEditingContact(editingContact ? { ...editingContact, status: e.target.value } : null)}
                    className={editSelectClassName}
                  >
                    <option value="Prospect">Prospect</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-priceLevel" className={editLabelClassName}>Price Level</Label>
                  <select
                    id="edit-priceLevel"
                    value={editingContact?.priceLevel || getPriceTierLabel(1)}
                    onChange={(e) => setEditingContact(editingContact ? { ...editingContact, priceLevel: e.target.value } : null)}
                    className={editSelectClassName}
                  >
                    {[1, 2, 3, 4, 5].map((t) => {
                      const label = getPriceTierLabel(t);
                      if (!label || label.trim() === '' || label.trim() === '0') return null;
                      return <option key={t} value={label}>T{t} — {label}</option>;
                    })}
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-cyan-700" />
                <h3 className="text-base font-semibold text-slate-800">Account and location</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-legacyNumber" className={editLabelClassName}>Legacy #</Label>
                  <Input
                    id="edit-legacyNumber"
                    className={editFieldClassName}
                    value={editingContact?.legacyNumber || ''}
                    onChange={(e) => setEditingContact(editingContact ? { ...editingContact, legacyNumber: e.target.value } : null)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-accountOwnerNumber" className={editLabelClassName}>Account Owner #</Label>
                  <Input
                    id="edit-accountOwnerNumber"
                    className={editFieldClassName}
                    value={editingContact?.accountOwnerNumber || ''}
                    onChange={(e) => setEditingContact(editingContact ? { ...editingContact, accountOwnerNumber: e.target.value } : null)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="edit-address" className={editLabelClassName}>Address</Label>
                  <Input
                    id="edit-address"
                    className={editFieldClassName}
                    value={editingContact?.address || ''}
                    onChange={(e) => setEditingContact(editingContact ? { ...editingContact, address: e.target.value } : null)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-city-2" className={editLabelClassName}>City</Label>
                  <Input
                    id="edit-city-2"
                    className={editFieldClassName}
                    value={editingContact?.city || ''}
                    onChange={(e) => setEditingContact(editingContact ? { ...editingContact, city: e.target.value } : null)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-province-2" className={editLabelClassName}>Province / State</Label>
                  <Input
                    id="edit-province-2"
                    className={editFieldClassName}
                    value={editingContact?.province || ''}
                    onChange={(e) => setEditingContact(editingContact ? { ...editingContact, province: e.target.value } : null)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="edit-postalCode-2" className={editLabelClassName}>Postal / Zip Code</Label>
                  <Input
                    id="edit-postalCode-2"
                    className={editFieldClassName}
                    value={editingContact?.postalCode || ''}
                    onChange={(e) => setEditingContact(editingContact ? { ...editingContact, postalCode: e.target.value } : null)}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Tag className="h-4 w-4 text-cyan-700" />
                <h3 className="text-base font-semibold text-slate-800">Notes and segmentation</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-notes" className={editLabelClassName}>Notes</Label>
                  <Textarea
                    id="edit-notes"
                    className="min-h-[120px] rounded-xl border-slate-200 bg-slate-50 text-[15px] text-slate-700 shadow-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-cyan-500"
                    value={editingContact?.notes || ''}
                    onChange={(e) => setEditingContact(editingContact ? { ...editingContact, notes: e.target.value } : null)}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <CustomFieldsRenderer
                    entityType="contact"
                    organizationId={user.organizationId}
                    values={editingContact?.customFields || {}}
                    onChange={(key, value) => {
                      if (editingContact) {
                        setEditingContact({
                          ...editingContact,
                          customFields: { ...(editingContact.customFields || {}), [key]: value }
                        });
                      }
                    }}
                  />
                </div>
                <div>
                  <TagSelector
                    label="Tags (for segmentation)"
                    tags={editingContact?.tags || []}
                    availableTags={audienceSegments}
                    onTagsChange={(tags) => setEditingContact(editingContact ? { ...editingContact, tags } : null)}
                    htmlFor="edit-tags-2"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-cyan-700" />
                <h3 className="text-base font-semibold text-slate-800">Sales snapshot</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-ptdSales" className={editLabelClassName}>PTD Sales</Label>
                  <Input
                    id="edit-ptdSales"
                    type="number"
                    step="0.01"
                    className={editFieldClassName}
                    value={editingContact?.ptdSales ?? ''}
                    onChange={(e) => setEditingContact(editingContact ? { ...editingContact, ptdSales: e.target.value ? parseFloat(e.target.value) : undefined } : null)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-ptdGpPercent" className={editLabelClassName}>PTD GP%</Label>
                  <Input
                    id="edit-ptdGpPercent"
                    type="number"
                    step="0.01"
                    className={editFieldClassName}
                    value={editingContact?.ptdGpPercent ?? ''}
                    onChange={(e) => setEditingContact(editingContact ? { ...editingContact, ptdGpPercent: e.target.value ? parseFloat(e.target.value) : undefined } : null)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-ytdSales" className={editLabelClassName}>YTD Sales</Label>
                  <Input
                    id="edit-ytdSales"
                    type="number"
                    step="0.01"
                    className={editFieldClassName}
                    value={editingContact?.ytdSales ?? ''}
                    onChange={(e) => setEditingContact(editingContact ? { ...editingContact, ytdSales: e.target.value ? parseFloat(e.target.value) : undefined } : null)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-ytdGpPercent" className={editLabelClassName}>YTD GP%</Label>
                  <Input
                    id="edit-ytdGpPercent"
                    type="number"
                    step="0.01"
                    className={editFieldClassName}
                    value={editingContact?.ytdGpPercent ?? ''}
                    onChange={(e) => setEditingContact(editingContact ? { ...editingContact, ytdGpPercent: e.target.value ? parseFloat(e.target.value) : undefined } : null)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-lyrSales" className={editLabelClassName}>LYR Sales</Label>
                  <Input
                    id="edit-lyrSales"
                    type="number"
                    step="0.01"
                    className={editFieldClassName}
                    value={editingContact?.lyrSales ?? ''}
                    onChange={(e) => setEditingContact(editingContact ? { ...editingContact, lyrSales: e.target.value ? parseFloat(e.target.value) : undefined } : null)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-lyrGpPercent" className={editLabelClassName}>LYR GP%</Label>
                  <Input
                    id="edit-lyrGpPercent"
                    type="number"
                    step="0.01"
                    className={editFieldClassName}
                    value={editingContact?.lyrGpPercent ?? ''}
                    onChange={(e) => setEditingContact(editingContact ? { ...editingContact, lyrGpPercent: e.target.value ? parseFloat(e.target.value) : undefined } : null)}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 z-10 rounded-[24px] border border-slate-200 bg-slate-50/95 p-3 shadow-sm backdrop-blur">
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeEditContact}
                  className="h-11 rounded-xl border-slate-200 bg-white px-5 text-slate-700 hover:bg-slate-100"
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-11 rounded-xl bg-cyan-700 px-5 text-white hover:bg-cyan-800"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </form>
          </div>
        </div>
      </div>
    );
  };

  const renderAddContactDialogContent = () => (
    <DialogContent className="fixed right-0 left-auto top-0 bottom-0 h-screen w-full sm:w-[700px] !max-w-[100vw] sm:!max-w-[700px] !translate-x-0 !translate-y-0 overflow-y-auto bg-background !m-0 !rounded-none sm:border-l shadow-2xl duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100">
      <DialogHeader>
        <DialogTitle>Add New Contact</DialogTitle>
        <DialogDescription>
          Create a new contact with their information and assigned price level.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleAddContact} className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={newContact.name}
            onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={newContact.email}
            onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={newContact.phone}
            onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">Company</Label>
          <Input
            id="company"
            value={newContact.company}
            onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="trade">Trade</Label>
          <Input
            id="trade"
            value={newContact.trade}
            onChange={(e) => setNewContact({ ...newContact, trade: e.target.value })}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="priceLevel">Price Level</Label>
          <select
            id="priceLevel"
            value={newContact.priceLevel}
            onChange={(e) => setNewContact({ ...newContact, priceLevel: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {[1,2,3,4,5].map(t => {
              const label = getPriceTierLabel(t);
              if (!label || label.trim() === '' || label.trim() === '0') return null;
              return <option key={t} value={label}>T{t} — {label}</option>;
            })}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="legacyNumber">Legacy #</Label>
          <Input
            id="legacyNumber"
            value={newContact.legacyNumber}
            onChange={(e) => setNewContact({ ...newContact, legacyNumber: e.target.value })}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="accountOwnerNumber">Account Owner #</Label>
          <Input
            id="accountOwnerNumber"
            value={newContact.accountOwnerNumber}
            onChange={(e) => setNewContact({ ...newContact, accountOwnerNumber: e.target.value })}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={newContact.address}
            onChange={(e) => setNewContact({ ...newContact, address: e.target.value })}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={newContact.city}
            onChange={(e) => setNewContact({ ...newContact, city: e.target.value })}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="province">Province / State</Label>
          <Input
            id="province"
            value={newContact.province}
            onChange={(e) => setNewContact({ ...newContact, province: e.target.value })}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="postalCode">Postal / Zip Code</Label>
          <Input
            id="postalCode"
            value={newContact.postalCode}
            onChange={(e) => setNewContact({ ...newContact, postalCode: e.target.value })}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={newContact.notes}
            onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
            placeholder="Optional"
          />
        </div>
        <div className="md:col-span-2">
          <TagSelector
            label="Tags (for segmentation)"
            tags={newContact.tags}
            availableTags={audienceSegments}
            onTagsChange={(tags) => setNewContact({ ...newContact, tags })}
            htmlFor="tags"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ptdSales">PTD Sales</Label>
          <Input
            id="ptdSales"
            type="number"
            step="0.01"
            value={newContact.ptdSales}
            onChange={(e) => setNewContact({ ...newContact, ptdSales: e.target.value })}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ptdGpPercent">PTD GP%</Label>
          <Input
            id="ptdGpPercent"
            type="number"
            step="0.01"
            value={newContact.ptdGpPercent}
            onChange={(e) => setNewContact({ ...newContact, ptdGpPercent: e.target.value })}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ytdSales">YTD Sales</Label>
          <Input
            id="ytdSales"
            type="number"
            step="0.01"
            value={newContact.ytdSales}
            onChange={(e) => setNewContact({ ...newContact, ytdSales: e.target.value })}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ytdGpPercent">YTD GP%</Label>
          <Input
            id="ytdGpPercent"
            type="number"
            step="0.01"
            value={newContact.ytdGpPercent}
            onChange={(e) => setNewContact({ ...newContact, ytdGpPercent: e.target.value })}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lyrSales">LYR Sales</Label>
          <Input
            id="lyrSales"
            type="number"
            step="0.01"
            value={newContact.lyrSales}
            onChange={(e) => setNewContact({ ...newContact, lyrSales: e.target.value })}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lyrGpPercent">LYR GP%</Label>
          <Input
            id="lyrGpPercent"
            type="number"
            step="0.01"
            value={newContact.lyrGpPercent}
            onChange={(e) => setNewContact({ ...newContact, lyrGpPercent: e.target.value })}
            placeholder="Optional"
          />
        </div>
        <div className="flex gap-2 pt-4 md:col-span-2">
          <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} className="flex-1" disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={isSaving}>
            {isSaving ? 'Adding...' : 'Add Contact'}
          </Button>
        </div>
      </form>
    </DialogContent>
  );

  // Show empty-state with ownership fix when user has 0 contacts
  if (contacts.length === 0 && !selectedContact) {
    return (
      <PermissionGate user={user} module="contacts" action="view">
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <AlertTriangle className="h-12 w-12 text-amber-500" />
            <h2 className="text-xl font-semibold text-foreground">No Contacts Found</h2>
            <p className="text-muted-foreground text-center max-w-md">
              You don't have any contacts visible yet. If contacts were imported by an admin,
              they may need an ownership fix to become visible to your account.
            </p>

            <div className="flex gap-3 flex-wrap justify-center">
              <CustomerModuleHelp
                userId={user.id}
                totalContacts={contacts.length}
                onSearchExample={(query) => {
                  setSearchQuery(query);
                  setSelectedTagFilter('all');
                }}
                onFilterByStatus={(status) => {
                  setSelectedTagFilter(`status:${status}`);
                  setSearchQuery('');
                }}
                onClearFilters={() => {
                  setSearchQuery('');
                  setSelectedTagFilter('all');
                }}
                onOpenAddContact={() => setIsAddDialogOpen(true)}
              />

              <Button
                onClick={diagnoseAndFixOwnership}
                disabled={isFixingOwnership}
                variant="default"
                className="flex items-center gap-2"
              >
                {isFixingOwnership ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wrench className="h-4 w-4" />
                )}
                {isFixingOwnership ? 'Diagnosing & Fixing...' : 'Diagnose & Fix My Contacts'}
              </Button>

              <Button onClick={loadContacts} variant="outline" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Reload Contacts
              </Button>

              {canCreateContacts && (
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add Contact
                    </Button>
                  </DialogTrigger>
                  {renderAddContactDialogContent()}
                </Dialog>
              )}
            </div>

            {/* Diagnosis results */}
            {ownershipDiagnosis && (
              <div className="w-full max-w-2xl mt-4 bg-muted rounded-lg p-4 border text-sm space-y-2">
                <h3 className="font-semibold text-foreground">Diagnosis Results</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-foreground">
                  <span>Your email:</span>
                  <span className="font-mono text-xs">{ownershipDiagnosis.user?.email}</span>
                  <span>Your user ID:</span>
                  <span className="font-mono text-xs truncate">{ownershipDiagnosis.user?.id}</span>
                  <span>Your org ID:</span>
                  <span className="font-mono text-xs truncate">{ownershipDiagnosis.user?.organization_id || 'NONE'}</span>
                  <span>Your role:</span>
                  <span>{ownershipDiagnosis.user?.role}</span>
                  <span>JWT org matches profile:</span>
                  <span className={ownershipDiagnosis.user?.jwt_matches_profile ? 'text-green-600' : 'text-red-600 font-semibold'}>
                    {ownershipDiagnosis.user?.jwt_matches_profile ? 'Yes' : `NO (JWT: ${ownershipDiagnosis.user?.jwt_organization_id || 'MISSING'})`}
                  </span>
                  <span className="font-semibold mt-2">Total contacts in org:</span>
                  <span className="font-semibold mt-2">{ownershipDiagnosis.stats?.totalContactsInOrg}</span>
                  <span>Owned by your UUID:</span>
                  <span>{ownershipDiagnosis.stats?.ownedByUserUUID}</span>
                  <span>Matched by your email (global):</span>
                  <span>{ownershipDiagnosis.stats?.globalEmailMatches}</span>
                  <span className="text-amber-700 font-semibold">Mismatched owner_id:</span>
                  <span className="text-amber-700 font-semibold">{ownershipDiagnosis.stats?.mismatchedOwnership}</span>
                  <span className="text-amber-700 font-semibold">Wrong organization_id:</span>
                  <span className="text-amber-700 font-semibold">{ownershipDiagnosis.stats?.wrongOrganization}</span>
                </div>
                {ownershipDiagnosis.uniqueAccountOwners?.length > 0 && (
                  <div className="mt-2">
                    <span className="font-semibold text-foreground">Account owners in org:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {ownershipDiagnosis.uniqueAccountOwners.map((owner: string) => (
                        <span key={owner} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-mono">
                          {owner}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {ownershipDiagnosis.orgProfiles?.length > 0 && (
                  <div className="mt-2">
                    <span className="font-semibold text-foreground">Users in org:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {ownershipDiagnosis.orgProfiles.map((p: any) => (
                        <span key={p.id} className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-mono">
                          {p.email} ({p.role})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Fix result message */}
            {ownershipFixResult && (
              <div className={`w-full max-w-2xl mt-2 rounded-lg p-3 border text-sm ${
                ownershipFixResult.includes('Fixed') || ownershipFixResult.includes('Fix completed')
                  ? 'bg-green-50 border-green-300 text-green-800'
                  : 'bg-amber-50 border-amber-300 text-amber-800'
              }`}>
                {ownershipFixResult}
              </div>
            )}
          </div>
        </div>
        {contactsGuidedTour}
      </PermissionGate>
    );
  }

  const contactsHeading = (() => {
    if (selectedTagFilter === 'status:Active') return 'Active Contacts';
    if (selectedTagFilter === 'status:Inactive') return 'Inactive Contacts';
    if (selectedTagFilter === 'status:Prospect') return 'Prospects';
    if (selectedTagFilter.startsWith('tag:')) return `${selectedTagFilter.replace('tag:', '')} Contacts`;
    return 'All Contacts';
  })();

  // Show contact detail view if a contact is selected
  if (showContactDetail && selectedContact) {
    return (
      <>
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-100">
          <div className="min-h-screen w-full">
            <ContactDetail
              contact={selectedContact}
              user={user}
              totalContacts={contacts.length}
              onBack={() => {
                setShowContactDetail(false);
                setSelectedContact(null);
              }}
              onEdit={(contact) => {
                openEditContact(contact);
              }}
              onSearchExample={(query) => {
                setShowContactDetail(false);
                setSelectedContact(null);
                setSearchQuery(query);
                setSelectedTagFilter('all');
              }}
              onFilterByStatus={(status) => {
                setShowContactDetail(false);
                setSelectedContact(null);
                setSelectedTagFilter(`status:${status}`);
                setSearchQuery('');
              }}
              onClearFilters={() => {
                setShowContactDetail(false);
                setSelectedContact(null);
                setSearchQuery('');
                setSelectedTagFilter('all');
              }}
              onOpenAddContact={() => {
                setShowContactDetail(false);
                setSelectedContact(null);
                setIsAddDialogOpen(true);
              }}
            />
          </div>
        </div>
        
        {renderEditContactDialog()}
      </>
    );
  }

  return (
    <PermissionGate user={user} module="contacts" action="view">
      <div className="space-y-4 rounded-[28px] bg-slate-50/80 p-3 sm:space-y-5 sm:p-5">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="space-y-4 p-4 sm:p-6">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Customer Module</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold text-emerald-700">{contactsHeading}</h2>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    {filteredContacts.length}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  A cleaner spreadsheet-style customer list with vertical scrolling and faster scanning.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600">
                  {metrics.total} total
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600">
                  {metrics.active} active
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600">
                  {metrics.prospects} prospects
                </span>
                <CustomerModuleHelp
                  userId={user.id}
                  totalContacts={contacts.length}
                  onSearchExample={(query) => {
                    setSearchQuery(query);
                    setSelectedTagFilter('all');
                  }}
                  onFilterByStatus={(status) => {
                    setSelectedTagFilter(`status:${status}`);
                    setSearchQuery('');
                  }}
                  onClearFilters={() => {
                    setSearchQuery('');
                    setSelectedTagFilter('all');
                  }}
                  onOpenAddContact={() => setIsAddDialogOpen(true)}
                />
                {(user.role === 'admin' || user.role === 'super_admin') && (
                  <Button
                    variant="outline"
                    className="h-10 border-blue-200 text-blue-700 hover:bg-blue-50"
                    onClick={() => contactsTour.start(0)}
                  >
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Start Tour Now
                  </Button>
                )}

              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3 sm:px-6">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center">
                <div data-tour="contacts-search" className="relative min-w-0 flex-1 lg:max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search contacts by name, email, company, phone, or status..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-11 border-slate-200 bg-white pl-10"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button
                    variant="outline"
                    className="h-11"
                    onClick={() => openCustomerImportExport('contacts-export')}
                  >
                    Export CSV
                  </Button>

                  <Button
                    variant="outline"
                    className="h-11"
                    onClick={() => openCustomerImportExport('contacts-import')}
                  >
                    Import CSV
                  </Button>

                  <Select value={selectedTagFilter} onValueChange={setSelectedTagFilter}>

                          <Dialog open={showImportExportWindow} onOpenChange={setShowImportExportWindow}>
                            <DialogContent className="fixed right-0 left-auto top-0 bottom-0 h-screen w-full sm:w-[700px] !max-w-[100vw] sm:!max-w-[700px] !translate-x-0 !translate-y-0 !m-0 !rounded-none sm:border-l shadow-2xl p-0 flex flex-col overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100">
                              <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 border-b bg-background sticky top-0 z-10">
                                <div className="flex items-center justify-between gap-3">
                                  <DialogTitle>Import and Export</DialogTitle>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowImportExportWindow(false)}
                                    className="flex items-center gap-2"
                                  >
                                    <ArrowLeft className="h-4 w-4" />
                                    Back
                                  </Button>
                                </div>
                                <DialogDescription className="sr-only">
                                  Import and export customers without leaving the Customer module.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="flex-1 overflow-y-auto">
                                <button
                                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg mt-4"
                                  onClick={() => window.open('/?view=project-wizards&module=import-export', '_blank')}
                                >
                                  Open Import/Export Module
                                </button>
                              </div>
                            </DialogContent>
                          </Dialog>
                    <SelectTrigger className="h-11 w-full border-slate-200 bg-white sm:w-[190px]">
                      <SelectValue placeholder="Filter..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Contacts</SelectItem>
                      <SelectGroup>
                        <SelectItem value="status:Active">Active</SelectItem>
                        <SelectItem value="status:Inactive">Inactive</SelectItem>
                        <SelectItem value="status:Prospect">Prospects</SelectItem>
                      </SelectGroup>
                      {allTags.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Tags</SelectLabel>
                          {allTags.map((tag) => (
                            <SelectItem key={`tag:${tag}`} value={`tag:${tag}`}>
                              {tag}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                    </SelectContent>
                  </Select>

                  {canCreateContacts && (
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                      <DialogTrigger asChild>
                        <Button data-tour="contacts-add" className="group h-11 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-700 px-4 text-white shadow-sm transition-all hover:-translate-y-0.5 hover:from-cyan-700 hover:to-cyan-800 hover:shadow-md">
                          <Plus className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" />
                          Add Contact
                        </Button>
                      </DialogTrigger>
                      {renderAddContactDialogContent()}
                    </Dialog>
                  )}
                </div>
              </div>
            </div>

            {selectedTagFilter && selectedTagFilter !== 'all' && (
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="secondary" className="flex items-center gap-1 bg-slate-100 text-slate-700">
                  <Tag className="h-3 w-3" />
                  Filtered by: {selectedTagFilter.startsWith('status:') ? selectedTagFilter.replace('status:', '') : selectedTagFilter.replace('tag:', '')}
                  <button
                    onClick={() => setSelectedTagFilter('all')}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              </div>
            )}
          </div>

          <div data-tour="contacts-list" className="border-l-4 border-emerald-600 bg-white">
            <div
              className="overflow-x-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400"
              style={{ scrollbarGutter: 'stable' }}
            >
              <div className="max-h-[62vh] overflow-y-auto">
                <table className="min-w-[1200px] w-full border-separate border-spacing-0">
                  <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr className="text-left text-[13px] text-slate-700">
                    <th className="border-b border-slate-200 px-2.5 py-2 font-medium"><input type="checkbox" className="h-4 w-4 rounded border-slate-300" /></th>
                    <th className="border-b border-slate-200 px-2.5 py-2 font-medium">Actions</th>
                    <th className="border-b border-slate-200 px-2.5 py-2 font-medium">Name</th>
                    <th className="border-b border-slate-200 px-2.5 py-2 font-medium">Email</th>
                    <th className="border-b border-slate-200 px-2.5 py-2 font-medium">Company</th>
                    <th className="border-b border-slate-200 px-2.5 py-2 font-medium">Trade</th>
                    <th className="border-b border-slate-200 px-2.5 py-2 font-medium">Deal value</th>
                    <th className="border-b border-slate-200 px-2.5 py-2 font-medium">Phone</th>
                    <th className="border-b border-slate-200 px-2.5 py-2 font-medium">Price Level</th>
                    <th className="border-b border-slate-200 px-2.5 py-2 font-medium">Status</th>
                    <th className="border-b border-slate-200 px-2.5 py-2 font-medium">Activity Timeline</th>
                    <th className="border-b border-slate-200 px-2.5 py-2 font-medium">Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedContacts.map((contact) => {
                    const displayPriceLevel = (contact.priceLevel || getPriceTierLabel(1) || 'Tier 1').replace(/tier/gi, 'Tier ');
                    const notePreview = contact.notes?.trim()
                      ? `${contact.notes.trim().slice(0, 52)}${contact.notes.trim().length > 52 ? '…' : ''}`
                      : 'No notes added';
                    const activityTimeline = [
                      Boolean(contact.createdAt),
                      Boolean(contact.notes?.trim()),
                      Boolean(contact.tags && contact.tags.length > 0),
                      contact.status === 'Active',
                      Number(contact.ptdSales || contact.ytdSales || 0) > 0,
                      Number(contact.lyrSales || 0) > 0,
                    ];

                    return (
                      <tr
                        key={contact.id}
                        className="cursor-pointer bg-white align-middle transition-colors hover:bg-sky-50/60"
                        onClick={() => openContactDetail(contact)}
                      >
                        <td className="border-b border-slate-200 px-2.5 py-1.5" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                        </td>
                        <td className="border-b border-slate-200 px-2.5 py-1.5" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 rounded-full p-0 text-slate-500 hover:bg-slate-100">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              {canChange('contacts', user.role) && (
                                <>
                                  <DropdownMenuItem onClick={() => openContactDetail(contact)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details & Project Managers
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      openEditContact(contact);
                                    }}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                </>
                              )}
                              {canDelete('contacts', user.role) && (
                                <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteContact(contact.id)}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                        <td className="border-b border-slate-200 px-2.5 py-1.5">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-100 text-[11px] font-semibold text-cyan-700">
                              {(contact.name || '?').charAt(0)}
                            </div>
                            <div className="min-w-0 truncate text-[14px] font-medium leading-5 text-slate-800">{contact.name || 'Unknown'}</div>
                          </div>
                        </td>
                        <td className="border-b border-slate-200 px-2.5 py-1.5 text-[14px] text-blue-600 whitespace-nowrap">{contact.email || '—'}</td>
                        <td className="border-b border-slate-200 px-2.5 py-1.5">
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-cyan-50 px-2 py-0.5 text-[14px] text-slate-700">
                            <Building className="h-3 w-3 text-slate-500" />
                            <span className="max-w-[160px] truncate">{contact.company || 'Unassigned'}</span>
                          </span>
                        </td>
                        <td className="border-b border-slate-200 px-2.5 py-1.5 text-[14px] text-slate-700 whitespace-nowrap">
                          {contact.trade || '—'}
                        </td>
                        <td className="border-b border-slate-200 px-2.5 py-1.5 text-[14px] text-slate-700 whitespace-nowrap">
                          {getDisplayedDealValue(contact)}
                        </td>
                        <td className="border-b border-slate-200 px-2.5 py-1.5 text-[14px] text-blue-600 whitespace-nowrap">{contact.phone || '—'}</td>
                        <td className="border-b border-slate-200 px-2.5 py-1.5">
                          <span className="inline-flex min-w-[88px] justify-center rounded-md bg-violet-100 px-2 py-0.5 text-[13px] font-medium text-violet-700">
                            {displayPriceLevel}
                          </span>
                        </td>
                        <td className="border-b border-slate-200 px-2.5 py-1.5">
                          <span className={`inline-flex min-w-[78px] justify-center rounded-md px-2 py-0.5 text-[13px] font-medium ${
                            contact.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : contact.status === 'Inactive'
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-amber-100 text-amber-700'
                          }`}>
                            {contact.status || 'Prospect'}
                          </span>
                        </td>
                        <td className="border-b border-slate-200 px-2.5 py-1.5">
                          <div className="min-w-[120px]">
                            <div className="flex items-center gap-1">
                              {activityTimeline.map((isActive, index) => (
                                <span
                                  key={`${contact.id}-activity-${index}`}
                                  className={`h-6 w-1.5 rounded-full ${
                                    isActive
                                      ? index < 2
                                        ? 'bg-cyan-400'
                                        : index < 4
                                          ? 'bg-violet-400'
                                          : 'bg-emerald-400'
                                      : 'bg-slate-200'
                                  }`}
                                />
                              ))}
                            </div>
                            <div className="mt-1 text-[11px] text-slate-500 whitespace-nowrap">
                              {contact.createdAt
                                ? new Date(contact.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                : 'No activity'}
                            </div>
                          </div>
                        </td>
                        <td className="border-b border-slate-200 px-2.5 py-1.5 text-[14px] text-slate-700">
                          <div className="max-w-[240px] truncate leading-4">{notePreview}</div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredContacts.length === 0 && (
                    <tr>
                      <td colSpan={12} className="px-4 py-10 text-center text-slate-500">
                        No contacts found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>

            {filteredContacts.length > itemsPerPage && (
              <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-500">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredContacts.length)} of {filteredContacts.length} contacts
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-9"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {renderEditContactDialog()}

      {/* Add Project Manager Dialog */}
      <Dialog open={isAddPMDialogOpen} onOpenChange={setIsAddPMDialogOpen}>
        <DialogContent className="fixed right-0 left-auto top-0 bottom-0 h-screen w-full sm:w-[700px] !max-w-[100vw] sm:!max-w-[700px] !translate-x-0 !translate-y-0 overflow-y-auto bg-background !m-0 !rounded-none sm:border-l shadow-2xl duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100">
          <DialogHeader>
            <DialogTitle>Add Project Manager</DialogTitle>
            <DialogDescription>
              Add a new project manager for the selected contact.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddProjectManager} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pm-name">Name</Label>
              <Input
                id="pm-name"
                value={newPM.name}
                onChange={(e) => setNewPM({ ...newPM, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pm-email">Email</Label>
              <Input
                id="pm-email"
                type="email"
                value={newPM.email}
                onChange={(e) => setNewPM({ ...newPM, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pm-phone">Phone</Label>
              <Input
                id="pm-phone"
                value={newPM.phone}
                onChange={(e) => setNewPM({ ...newPM, phone: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pm-mailingAddress">Mailing Address</Label>
              <Textarea
                id="pm-mailingAddress"
                value={newPM.mailingAddress}
                onChange={(e) => setNewPM({ ...newPM, mailingAddress: e.target.value })}
                required
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddPMDialogOpen(false)} className="flex-1" disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isSaving}>
                {isSaving ? 'Adding...' : 'Add Project Manager'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Project Manager Dialog */}
      <Dialog open={isEditPMDialogOpen} onOpenChange={setIsEditPMDialogOpen}>
        <DialogContent className="fixed right-0 left-auto top-0 bottom-0 h-screen w-full sm:w-[700px] !max-w-[100vw] sm:!max-w-[700px] !translate-x-0 !translate-y-0 overflow-y-auto bg-background !m-0 !rounded-none sm:border-l shadow-2xl duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100">
          <DialogHeader>
            <DialogTitle>Edit Project Manager</DialogTitle>
            <DialogDescription>
              Update the project manager's information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditProjectManager} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-pm-name">Name</Label>
              <Input
                id="edit-pm-name"
                value={editingPM?.name || ''}
                onChange={(e) => setEditingPM(editingPM ? { ...editingPM, name: e.target.value } : null)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-pm-email">Email</Label>
              <Input
                id="edit-pm-email"
                type="email"
                value={editingPM?.email || ''}
                onChange={(e) => setEditingPM(editingPM ? { ...editingPM, email: e.target.value } : null)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-pm-phone">Phone</Label>
              <Input
                id="edit-pm-phone"
                value={editingPM?.phone || ''}
                onChange={(e) => setEditingPM(editingPM ? { ...editingPM, phone: e.target.value } : null)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-pm-mailingAddress">Mailing Address</Label>
              <Textarea
                id="edit-pm-mailingAddress"
                value={editingPM?.mailingAddress || ''}
                onChange={(e) => setEditingPM(editingPM ? { ...editingPM, mailingAddress: e.target.value } : null)}
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
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {contactsGuidedTour}
    </PermissionGate>
  );
}