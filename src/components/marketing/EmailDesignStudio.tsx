import { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '../../App';
import { campaignsAPI, contactsAPI } from '../../utils/api';
import { createClient, getSupabaseUrl } from '../../utils/supabase/client';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { toast } from 'sonner@2.0.3';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Blocks,
  BrushCleaning,
  Copy,
  Eye,
  GitBranch,
  Laptop,
  LayoutGrid,
  Mail,
  MousePointerClick,
  Moon,
  Monitor,
  Pencil,
  Pilcrow,
  Plus,
  Save,
  Search,
  Smartphone,
  Sparkles,
  Star,
  Type as TypeIcon,
  Trash2,
  Variable,
  Wand2,
  X,
  Image as ImageIcon,
  Filter,
} from 'lucide-react';

interface EmailDesignStudioProps {
  user: User;
}

type PreviewViewport = 'desktop' | 'mobile';
type PreviewSurface = 'light' | 'dark';
type InspectorTab = 'styles' | 'logic' | 'context';
type LogicOperator = 'equals' | 'not_equals' | 'contains' | 'greater_than';
type DensityMode = 'compact' | 'comfortable';
type BlockType =
  | 'heading'
  | 'text'
  | 'button'
  | 'image'
  | 'product-grid'
  | 'quote'
  | 'divider'
  | 'spacer'
  | 'conditional';

const DENSITY_STORAGE_KEY = 'email-designer-density-mode';
const TOOL_DROP_MIME = 'application/x-prospaces-block-type';
const BLOCK_TYPES: BlockType[] = [
  'heading',
  'text',
  'button',
  'image',
  'product-grid',
  'quote',
  'divider',
  'spacer',
  'conditional',
];

interface RecipientProfile {
  id: string;
  name: string;
  email: string;
  company: string;
  leadStatus: string;
  lifetimeValue: number;
  lastPurchase: string;
  favoriteCategory: string;
  firstName?: string;
  source?: 'crm' | 'sample';
}

interface BlockLogic {
  enabled: boolean;
  field: string;
  operator: LogicOperator;
  value: string;
  fallback: string;
}

interface BlockStyles {
  align: 'left' | 'center' | 'right';
  padding: number;
  background: string;
  textColor: string;
  accentColor: string;
}

interface DesignBlock {
  id: string;
  type: BlockType;
  name: string;
  content: string;
  subtitle?: string;
  darkAssetUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  products?: Array<{ name: string; description: string; price: string }>;
  styles: BlockStyles;
  logic: BlockLogic;
}

interface BrandPreset {
  name: string;
  primary: string;
  accent: string;
  canvas: string;
  text: string;
}

interface EmailDesignDocument {
  version: number;
  name: string;
  subjectLine: string;
  previewText: string;
  brandPreset: string;
  paletteLocked: boolean;
  viewport: PreviewViewport;
  surface: PreviewSurface;
  previewRecipientId: string;
  blocks: DesignBlock[];
}

const BRAND_PRESETS: BrandPreset[] = [
  { name: 'Rose CRM', primary: '#e11d48', accent: '#fb7185', canvas: '#fff7f8', text: '#1f2937' },
  { name: 'Ocean Signal', primary: '#0284c7', accent: '#06b6d4', canvas: '#f0f9ff', text: '#0f172a' },
  { name: 'Evergreen Ops', primary: '#059669', accent: '#34d399', canvas: '#ecfdf5', text: '#052e16' },
];

const SAMPLE_RECIPIENTS: RecipientProfile[] = [
  {
    id: 'r-1',
    name: 'Amelia Stone',
    firstName: 'Amelia',
    email: 'amelia@northarc.io',
    company: 'North Arc Design',
    leadStatus: 'Hot',
    lifetimeValue: 18400,
    lastPurchase: 'Deck Upgrade Bundle',
    favoriteCategory: 'Outdoor Living',
    source: 'sample',
  },
  {
    id: 'r-2',
    name: 'Marcus Hill',
    firstName: 'Marcus',
    email: 'marcus@fieldline.co',
    company: 'Fieldline Group',
    leadStatus: 'Lead',
    lifetimeValue: 6200,
    lastPurchase: 'Spring Promo Consultation',
    favoriteCategory: 'Project Planning',
    source: 'sample',
  },
  {
    id: 'r-3',
    name: 'Priya Nair',
    email: 'priya@arcwell.ca',
    company: 'Arcwell Homes',
    leadStatus: 'VIP',
    lifetimeValue: 41250,
    lastPurchase: 'Referral Rewards Campaign',
    favoriteCategory: 'Brand Campaigns',
    source: 'sample',
  },
];

const QUICK_ADD_BLOCKS: Array<{
  type: BlockType;
  label: string;
  icon: LucideIcon;
  tone: string;
}> = [
  { type: 'heading', label: 'Heading', icon: TypeIcon, tone: 'from-rose-100 to-orange-100 text-rose-700' },
  { type: 'text', label: 'Text', icon: Pilcrow, tone: 'from-sky-100 to-cyan-100 text-sky-700' },
  { type: 'button', label: 'Button', icon: MousePointerClick, tone: 'from-violet-100 to-fuchsia-100 text-violet-700' },
  { type: 'image', label: 'Image', icon: ImageIcon, tone: 'from-emerald-100 to-teal-100 text-emerald-700' },
  { type: 'product-grid', label: 'Products', icon: LayoutGrid, tone: 'from-amber-100 to-yellow-100 text-amber-700' },
  { type: 'conditional', label: 'Conditional', icon: Filter, tone: 'from-slate-200 to-slate-100 text-slate-700' },
];

const VARIABLE_OPTIONS = [
  { label: 'First Name', token: '{{Contact.FirstName}}' },
  { label: 'Email', token: '{{Contact.Email}}' },
  { label: 'Company', token: '{{Contact.Company}}' },
  { label: 'Lead Status', token: '{{Contact.Status}}' },
  { label: 'Last Purchase', token: '{{Contact.LastPurchase}}' },
  { label: 'Lifetime Value', token: '{{Contact.LTV}}' },
];

const BLOCK_LIBRARY: Array<{
  type: BlockType;
  name: string;
  description: string;
}> = [
  { type: 'heading', name: 'Heading', description: 'Hero headlines and section titles.' },
  { type: 'text', name: 'Rich Text', description: 'Personalized copy with merge fields.' },
  { type: 'button', name: 'CTA Button', description: 'Primary call-to-action with tracked URLs.' },
  { type: 'image', name: 'Image', description: 'Supports dark mode-specific assets.' },
  { type: 'product-grid', name: 'Smart Product Grid', description: 'Dynamic products based on customer history.' },
  { type: 'quote', name: 'Personalized Quote', description: 'Inject proposal or estimate messaging.' },
  { type: 'conditional', name: 'Conditional Container', description: 'Display content only when rules match.' },
  { type: 'divider', name: 'Divider', description: 'Separate content with visual rhythm.' },
  { type: 'spacer', name: 'Spacer', description: 'Fine tune layout density.' },
];

const defaultStyles = (preset: BrandPreset): BlockStyles => ({
  align: 'left',
  padding: 20,
  background: '#ffffff',
  textColor: preset.text,
  accentColor: preset.primary,
});

function makeId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}

function createBlock(type: BlockType, preset: BrandPreset): DesignBlock {
  const base = {
    id: makeId('block'),
    styles: defaultStyles(preset),
    logic: {
      enabled: false,
      field: 'leadStatus',
      operator: 'equals' as LogicOperator,
      value: 'Hot',
      fallback: 'valued customer',
    },
  };

  switch (type) {
    case 'heading':
      return {
        ...base,
        type,
        name: 'Hero Heading',
        content: 'Welcome back, {{Contact.FirstName}}',
        subtitle: 'Launch a smarter lifecycle email with live CRM context.',
      };
    case 'text':
      return {
        ...base,
        type,
        name: 'Narrative Copy',
        content: 'Because your last purchase was {{Contact.LastPurchase}}, we selected a follow-up offer tailored to {{Contact.Company}}.',
      };
    case 'button':
      return {
        ...base,
        type,
        name: 'Primary CTA',
        content: 'Review your custom recommendations',
        ctaLabel: 'Open recommendations',
        ctaUrl: 'https://portal.example.com/recommendations',
      };
    case 'image':
      return {
        ...base,
        type,
        name: 'Brand Image',
        content: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop',
        darkAssetUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&auto=format&fit=crop',
      };
    case 'product-grid':
      return {
        ...base,
        type,
        name: 'Smart Product Grid',
        content: 'Recommended for {{Contact.Company}}',
        products: [
          { name: 'Performance Bundle', description: 'Automated outreach + reporting.', price: '$249/mo' },
          { name: 'VIP Service Plan', description: 'Priority routing for high-LTV contacts.', price: '$399/mo' },
          { name: 'Referral Accelerator', description: 'Boost conversions from warm accounts.', price: '$189/mo' },
        ],
      };
    case 'quote':
      return {
        ...base,
        type,
        name: 'Personalized Quote',
        content: '"Teams similar to {{Contact.Company}} increased repeat revenue by 28% after moving to journey-based campaigns."',
      };
    case 'conditional':
      return {
        ...base,
        type,
        name: 'Conditional Offer',
        content: 'Show this banner only if the contact is high intent.',
        logic: {
          enabled: true,
          field: 'leadStatus',
          operator: 'equals',
          value: 'Hot',
          fallback: 'valued customer',
        },
      };
    case 'divider':
      return {
        ...base,
        type,
        name: 'Divider',
        content: '',
      };
    case 'spacer':
      return {
        ...base,
        type,
        name: 'Spacer',
        content: '32',
      };
  }
}

function createDefaultDocument(): EmailDesignDocument {
  const preset = BRAND_PRESETS[0];
  return {
    version: 1,
    name: 'Lifecycle Composer Draft',
    subjectLine: 'A next step built for {{Contact.FirstName}}',
    previewText: 'Live CRM context, dynamic products, and conditional offers in one workflow.',
    brandPreset: preset.name,
    paletteLocked: true,
    viewport: 'desktop',
    surface: 'light',
    previewRecipientId: SAMPLE_RECIPIENTS[0].id,
    blocks: [
      createBlock('heading', preset),
      createBlock('text', preset),
      createBlock('product-grid', preset),
      createBlock('button', preset),
    ],
  };
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function extractFavoriteCategory(contact: any): string {
  const tags = contact?.tags;
  if (Array.isArray(tags) && tags.length > 0 && tags[0]) {
    return String(tags[0]);
  }
  if (typeof tags === 'string' && tags.trim()) {
    return tags
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)[0] || 'General';
  }
  if (contact?.trade) return String(contact.trade);
  return 'General';
}

function extractLastPurchase(contact: any): string {
  const direct = contact?.lastPurchase || contact?.last_purchase;
  if (direct) return String(direct);

  const note = contact?.notes;
  if (typeof note === 'string' && note.trim()) {
    const compact = note.trim().slice(0, 48);
    return compact.length < note.trim().length ? `${compact}...` : compact;
  }

  return 'No recent purchase recorded';
}

function mapContactToRecipient(contact: any): RecipientProfile | null {
  const id = String(contact?.id || '').trim();
  const name = String(contact?.name || '').trim();
  if (!id || !name) return null;

  const email = String(contact?.email || '').trim();
  const company = String(contact?.company || '').trim() || 'Unknown Company';
  const firstName = name.split(' ')[0] || name;

  return {
    id,
    name,
    firstName,
    email: email || 'No email on record',
    company,
    leadStatus: String(contact?.status || 'Prospect'),
    lifetimeValue: toNumber(contact?.ytdSales ?? contact?.ptdSales ?? contact?.lyrSales),
    lastPurchase: extractLastPurchase(contact),
    favoriteCategory: extractFavoriteCategory(contact),
    source: 'crm',
  };
}

function evaluateLogic(block: DesignBlock, recipient: RecipientProfile) {
  if (!block.logic.enabled) return true;
  const value = String((recipient as Record<string, unknown>)[block.logic.field] ?? '');
  switch (block.logic.operator) {
    case 'equals':
      return value === block.logic.value;
    case 'not_equals':
      return value !== block.logic.value;
    case 'contains':
      return value.toLowerCase().includes(block.logic.value.toLowerCase());
    case 'greater_than':
      return Number(value) > Number(block.logic.value);
    default:
      return true;
  }
}

function injectVariables(content: string, recipient: RecipientProfile, fallback = 'valued customer') {
  const replacements: Record<string, string> = {
    '{{Contact.FirstName}}': recipient.firstName || fallback,
    '{{Contact.Email}}': recipient.email,
    '{{Contact.Company}}': recipient.company,
    '{{Contact.Status}}': recipient.leadStatus,
    '{{Contact.LastPurchase}}': recipient.lastPurchase,
    '{{Contact.LTV}}': `$${recipient.lifetimeValue.toLocaleString()}`,
  };

  return Object.entries(replacements).reduce(
    (result, [token, value]) => result.split(token).join(value),
    content,
  );
}

function buildMjml(document: EmailDesignDocument, recipient: RecipientProfile) {
  const sections = document.blocks
    .map((block) => {
      const visible = evaluateLogic(block, recipient);
      const copy = injectVariables(block.content, recipient, block.logic.fallback);

      if (!visible) {
        return `<!-- hidden:${block.name} -->`;
      }

      switch (block.type) {
        case 'heading':
          return `<mj-section><mj-column><mj-text font-size="28px" color="${block.styles.textColor}">${copy}</mj-text></mj-column></mj-section>`;
        case 'text':
          return `<mj-section><mj-column><mj-text color="${block.styles.textColor}">${copy}</mj-text></mj-column></mj-section>`;
        case 'button':
          return `<mj-section><mj-column><mj-button background-color="${block.styles.accentColor}" href="${block.ctaUrl || '#'}">${block.ctaLabel || copy}</mj-button></mj-column></mj-section>`;
        case 'image':
          return `<mj-section><mj-column><mj-image src="${document.surface === 'dark' && block.darkAssetUrl ? block.darkAssetUrl : block.content}" /></mj-column></mj-section>`;
        case 'product-grid':
          return `<mj-section><mj-column><mj-text font-weight="700">${copy}</mj-text><mj-text>${(block.products || [])
            .map((item) => `${item.name} - ${item.price}`)
            .join(' | ')}</mj-text></mj-column></mj-section>`;
        case 'quote':
          return `<mj-section><mj-column><mj-text font-style="italic">${copy}</mj-text></mj-column></mj-section>`;
        case 'divider':
          return `<mj-section><mj-column><mj-divider border-color="${block.styles.accentColor}" /></mj-column></mj-section>`;
        case 'spacer':
          return `<mj-section padding="${Number(block.content) || 32}px 0"></mj-section>`;
        case 'conditional':
          return `<mj-section><mj-column><mj-text color="${block.styles.textColor}">${copy}</mj-text></mj-column></mj-section>`;
      }
    })
    .join('\n');

  return `<mjml>
  <mj-body background-color="${document.surface === 'dark' ? '#09111f' : '#f8fafc'}">
    ${sections}
  </mj-body>
</mjml>`;
}

function renderStatRate(numerator: number, denominator: number) {
  if (!denominator) return '0.0%';
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

export function EmailDesignStudio({ user }: EmailDesignStudioProps) {
  const supabase = createClient();
  const toolsBarRef = useRef<HTMLDivElement | null>(null);
  const toolsHotTimeoutRef = useRef<number | null>(null);
  const [document, setDocument] = useState<EmailDesignDocument>(createDefaultDocument);
  const [emailCampaigns, setEmailCampaigns] = useState<any[]>([]);
  const [previewRecipients, setPreviewRecipients] = useState<RecipientProfile[]>(SAMPLE_RECIPIENTS);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('new');
  const [selectedBlockId, setSelectedBlockId] = useState<string>('');
  const [libraryBlocks, setLibraryBlocks] = useState<DesignBlock[]>([]);
  const [contactQuery, setContactQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('styles');
  const [isIntelligenceOpen, setIsIntelligenceOpen] = useState(false);
  const [isFinishedPreviewOpen, setIsFinishedPreviewOpen] = useState(false);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [densityMode, setDensityMode] = useState<DensityMode>(() => {
    if (typeof window === 'undefined') return 'comfortable';
    const stored = window.localStorage.getItem(DENSITY_STORAGE_KEY);
    return stored === 'compact' ? 'compact' : 'comfortable';
  });
  const [showMetrics, setShowMetrics] = useState(true);
  const [isToolsBarHot, setIsToolsBarHot] = useState(false);

  useEffect(() => {
    loadCampaigns();
    loadPreviewRecipients();
  }, [user.organizationId]);

  useEffect(() => {
    if (!previewRecipients.length) return;
    const hasSelected = previewRecipients.some((recipient) => recipient.id === document.previewRecipientId);
    if (hasSelected) return;

    updateDocument((current) => ({
      ...current,
      previewRecipientId: previewRecipients[0].id,
    }));
  }, [previewRecipients, document.previewRecipientId]);

  useEffect(() => {
    if (!selectedBlockId && document.blocks.length > 0) {
      setSelectedBlockId(document.blocks[0].id);
    }
  }, [document.blocks, selectedBlockId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(DENSITY_STORAGE_KEY, densityMode);
  }, [densityMode]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;

      const key = event.key.toLowerCase();
      if (key === 'b') {
        event.preventDefault();
        toolsBarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setIsToolsBarHot(true);
        if (toolsHotTimeoutRef.current) {
          window.clearTimeout(toolsHotTimeoutRef.current);
        }
        toolsHotTimeoutRef.current = window.setTimeout(() => {
          setIsToolsBarHot(false);
        }, 1200);
      }

      if (key === 'i') {
        event.preventDefault();
        setShowMetrics(false);
        setIsIntelligenceOpen(true);
      }

      if (key === 'p') {
        event.preventDefault();
        setIsFinishedPreviewOpen(true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (toolsHotTimeoutRef.current) {
        window.clearTimeout(toolsHotTimeoutRef.current);
      }
    };
  }, []);

  const selectedBlock = document.blocks.find((block) => block.id === selectedBlockId) || null;
  const previewRecipient =
    previewRecipients.find((recipient) => recipient.id === document.previewRecipientId) || previewRecipients[0];
  const activePreset =
    BRAND_PRESETS.find((preset) => preset.name === document.brandPreset) || BRAND_PRESETS[0];

  const filteredRecipients = useMemo(() => {
    const query = contactQuery.trim().toLowerCase();
    if (!query) return previewRecipients;
    return previewRecipients.filter((recipient) => {
      return [recipient.name, recipient.email, recipient.company].some((value) =>
        value.toLowerCase().includes(query),
      );
    });
  }, [contactQuery, previewRecipients]);

  const campaignStats = useMemo(() => {
    const totalSent = emailCampaigns.reduce((sum, campaign) => sum + Number(campaign.sent_count || campaign.sent_metric || 0), 0);
    const totalOpened = emailCampaigns.reduce((sum, campaign) => sum + Number(campaign.opened_count || campaign.opened_metric || 0), 0);
    const totalClicked = emailCampaigns.reduce((sum, campaign) => sum + Number(campaign.clicked_count || campaign.clicked_metric || 0), 0);
    const totalRevenue = emailCampaigns.reduce((sum, campaign) => sum + Number(campaign.revenue || campaign.revenue_metric || 0), 0);
    return {
      drafts: emailCampaigns.filter((campaign) => String(campaign.status || '').toLowerCase() === 'draft').length,
      openRate: renderStatRate(totalOpened, totalSent),
      clickRate: renderStatRate(totalClicked, totalOpened),
      revenue: `$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
    };
  }, [emailCampaigns]);

  const mjmlMarkup = useMemo(
    () => buildMjml(document, previewRecipient),
    [document, previewRecipient],
  );

  async function loadCampaigns() {
    setIsLoading(true);
    try {
      const { campaigns } = await campaignsAPI.getAll();
      const emailOnly = (campaigns || []).filter((campaign: any) =>
        String(campaign.type || '').toLowerCase() === 'email',
      );
      setEmailCampaigns(emailOnly);
    } catch (error) {
      toast.error('Failed to load email campaigns');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadPreviewRecipients() {
    try {
      const { contacts } = await contactsAPI.getAll('team');
      const mapped = (contacts || [])
        .map(mapContactToRecipient)
        .filter((recipient): recipient is RecipientProfile => Boolean(recipient));

      if (mapped.length > 0) {
        setPreviewRecipients(mapped);
      } else {
        setPreviewRecipients(SAMPLE_RECIPIENTS);
      }
    } catch (_error) {
      setPreviewRecipients(SAMPLE_RECIPIENTS);
      toast.error('Could not load CRM contacts for preview, using sample contacts');
    }
  }

  function loadCampaignIntoDesigner(campaignId: string) {
    if (campaignId === 'new') {
      const next = createDefaultDocument();
      setDocument(next);
      setSelectedCampaignId('new');
      setSelectedBlockId(next.blocks[0]?.id || '');
      return;
    }

    const campaign = emailCampaigns.find((item) => item.id === campaignId);
    if (!campaign) return;

    const nextDocument = campaign.emailDesigner || {
      ...createDefaultDocument(),
      name: campaign.name || 'Lifecycle Composer Draft',
      subjectLine: campaign.subject_line || campaign.subjectLine || '',
      previewText: campaign.preview_text || campaign.previewText || '',
      blocks: createDefaultDocument().blocks.map((block) => ({
        ...block,
        content: campaign.emailContent || block.content,
      })),
    };

    setDocument(nextDocument);
    setSelectedCampaignId(campaignId);
    setSelectedBlockId(nextDocument.blocks[0]?.id || '');
  }

  function updateDocument(updater: (current: EmailDesignDocument) => EmailDesignDocument) {
    setDocument((current) => updater(current));
  }

  function updateSelectedBlock(updater: (block: DesignBlock) => DesignBlock) {
    if (!selectedBlockId) return;
    updateDocument((current) => ({
      ...current,
      blocks: current.blocks.map((block) =>
        block.id === selectedBlockId ? updater(block) : block,
      ),
    }));
  }

  function handleAddBlock(type: BlockType) {
    const next = createBlock(type, activePreset);
    updateDocument((current) => ({ ...current, blocks: [...current.blocks, next] }));
    setSelectedBlockId(next.id);
    toast.success(`${next.name} added to canvas`);
  }

  function handleDuplicateBlock(blockId: string) {
    const source = document.blocks.find((block) => block.id === blockId);
    if (!source) return;
    const clone = { ...source, id: makeId('block'), name: `${source.name} Copy` };
    updateDocument((current) => ({ ...current, blocks: [...current.blocks, clone] }));
    setSelectedBlockId(clone.id);
  }

  function handleDeleteBlock(blockId: string) {
    const remaining = document.blocks.filter((block) => block.id !== blockId);
    updateDocument((current) => ({ ...current, blocks: remaining }));
    setSelectedBlockId(remaining[0]?.id || '');
  }

  function handleSaveBlockToLibrary(blockId: string) {
    const source = document.blocks.find((block) => block.id === blockId);
    if (!source) return;
    setLibraryBlocks((current) => [{ ...source, id: makeId('library') }, ...current].slice(0, 8));
    toast.success('Saved block to library');
  }

  function isBlockType(value: string): value is BlockType {
    return BLOCK_TYPES.includes(value as BlockType);
  }

  function insertBlockAt(type: BlockType, beforeBlockId?: string) {
    const next = createBlock(type, activePreset);
    updateDocument((current) => {
      if (!beforeBlockId) {
        return { ...current, blocks: [...current.blocks, next] };
      }

      const targetIndex = current.blocks.findIndex((block) => block.id === beforeBlockId);
      if (targetIndex < 0) {
        return { ...current, blocks: [...current.blocks, next] };
      }

      const inserted = [...current.blocks];
      inserted.splice(targetIndex, 0, next);
      return { ...current, blocks: inserted };
    });
    setSelectedBlockId(next.id);
    toast.success(`${next.name} added to canvas`);
  }

  function readFileAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Could not read selected image'));
      reader.readAsDataURL(file);
    });
  }

  async function handleImageUpload(
    event: React.ChangeEvent<HTMLInputElement>,
    target: 'light' | 'dark',
  ) {
    const file = event.target.files?.[0];
    if (!file || !selectedBlock || selectedBlock.type !== 'image') return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file');
      event.target.value = '';
      return;
    }

    const loadingToast = toast.loading('Uploading image to storage...');
    setIsUploadingImage(true);

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required to upload images');
      }

      const response = await fetch(`${getSupabaseUrl()}/functions/v1/make-server-8405be07/upload-image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: dataUrl,
          fileName: file.name,
          scope: 'email-designer',
          organizationId: user.organizationId,
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.error || 'Upload failed');
      }

      const { url } = await response.json();
      if (!url) {
        throw new Error('No URL returned from storage upload');
      }

      updateSelectedBlock((block) => {
        if (target === 'dark') {
          return { ...block, darkAssetUrl: url };
        }
        return { ...block, content: url };
      });
      toast.success(`${target === 'dark' ? 'Dark mode' : 'Primary'} image uploaded`, { id: loadingToast });
    } catch (error: any) {
      toast.error(error?.message || 'Failed to upload image from device', { id: loadingToast });
    } finally {
      setIsUploadingImage(false);
      event.target.value = '';
    }
  }

  function moveBlock(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;
    updateDocument((current) => {
      const fromIndex = current.blocks.findIndex((block) => block.id === draggedId);
      const toIndex = current.blocks.findIndex((block) => block.id === targetId);
      if (fromIndex < 0 || toIndex < 0) return current;

      const reordered = [...current.blocks];
      const [moving] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moving);
      return { ...current, blocks: reordered };
    });
  }

  function handleCanvasDropAtEnd(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const toolType = event.dataTransfer.getData(TOOL_DROP_MIME);
    if (toolType && isBlockType(toolType)) {
      insertBlockAt(toolType);
      return;
    }

    if (draggedBlockId && document.blocks.length > 0) {
      const lastId = document.blocks[document.blocks.length - 1]?.id;
      if (lastId) moveBlock(draggedBlockId, lastId);
      setDraggedBlockId(null);
    }
  }

  function handleBlockDrop(targetId: string) {
    if (!draggedBlockId) return;
    moveBlock(draggedBlockId, targetId);
    setDraggedBlockId(null);
  }

  function applyBrandPreset(name: string) {
    const preset = BRAND_PRESETS.find((entry) => entry.name === name);
    if (!preset) return;
    updateDocument((current) => ({
      ...current,
      brandPreset: name,
      blocks: current.blocks.map((block) => ({
        ...block,
        styles: current.paletteLocked
          ? {
              ...block.styles,
              accentColor: preset.primary,
              textColor: preset.text,
            }
          : block.styles,
      })),
    }));
  }

  async function saveDesign() {
    setIsSaving(true);
    try {
      const payload = {
        name: document.name,
        type: 'email',
        channel: 'email',
        status: selectedCampaignId === 'new' ? 'draft' : undefined,
        subject_line: document.subjectLine,
        preview_text: document.previewText,
        emailContent: mjmlMarkup,
        emailDesigner: document,
        designerVersion: document.version,
        previewRecipientId: document.previewRecipientId,
        trackingContext: {
          module: 'email-designer',
          source: 'marketing-space',
          savedAt: new Date().toISOString(),
        },
      };

      if (selectedCampaignId === 'new') {
        const { campaign } = await campaignsAPI.create(payload);
        toast.success('Email design saved as draft campaign');
        await loadCampaigns();
        setSelectedCampaignId(campaign.id);
      } else {
        await campaignsAPI.update(selectedCampaignId, payload);
        toast.success('Email design updated');
        await loadCampaigns();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save email design');
    } finally {
      setIsSaving(false);
    }
  }

  const previewWidthClass = document.viewport === 'mobile' ? 'max-w-[380px]' : 'max-w-[760px]';
  const previewBackground = document.surface === 'dark' ? '#07111d' : '#f8fafc';
  const previewCardBackground = document.surface === 'dark' ? '#101c2d' : '#ffffff';
  const isCompact = densityMode === 'compact';
  const shellClass = isCompact
    ? 'mx-auto w-full max-w-[1680px] space-y-3 p-3 lg:p-4'
    : 'mx-auto w-full max-w-[1680px] space-y-4 p-4 lg:p-6';
  const libraryScrollHeightClass = isCompact ? 'h-[620px]' : 'h-[680px]';
  const canvasShellClass = isCompact
    ? 'rounded-[24px] border border-slate-200 bg-slate-100/70 p-3'
    : 'rounded-[24px] border border-slate-200 bg-slate-100/70 p-4';
  const canvasBlocksClass = isCompact ? 'space-y-2.5 p-3' : 'space-y-3 p-4';

  return (
    <div className={shellClass}>
      {showMetrics ? (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-slate-200">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Drafts</p>
              <p className="mt-1.5 text-xl font-semibold text-foreground">{campaignStats.drafts}</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600">
              <Mail className="h-4.5 w-4.5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Open Rate</p>
              <p className="mt-1.5 text-xl font-semibold text-foreground">{campaignStats.openRate}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600">
              <Eye className="h-4.5 w-4.5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">CTR</p>
              <p className="mt-1.5 text-xl font-semibold text-foreground">{campaignStats.clickRate}</p>
            </div>
            <div className="rounded-lg bg-violet-50 p-2.5 text-violet-600">
              <Activity className="h-4.5 w-4.5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Revenue Influence</p>
              <p className="mt-1.5 text-xl font-semibold text-foreground">{campaignStats.revenue}</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600">
              <Star className="h-4.5 w-4.5" />
            </div>
          </CardContent>
        </Card>
      </div>
      ) : null}

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
            <Sparkles className="h-3.5 w-3.5" />
            Lifecycle Composer
          </div>
          <h2 className="mt-2.5 text-2xl font-semibold text-foreground">Email Design Studio</h2>
          <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">
            Three-pane email composition with live CRM preview, conditional logic, merge-tag fallbacks,
            and campaign-ready tracking that saves directly into your existing Marketing campaigns.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              onClick={() => setDensityMode('comfortable')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${densityMode === 'comfortable' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              Comfortable
            </button>
            <button
              onClick={() => setDensityMode('compact')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${densityMode === 'compact' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              Compact
            </button>
          </div>
          <Button variant="outline" onClick={() => setShowMetrics((current) => !current)}>
            {showMetrics ? 'Hide metrics' : 'Show metrics'}
          </Button>
          <Select value={selectedCampaignId} onValueChange={(value) => loadCampaignIntoDesigner(value)}>
            <SelectTrigger className="w-[260px] bg-background">
              <SelectValue placeholder="Open draft campaign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New lifecycle draft</SelectItem>
              {emailCampaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => loadCampaignIntoDesigner('new')} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            New draft
          </Button>
          <Button variant="outline" onClick={() => setIsFinishedPreviewOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Preview finished
          </Button>
          <Button onClick={saveDesign} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save design'}
          </Button>
        </div>
      </div>

      <Card
        ref={toolsBarRef}
        className={`border-slate-200 bg-white transition-shadow lg:sticky lg:top-4 lg:z-30 ${isToolsBarHot ? 'ring-2 ring-rose-200 shadow-md' : ''}`}
      >
        <CardContent className="space-y-2.5 p-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">Horizontal Tools Menu</div>
            <div className="group relative">
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 transition hover:border-rose-200 hover:text-rose-700"
              >
                Shortcuts
              </button>
              <div className="pointer-events-none absolute right-0 top-8 z-20 w-52 rounded-xl border border-slate-200 bg-white p-2 text-[11px] text-slate-600 opacity-0 shadow-lg transition group-hover:opacity-100">
                <p><span className="font-semibold text-slate-800">B</span> focus block tools</p>
                <p><span className="font-semibold text-slate-800">I</span> open intelligence space</p>
                <p><span className="font-semibold text-slate-800">P</span> open finished preview</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
          {QUICK_ADD_BLOCKS.map((entry) => (
            <button
              key={entry.type}
              draggable
              aria-label={entry.label}
              className="group relative flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white transition-all hover:-translate-y-0.5 hover:border-rose-300 hover:shadow-sm"
              onClick={() => handleAddBlock(entry.type)}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'copy';
                event.dataTransfer.setData(TOOL_DROP_MIME, entry.type);
              }}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${entry.tone}`}>
                <entry.icon className="h-4.5 w-4.5" />
              </div>
              <div className="pointer-events-none absolute -top-10 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                {entry.label}
              </div>
            </button>
          ))}
          <button
            aria-label="Intelligence Space"
            className={`group relative flex h-12 w-12 items-center justify-center rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-sm ${isIntelligenceOpen ? 'border-violet-300 bg-violet-50' : 'border-slate-200 bg-white hover:border-violet-300'}`}
            onClick={() => {
              setShowMetrics(false);
              setIsIntelligenceOpen(true);
            }}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-700">
              <Wand2 className="h-4.5 w-4.5" />
            </div>
            <div className="pointer-events-none absolute -top-10 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">
              Intelligence Space
            </div>
          </button>
          <Separator orientation="vertical" className="mx-1 h-6" />
          <div className="group relative">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Duplicate"
              disabled={!selectedBlock}
              onClick={() => selectedBlock && handleDuplicateBlock(selectedBlock.id)}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <div className="pointer-events-none absolute -top-9 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">
              Duplicate
            </div>
          </div>
          <div className="group relative">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Save Block"
              disabled={!selectedBlock}
              onClick={() => selectedBlock && handleSaveBlockToLibrary(selectedBlock.id)}
            >
              <Save className="h-4 w-4" />
            </Button>
            <div className="pointer-events-none absolute -top-9 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">
              Save Block
            </div>
          </div>
          <div className="group relative">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Remove"
              disabled={!selectedBlock}
              onClick={() => selectedBlock && handleDeleteBlock(selectedBlock.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <div className="pointer-events-none absolute -top-9 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">
              Remove
            </div>
          </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Blocks className="h-4 w-4 text-rose-600" />
              Library
            </CardTitle>
            <CardDescription>
              Content blocks, smart commerce sets, and saved snippets for lifecycle emails.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ScrollArea className={`${libraryScrollHeightClass} pr-3`}>
              <div className="space-y-4">
                <div>
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Smart Blocks
                  </p>
                  <div className="space-y-2">
                    {BLOCK_LIBRARY.map((item) => (
                      <button
                        key={item.type}
                        onClick={() => handleAddBlock(item.type)}
                        className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-rose-200 hover:bg-rose-50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900">{item.name}</p>
                            <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.description}</p>
                          </div>
                          <Plus className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Saved To Library
                  </p>
                  <div className="space-y-2">
                    {libraryBlocks.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-muted-foreground">
                        Save blocks from the canvas for reuse across campaigns.
                      </div>
                    ) : (
                      libraryBlocks.map((block) => (
                        <button
                          key={block.id}
                          onClick={() => {
                            const clone = { ...block, id: makeId('block') };
                            updateDocument((current) => ({ ...current, blocks: [...current.blocks, clone] }));
                            setSelectedBlockId(clone.id);
                          }}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-slate-300 hover:bg-white"
                        >
                          <p className="font-medium text-slate-900">{block.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{block.type}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="space-y-3 pb-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <Input
                  value={document.name}
                  onChange={(event) => updateDocument((current) => ({ ...current, name: event.target.value }))}
                  className="max-w-md text-base font-semibold"
                  placeholder="Email design name"
                />
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">Body</Badge>
                  <span>/</span>
                  <Badge variant="secondary">{selectedBlock?.name || 'No block selected'}</Badge>
                  <Badge variant="outline">Drag blocks to reorder</Badge>
                  {selectedBlock?.logic.enabled ? (
                    <Badge className="bg-violet-100 text-violet-700">Logic Active</Badge>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    onClick={() => updateDocument((current) => ({ ...current, viewport: 'desktop' }))}
                    className={`rounded-lg px-3 py-2 text-sm ${document.viewport === 'desktop' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                  >
                    <Laptop className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => updateDocument((current) => ({ ...current, viewport: 'mobile' }))}
                    className={`rounded-lg px-3 py-2 text-sm ${document.viewport === 'mobile' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                  >
                    <Smartphone className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    onClick={() => updateDocument((current) => ({ ...current, surface: 'light' }))}
                    className={`rounded-lg px-3 py-2 text-sm ${document.surface === 'light' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                  >
                    <Monitor className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => updateDocument((current) => ({ ...current, surface: 'dark' }))}
                    className={`rounded-lg px-3 py-2 text-sm ${document.surface === 'dark' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                  >
                    <Moon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-2.5 lg:grid-cols-[1fr_220px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={contactQuery}
                  onChange={(event) => setContactQuery(event.target.value)}
                  className="pl-9"
                  placeholder="Preview as contact name, company, or email"
                />
              </div>
              <Select
                value={document.previewRecipientId}
                onValueChange={(value) => updateDocument((current) => ({ ...current, previewRecipientId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose preview contact" />
                </SelectTrigger>
                <SelectContent>
                  {filteredRecipients.map((recipient) => (
                    <SelectItem key={recipient.id} value={recipient.id}>
                      {recipient.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent>
            <div className={canvasShellClass}>
              <div
                className={`mx-auto overflow-hidden rounded-[24px] border border-slate-200 shadow-sm ${previewWidthClass}`}
                style={{ backgroundColor: previewBackground }}
              >
                <div className="border-b border-white/10 px-6 py-4" style={{ backgroundColor: activePreset.primary }}>
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/70">Preview</p>
                  <p className="mt-1 text-lg font-semibold text-white">{injectVariables(document.subjectLine, previewRecipient)}</p>
                  <p className="mt-1 text-sm text-white/80">{injectVariables(document.previewText, previewRecipient)}</p>
                </div>

                <div
                  className={canvasBlocksClass}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'copy';
                  }}
                  onDrop={handleCanvasDropAtEnd}
                >
                  {document.blocks.map((block) => {
                    const isSelected = block.id === selectedBlockId;
                    const visible = evaluateLogic(block, previewRecipient);
                    const bodyCopy = injectVariables(block.content, previewRecipient, block.logic.fallback);
                    const subtitle = block.subtitle
                      ? injectVariables(block.subtitle, previewRecipient, block.logic.fallback)
                      : '';
                    const alignment =
                      block.styles.align === 'center'
                        ? 'center'
                        : block.styles.align === 'right'
                          ? 'right'
                          : 'left';

                    return (
                      <div
                        key={block.id}
                        onClick={() => setSelectedBlockId(block.id)}
                        draggable
                        onDragStart={(event) => {
                          setDraggedBlockId(block.id);
                          event.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          const toolType = event.dataTransfer.getData(TOOL_DROP_MIME);
                          if (toolType && isBlockType(toolType)) {
                            insertBlockAt(toolType, block.id);
                            return;
                          }
                          handleBlockDrop(block.id);
                        }}
                        onDragEnd={() => setDraggedBlockId(null)}
                        className={`group cursor-move rounded-[20px] border p-4 transition ${isSelected ? 'border-rose-300 shadow-sm ring-2 ring-rose-100' : 'border-slate-200 hover:border-slate-300'} ${draggedBlockId === block.id ? 'opacity-60' : ''}`}
                        style={{
                          backgroundColor: block.styles.background || previewCardBackground,
                          color: block.styles.textColor,
                          padding: `${block.styles.padding}px`,
                          textAlign: alignment as 'left' | 'center' | 'right',
                          opacity: visible ? 1 : 0.55,
                        }}
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">{block.name}</Badge>
                            {block.logic.enabled ? (
                              <Badge className="bg-violet-100 text-violet-700">
                                <GitBranch className="mr-1 h-3 w-3" />
                                IF {block.logic.field} {block.logic.operator} {block.logic.value}
                              </Badge>
                            ) : null}
                            {!visible ? <Badge variant="outline">Hidden for preview contact</Badge> : null}
                          </div>

                          <div className="flex items-center gap-1 opacity-100 xl:opacity-0 xl:group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedBlockId(block.id);
                                setInspectorTab('styles');
                                setShowMetrics(false);
                                setIsIntelligenceOpen(true);
                              }}
                              aria-label="Edit block"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); handleDuplicateBlock(block.id); }}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); handleSaveBlockToLibrary(block.id); }}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); handleDeleteBlock(block.id); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {block.type === 'heading' ? (
                          <div>
                            <h3 className="text-3xl font-semibold leading-tight">{bodyCopy}</h3>
                            {subtitle ? <p className="mt-2 text-sm opacity-80">{subtitle}</p> : null}
                          </div>
                        ) : null}

                        {block.type === 'text' || block.type === 'conditional' ? (
                          <p className="text-sm leading-7">{bodyCopy}</p>
                        ) : null}

                        {block.type === 'button' ? (
                          <div>
                            <p className="mb-4 text-sm opacity-80">{bodyCopy}</p>
                            <div className="inline-flex rounded-full px-5 py-3 text-sm font-medium text-white" style={{ backgroundColor: block.styles.accentColor }}>
                              {block.ctaLabel || 'Open'}
                            </div>
                          </div>
                        ) : null}

                        {block.type === 'image' ? (
                          <div className="space-y-3">
                            <img
                              src={document.surface === 'dark' && block.darkAssetUrl ? block.darkAssetUrl : block.content}
                              alt={block.name}
                              className="h-52 w-full rounded-2xl object-cover"
                            />
                            <p className="text-xs opacity-70">Dark mode asset ready for 2026 inbox rendering.</p>
                          </div>
                        ) : null}

                        {block.type === 'product-grid' ? (
                          <div className="space-y-4">
                            <div>
                              <p className="text-lg font-semibold">{bodyCopy}</p>
                              <p className="text-sm opacity-80">Predicted from {previewRecipient.favoriteCategory} activity.</p>
                            </div>
                            <div className="grid gap-3 md:grid-cols-3">
                              {(block.products || []).map((product) => (
                                <div key={product.name} className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 text-left text-slate-900">
                                  <p className="font-medium">{product.name}</p>
                                  <p className="mt-1 text-xs text-slate-500">{product.description}</p>
                                  <p className="mt-3 text-sm font-semibold" style={{ color: activePreset.primary }}>{product.price}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {block.type === 'quote' ? (
                          <blockquote className="rounded-2xl border-l-4 bg-white/70 p-4 italic" style={{ borderColor: block.styles.accentColor }}>
                            {bodyCopy}
                          </blockquote>
                        ) : null}

                        {block.type === 'divider' ? (
                          <div className="h-px w-full" style={{ backgroundColor: block.styles.accentColor }} />
                        ) : null}

                        {block.type === 'spacer' ? (
                          <div className="rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-400" style={{ padding: `${Number(block.content) || 32}px 0` }}>
                            Spacer {Number(block.content) || 32}px
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <Tabs defaultValue="mjml" className="mt-6">
              <TabsList>
                <TabsTrigger value="mjml">MJML Output</TabsTrigger>
                <TabsTrigger value="tracking">Tracking Notes</TabsTrigger>
              </TabsList>
              <TabsContent value="mjml" className="mt-4">
                <div className="rounded-2xl bg-slate-950 p-4">
                  <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-slate-200">
                    {mjmlMarkup}
                  </pre>
                </div>
              </TabsContent>
              <TabsContent value="tracking" className="mt-4">
                <div className="grid gap-4 lg:grid-cols-3">
                  <Card className="bg-slate-50">
                    <CardContent className="p-4 text-sm text-slate-600">
                      Saved drafts persist inside campaign metadata, so existing send, open, click, and revenue metrics keep working without a separate tracking layer.
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-50">
                    <CardContent className="p-4 text-sm text-slate-600">
                      Preview contact data mirrors the variable picker so QA can verify merge-tag fallbacks before the campaign is scheduled or sent.
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-50">
                    <CardContent className="p-4 text-sm text-slate-600">
                      Dark mode asset inputs are available per image block so logos and product visuals remain legible in Outlook and iOS Mail dark rendering.
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {isFinishedPreviewOpen ? (
          <>
            <div
              className="fixed inset-0 z-[55] bg-slate-950/50"
              onClick={() => setIsFinishedPreviewOpen(false)}
            />
            <Card className="fixed inset-4 z-[60] overflow-y-auto border-slate-200 bg-slate-100 shadow-2xl">
              <CardHeader className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Eye className="h-4 w-4 text-sky-600" />
                      Finished Email Preview
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Final recipient view with live merge data and conditional visibility applied.
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setIsFinishedPreviewOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div
                  className={`mx-auto overflow-hidden rounded-[24px] border border-slate-200 shadow-sm ${previewWidthClass}`}
                  style={{ backgroundColor: previewBackground }}
                >
                  <div className="border-b border-white/10 px-6 py-4" style={{ backgroundColor: activePreset.primary }}>
                    <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/70">Final</p>
                    <p className="mt-1 text-lg font-semibold text-white">{injectVariables(document.subjectLine, previewRecipient)}</p>
                    <p className="mt-1 text-sm text-white/80">{injectVariables(document.previewText, previewRecipient)}</p>
                  </div>

                  <div className="space-y-4 p-5">
                    {document.blocks.map((block) => {
                      const visible = evaluateLogic(block, previewRecipient);
                      if (!visible) return null;

                      const bodyCopy = injectVariables(block.content, previewRecipient, block.logic.fallback);
                      const subtitle = block.subtitle
                        ? injectVariables(block.subtitle, previewRecipient, block.logic.fallback)
                        : '';
                      const alignment =
                        block.styles.align === 'center'
                          ? 'center'
                          : block.styles.align === 'right'
                            ? 'right'
                            : 'left';

                      return (
                        <div
                          key={block.id}
                          className="rounded-[20px] border border-slate-200 p-4"
                          style={{
                            backgroundColor: block.styles.background || previewCardBackground,
                            color: block.styles.textColor,
                            padding: `${block.styles.padding}px`,
                            textAlign: alignment as 'left' | 'center' | 'right',
                          }}
                        >
                          {block.type === 'heading' ? (
                            <div>
                              <h3 className="text-3xl font-semibold leading-tight">{bodyCopy}</h3>
                              {subtitle ? <p className="mt-2 text-sm opacity-80">{subtitle}</p> : null}
                            </div>
                          ) : null}

                          {block.type === 'text' || block.type === 'conditional' ? (
                            <p className="text-sm leading-7">{bodyCopy}</p>
                          ) : null}

                          {block.type === 'button' ? (
                            <div>
                              <p className="mb-4 text-sm opacity-80">{bodyCopy}</p>
                              <div className="inline-flex rounded-full px-5 py-3 text-sm font-medium text-white" style={{ backgroundColor: block.styles.accentColor }}>
                                {block.ctaLabel || 'Open'}
                              </div>
                            </div>
                          ) : null}

                          {block.type === 'image' ? (
                            <img
                              src={document.surface === 'dark' && block.darkAssetUrl ? block.darkAssetUrl : block.content}
                              alt={block.name}
                              className="h-52 w-full rounded-2xl object-cover"
                            />
                          ) : null}

                          {block.type === 'product-grid' ? (
                            <div className="space-y-4">
                              <div>
                                <p className="text-lg font-semibold">{bodyCopy}</p>
                                <p className="text-sm opacity-80">Predicted from {previewRecipient.favoriteCategory} activity.</p>
                              </div>
                              <div className="grid gap-3 md:grid-cols-3">
                                {(block.products || []).map((product) => (
                                  <div key={product.name} className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 text-left text-slate-900">
                                    <p className="font-medium">{product.name}</p>
                                    <p className="mt-1 text-xs text-slate-500">{product.description}</p>
                                    <p className="mt-3 text-sm font-semibold" style={{ color: activePreset.primary }}>{product.price}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {block.type === 'quote' ? (
                            <blockquote className="rounded-2xl border-l-4 bg-white/70 p-4 italic" style={{ borderColor: block.styles.accentColor }}>
                              {bodyCopy}
                            </blockquote>
                          ) : null}

                          {block.type === 'divider' ? (
                            <div className="h-px w-full" style={{ backgroundColor: block.styles.accentColor }} />
                          ) : null}

                          {block.type === 'spacer' ? (
                            <div style={{ padding: `${Number(block.content) || 32}px 0` }} />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}

        {isIntelligenceOpen ? (
          <>
            <div
              className="fixed inset-0 z-40 bg-slate-950/30"
              onClick={() => setIsIntelligenceOpen(false)}
            />
            <Card className="fixed right-4 top-20 z-50 h-[calc(100vh-6rem)] w-[min(96vw,420px)] overflow-y-auto border-slate-200 shadow-2xl">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wand2 className="h-4 w-4 text-violet-600" />
                  Intelligence Space
                </CardTitle>
                <CardDescription className="mt-1">
                  Contextual styles, CRM data, and logic mapping for the selected block.
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsIntelligenceOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={inspectorTab} onValueChange={(value) => setInspectorTab(value as InspectorTab)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="styles">Styles</TabsTrigger>
                <TabsTrigger value="logic">Data & Logic</TabsTrigger>
                <TabsTrigger value="context">CRM Brain</TabsTrigger>
              </TabsList>

              <TabsContent value="styles" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Brand preset</label>
                  <Select value={document.brandPreset} onValueChange={applyBrandPreset}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BRAND_PRESETS.map((preset) => (
                        <SelectItem key={preset.name} value={preset.name}>
                          {preset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">Brand palette lock</p>
                      <p className="text-xs text-slate-500">Keep content on-brand across quick edits.</p>
                    </div>
                    <button
                      onClick={() => updateDocument((current) => ({ ...current, paletteLocked: !current.paletteLocked }))}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium ${document.paletteLocked ? 'bg-rose-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                    >
                      {document.paletteLocked ? 'Locked' : 'Unlocked'}
                    </button>
                  </div>
                </div>

                {selectedBlock ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Background</label>
                        <Input
                          value={selectedBlock.styles.background}
                          onChange={(event) => updateSelectedBlock((block) => ({ ...block, styles: { ...block.styles, background: event.target.value } }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Text color</label>
                        <Input
                          value={selectedBlock.styles.textColor}
                          onChange={(event) => updateSelectedBlock((block) => ({ ...block, styles: { ...block.styles, textColor: event.target.value } }))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Accent color</label>
                        <Input
                          value={selectedBlock.styles.accentColor}
                          onChange={(event) => updateSelectedBlock((block) => ({ ...block, styles: { ...block.styles, accentColor: event.target.value } }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Padding</label>
                        <Input
                          type="number"
                          value={String(selectedBlock.styles.padding)}
                          onChange={(event) => updateSelectedBlock((block) => ({ ...block, styles: { ...block.styles, padding: Number(event.target.value) || 0 } }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Alignment</label>
                      <Select
                        value={selectedBlock.styles.align}
                        onValueChange={(value) => updateSelectedBlock((block) => ({ ...block, styles: { ...block.styles, align: value as BlockStyles['align'] } }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : null}
              </TabsContent>

              <TabsContent value="logic" className="mt-4 space-y-4">
                {selectedBlock ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Subject line</label>
                      <Input
                        value={document.subjectLine}
                        onChange={(event) => updateDocument((current) => ({ ...current, subjectLine: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Preview text</label>
                      <Textarea
                        value={document.previewText}
                        onChange={(event) => updateDocument((current) => ({ ...current, previewText: event.target.value }))}
                        rows={3}
                      />
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">Conditional visibility</p>
                          <p className="text-xs text-slate-500">Display this block only when a CRM rule matches.</p>
                        </div>
                        <button
                          onClick={() => updateSelectedBlock((block) => ({ ...block, logic: { ...block.logic, enabled: !block.logic.enabled } }))}
                          className={`rounded-full px-3 py-1.5 text-xs font-medium ${selectedBlock.logic.enabled ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                        >
                          {selectedBlock.logic.enabled ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Field</label>
                        <Select
                          value={selectedBlock.logic.field}
                          onValueChange={(value) => updateSelectedBlock((block) => ({ ...block, logic: { ...block.logic, field: value } }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="leadStatus">Lead Status</SelectItem>
                            <SelectItem value="company">Company</SelectItem>
                            <SelectItem value="lastPurchase">Last Purchase</SelectItem>
                            <SelectItem value="lifetimeValue">Lifetime Value</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Operator</label>
                        <Select
                          value={selectedBlock.logic.operator}
                          onValueChange={(value) => updateSelectedBlock((block) => ({ ...block, logic: { ...block.logic, operator: value as LogicOperator } }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="equals">Equals</SelectItem>
                            <SelectItem value="not_equals">Does not equal</SelectItem>
                            <SelectItem value="contains">Contains</SelectItem>
                            <SelectItem value="greater_than">Greater than</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Rule value</label>
                      <Input
                        value={selectedBlock.logic.value}
                        onChange={(event) => updateSelectedBlock((block) => ({ ...block, logic: { ...block.logic, value: event.target.value } }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Fallback value</label>
                      <Input
                        value={selectedBlock.logic.fallback}
                        onChange={(event) => updateSelectedBlock((block) => ({ ...block, logic: { ...block.logic, fallback: event.target.value } }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Variable picker</label>
                      <div className="flex flex-wrap gap-2">
                        {VARIABLE_OPTIONS.map((option) => (
                          <button
                            key={option.token}
                            onClick={() => updateSelectedBlock((block) => ({ ...block, content: `${block.content} ${option.token}`.trim() }))}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 transition hover:border-rose-200 hover:bg-rose-50"
                          >
                            <Variable className="mr-1 inline h-3 w-3" />
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Block content</label>
                      <Textarea
                        value={selectedBlock.content}
                        onChange={(event) => updateSelectedBlock((block) => ({ ...block, content: event.target.value }))}
                        rows={6}
                      />
                    </div>

                    {selectedBlock.type === 'image' ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-medium text-slate-900">Upload from your computer</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Choose image files from your device for both default and dark mode rendering.
                        </p>
                        <div className="mt-3 grid gap-3">
                          <div className="space-y-2">
                            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Primary image</label>
                            <Input
                              type="file"
                              accept="image/*"
                              disabled={isUploadingImage}
                              onChange={(event) => {
                                void handleImageUpload(event, 'light');
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Dark mode image</label>
                            <Input
                              type="file"
                              accept="image/*"
                              disabled={isUploadingImage}
                              onChange={(event) => {
                                void handleImageUpload(event, 'dark');
                              }}
                            />
                          </div>
                        </div>
                        {isUploadingImage ? (
                          <p className="mt-3 text-xs text-slate-500">Uploading image to Supabase Storage...</p>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </TabsContent>

              <TabsContent value="context" className="mt-4 space-y-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-emerald-950">Live CRM Context</p>
                      <p className="text-xs text-emerald-800">
                        Previewing as {previewRecipient.name}
                        {previewRecipient.source === 'crm' ? ' (from CRM contacts)' : ' (sample profile)'}
                      </p>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700">{previewRecipient.leadStatus}</Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-white/70 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">LTV</p>
                      <p className="mt-1 font-semibold text-slate-900">${previewRecipient.lifetimeValue.toLocaleString()}</p>
                    </div>
                    <div className="rounded-xl bg-white/70 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Last Purchase</p>
                      <p className="mt-1 font-semibold text-slate-900">{previewRecipient.lastPurchase}</p>
                    </div>
                    <div className="rounded-xl bg-white/70 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Company</p>
                      <p className="mt-1 font-semibold text-slate-900">{previewRecipient.company}</p>
                    </div>
                    <div className="rounded-xl bg-white/70 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Favorite Category</p>
                      <p className="mt-1 font-semibold text-slate-900">{previewRecipient.favoriteCategory}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                    <BrushCleaning className="h-4 w-4 text-sky-600" />
                    Variable search
                  </div>
                  <div className="mt-3 space-y-2">
                    {VARIABLE_OPTIONS.map((option) => (
                      <div key={option.token} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm">
                        <span>{option.label}</span>
                        <code className="text-xs text-slate-500">{option.token}</code>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                    <Activity className="h-4 w-4 text-violet-600" />
                    Delivery notes
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    <li>Use dark-mode specific logos for hero images and transparent marks.</li>
                    <li>Fallback values prevent blank CRM tokens in sends and previews.</li>
                    <li>Campaign analytics continue in the existing dashboard once the draft is sent.</li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-muted-foreground">
          Loading email campaigns...
        </div>
      ) : null}
    </div>
  );
}