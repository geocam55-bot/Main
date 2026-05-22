import React, { useState, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';
import { ThemeSelector } from './ThemeSelector';
import { ProjectWizardSettings } from './ProjectWizardSettings';
import { DataDiagnostic } from './DataDiagnostic';
import { AIToggleSwitch } from './AIToggleSwitch';
import { PlannerDefaultsMigrationStatus } from './PlannerDefaultsMigrationStatus';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Alert, AlertDescription } from './ui/alert';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Building2, 
  Camera, 
  Upload, 
  X, 
  DollarSign, 
  Shield, 
  Palette, 
  CheckCircle2, 
  AlertCircle,
  LayoutGrid,
  Monitor,
  Grid,
  Eye,
  Users,
  Plus,
  Trash2,
  Loader2,
  Hammer,
  Sun,
  Moon,
} from 'lucide-react';
import type { User } from '../App';
import { tenantsAPI, settingsAPI } from '../utils/api';
import { DEFAULT_PRICE_TIER_LABELS, type PriceTierLabels, getPriceTierLabel, getActivePriceLevels, AVAILABLE_MODULES } from '../lib/global-settings';
import { buildCustomText, type CustomExportField, type CustomExportTemplate } from '../utils/export-engine';

// Utility: wrap a promise with a timeout to prevent infinite hangs
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`[Settings] Timeout: ${label} took longer than ${ms}ms`));
    }, ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

// Safety-net timeout (ms) for the entire settings load
const SETTINGS_LOAD_TIMEOUT = 15000;
// Per-call timeout for each API call
const API_CALL_TIMEOUT = 8000;

const EXPORT_FIELD_KEY_OPTIONS = [
  { value: 'quote_number', label: 'Quote Number' },
  { value: 'title', label: 'Title' },
  { value: 'contact_name', label: 'Contact Name' },
  { value: 'contact_email', label: 'Contact Email' },
  { value: 'total', label: 'Total' },
  { value: 'status', label: 'Status' },
  { value: 'created_at', label: 'Created At' },
  { value: 'updated_at', label: 'Updated At' },
  { value: 'design_name', label: 'Design Name' },
  { value: 'project_type', label: 'Project Type' },
  { value: 'material_name', label: 'Material Name' },
  { value: 'quantity', label: 'Quantity' },
  { value: 'sku', label: 'SKU (Inventory)' },
  { value: 'itemName', label: 'Item Name (Quote Line Item)' },
  { value: 'itemId', label: 'Item ID (Inventory)' },
  { value: 'unitPrice', label: 'Unit Price (Quote Line Item)' },
  { value: 'lineTotal', label: 'Line Total (Quote Line Item)' },
  { value: 'price_tier', label: 'Price Tier' },
  { value: 'valid_until', label: 'Valid Until' },
  { value: 'notes', label: 'Notes' },
  { value: 'terms', label: 'Terms' },
] as const;

interface SettingsProps {
  user: User;
  organization: any | null;
  onUserUpdate?: (updatedUser: User) => void;
  onOrganizationUpdate?: (updatedOrganization: any) => void;
}

import { EmailDebug } from './EmailDebug';
import { SubscriptionBilling } from './subscription/SubscriptionBilling';
import { BillingPlanConfig } from './subscription/BillingPlanConfig';
import { ApiAccess } from './subscription/ApiAccess';
import { useSubscription } from '../hooks/useSubscription';
import { getOrgMode, setOrgMode } from '../utils/settings-client';
import type { OrgUserMode } from '../utils/settings-client';
import { WorkflowSettingsDialog } from './settings/WorkflowSettingsDialog';
import { useTheme, type ThemeMode } from './ThemeProvider';
import { CustomFieldsDialog } from './settings/CustomFieldsDialog';
import { SettingsModuleHelp } from './SettingsModuleHelp';
import { resetGettingStarted } from './GettingStarted';

function ThemeModeCard() {
  const { themeMode, setThemeMode, theme } = useTheme();

  const modes: { value: ThemeMode; label: string; icon: React.ReactNode; description: string }[] = [
    {
      value: 'light',
      label: 'Light',
      icon: <Sun className="h-5 w-5" />,
      description: 'Always use a light theme',
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: <Moon className="h-5 w-5" />,
      description: 'Always use a dark theme',
    },
    {
      value: 'system',
      label: 'System',
      icon: <Monitor className="h-5 w-5" />,
      description: 'Match your device settings',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <Palette className="h-5 w-5" />
          Theme Mode
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          Choose how ProSpaces CRM looks to you. Select a single theme mode or sync with your system settings.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {modes.map((mode) => {
            const isActive = themeMode === mode.value;
            return (
              <div
                key={mode.value}
                role="button"
                tabIndex={0}
                onClick={() => setThemeMode(mode.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setThemeMode(mode.value);
                  }
                }}
                className={`relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-all ${
                  isActive
                    ? 'border-[var(--color-primary)] shadow-md'
                    : 'border-[var(--color-border)] hover:border-[var(--color-border-light)]'
                }`}
                style={{
                  backgroundColor: isActive ? 'var(--color-background-secondary)' : 'var(--color-background)',
                }}
              >
                <div
                  className={`rounded-full p-2.5 transition-colors ${
                    isActive ? 'text-[var(--color-primary-text)]' : ''
                  }`}
                  style={{
                    backgroundColor: isActive ? 'var(--color-primary)' : 'var(--color-background-tertiary)',
                    color: isActive ? 'var(--color-primary-text)' : 'var(--color-text-secondary)',
                  }}
                >
                  {mode.icon}
                </div>
                <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>
                  {mode.label}
                </span>
                <span className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
                  {mode.description}
                </span>
                {isActive && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>
          {themeMode === 'system'
            ? `Currently using ${theme.isDark ? 'dark' : 'light'} mode based on your system preference.`
            : `You can further customize your theme in the Appearance tab.`}
        </p>
      </CardContent>
    </Card>
  );
}

export function Settings({ user, organization, onUserUpdate, onOrganizationUpdate }: SettingsProps) {
  const [activeTab, setActiveTab] = useState('profile');
  const [orgName, setOrgName] = useState('ProSpaces Organization');
  const [profileData, setProfileData] = useState({
    name: user.full_name || user.email || '',
    profilePicture: user.avatar_url || '',
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingGlobal, setIsSavingGlobal] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [isSavingOrg, setIsSavingOrg] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showDatabaseWarning, setShowDatabaseWarning] = useState(false);
  const [showLayoutDialog, setShowLayoutDialog] = useState(false);
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false);
  const [showCustomFieldsDialog, setShowCustomFieldsDialog] = useState(false);
  const [isResettingHelpTours, setIsResettingHelpTours] = useState(false);
  const [planRefreshKey, setPlanRefreshKey] = useState(0);
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    taskAssignments: true,
    appointments: true,
    bids: true,
  });

  // Layout configuration state
  const [layoutConfig, setLayoutConfig] = useState({
    dashboardDensity: 'comfortable',
    sidebarPosition: 'left',
    moduleCardSize: 'medium',
    showModuleIcons: true,
    compactMode: false,
    tableRowHeight: 'medium',
  });

  // Global Organization Settings
  const [globalSettings, setGlobalSettings] = useState({
    taxRate: 0,
    taxRate2: 0,
    defaultPriceLevel: getPriceTierLabel(1),
    quoteTerms: 'Payment due within 30 days. All prices in USD.',
    audienceSegments: ['VIP', 'New Lead', 'Active Customer', 'Inactive', 'Prospect'], // Marketing segments
    priceTierLabels: { ...DEFAULT_PRICE_TIER_LABELS } as PriceTierLabels,
    userInviteMethod: 'email', // 'manual' or 'email'
    exportTemplates: [] as CustomExportTemplate[],
  });

  // Organization user mode (single/multi)
  const [userMode, setUserMode] = useState<OrgUserMode>('single');
  const [isSavingUserMode, setIsSavingUserMode] = useState(false);

  // Subscription feature gating (for API Access tab)
  const { hasFeature: subHasFeature } = useSubscription();

  // New segment input
  const [newSegment, setNewSegment] = useState('');
  const [newExportTemplate, setNewExportTemplate] = useState<CustomExportTemplate>({
    id: '',
    name: '',
    description: '',
    module: 'all',
    enabled: true,
    file_extension: 'txt',
    layout_mode: 'fixed',
    delimiter: '|',
    header_lines: [],
    detail_fields: [
      {
        key: 'quote_number',
        label: 'Quote Number',
        start: 1,
        length: 20,
        align: 'left',
        pad_char: ' ',
      },
    ],
    include_column_headers: true,
  });
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  // Load settings from Supabase on mount
  useEffect(() => {
    loadSettingsFromSupabase();

    // Safety-net: if loading takes too long, force it to complete with localStorage fallback
    const safetyTimer = setTimeout(() => {
      setIsLoading((prev) => {
        if (prev) {
          loadSettingsFromLocalStorage();
          setShowDatabaseWarning(true);
        }
        return false;
      });
    }, SETTINGS_LOAD_TIMEOUT);

    return () => clearTimeout(safetyTimer);
  }, [user.id, user.organizationId]);

  const loadSettingsFromSupabase = async () => {
    try {
      setIsLoading(true);
      setShowDatabaseWarning(false);

      // Guard: if organizationId is missing, skip API calls and use localStorage
      if (!user.organizationId) {
        loadSettingsFromLocalStorage();
        return;
      }

      // Load user preferences (with timeout protection)
      let userPrefs = null;
      try {
        userPrefs = await withTimeout(
          settingsAPI.getUserPreferences(user.id, user.organizationId),
          API_CALL_TIMEOUT,
          'getUserPreferences'
        );
      } catch (prefErr) {
      }
      
      if (userPrefs) {
        setNotifications({
          email: userPrefs.notifications_email ?? true,
          push: userPrefs.notifications_push ?? true,
          taskAssignments: userPrefs.notifications_task_assignments ?? true,
          appointments: userPrefs.notifications_appointments ?? true,
          bids: userPrefs.notifications_bids ?? true,
        });
        
        // Load profile picture from Supabase
        if (userPrefs.profile_picture) {
          setProfileData(prev => ({ ...prev, profilePicture: userPrefs.profile_picture || '' }));
        }
      } else {
        // Fallback to localStorage for user preferences
        loadSettingsFromLocalStorage();
      }

      // Load organization settings (with timeout protection)
      let orgSettings = null;
      try {
        orgSettings = await withTimeout(
          settingsAPI.getOrganizationSettings(user.organizationId),
          API_CALL_TIMEOUT,
          'getOrganizationSettings'
        );
      } catch (orgErr) {
      }

      if (orgSettings) {
        // price_tier_labels may not exist as a DB column yet.
        // Merge from localStorage so custom labels aren't lost.
        const orgId = localStorage.getItem('currentOrgId') || user.organizationId;
        let storedPriceTierLabels: PriceTierLabels | null = null;
        let storedExportTemplates: CustomExportTemplate[] | null = null;
        try {
          const stored = localStorage.getItem(`global_settings_${orgId}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.priceTierLabels) storedPriceTierLabels = parsed.priceTierLabels;
            if (Array.isArray(parsed.exportTemplates)) storedExportTemplates = parsed.exportTemplates;
          }
        } catch (_) { /* ignore parse errors */ }

        setGlobalSettings({
          taxRate: orgSettings.tax_rate ?? 0,
          taxRate2: orgSettings.tax_rate_2 ?? 0,
          defaultPriceLevel: orgSettings.default_price_level || getPriceTierLabel(1),
          quoteTerms: orgSettings.quote_terms || 'Payment due within 30 days. All prices in USD.',
          audienceSegments: orgSettings.audience_segments || ['VIP', 'New Lead', 'Active Customer', 'Inactive', 'Prospect'],
          priceTierLabels: orgSettings.price_tier_labels || storedPriceTierLabels || { ...DEFAULT_PRICE_TIER_LABELS },
          userInviteMethod: orgSettings.user_invite_method || 'email',
          exportTemplates:
            Array.isArray(orgSettings.export_templates) && orgSettings.export_templates.length > 0
              ? orgSettings.export_templates
              : (storedExportTemplates || orgSettings.export_templates || []),
        });
        
        // Load organization name
        if (orgSettings.organization_name) {
          setOrgName(orgSettings.organization_name);
        }
      } else {
        // Fallback to localStorage for org settings
        const orgId = localStorage.getItem('currentOrgId') || user.organizationId;
        const stored = localStorage.getItem(`global_settings_${orgId}`);
        if (stored) {
          try {
            const parsedSettings = JSON.parse(stored);
            setGlobalSettings({
              taxRate: parsedSettings.taxRate || 0,
              taxRate2: parsedSettings.taxRate2 || 0,
              defaultPriceLevel: parsedSettings.defaultPriceLevel || getPriceTierLabel(1),
              quoteTerms: parsedSettings.quoteTerms || 'Payment due within 30 days. All prices in USD.',
              audienceSegments: parsedSettings.audienceSegments || ['VIP', 'New Lead', 'Active Customer', 'Inactive', 'Prospect'],
              priceTierLabels: parsedSettings.priceTierLabels || { ...DEFAULT_PRICE_TIER_LABELS },
              userInviteMethod: parsedSettings.userInviteMethod || 'email',
              exportTemplates: parsedSettings.exportTemplates || [],
            });
          } catch (_) { /* ignore parse errors */ }
        }
        
        // Try to get org name from organizations table (also with timeout)
        try {
          const { tenant } = await withTimeout(
            tenantsAPI.getById(user.organizationId),
            API_CALL_TIMEOUT,
            'getOrgName'
          );
          if (tenant) {
            setOrgName(tenant.name);
          }
        } catch (err) {
        }
      }

      // Load organization user mode from KV store
      try {
        const orgModeData = await withTimeout(
          getOrgMode(user.organizationId),
          API_CALL_TIMEOUT,
          'getOrgMode'
        );
        if (orgModeData?.user_mode) {
          setUserMode(orgModeData.user_mode);
        }
      } catch (modeErr) {
      }

    } catch (error) {
      // Fallback to localStorage if Supabase fails
      loadSettingsFromLocalStorage();
      setShowDatabaseWarning(true);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSettingsFromLocalStorage = () => {
    // Fallback: Load from localStorage
    try {
      const orgId = localStorage.getItem('currentOrgId') || user.organizationId;
      const stored = localStorage.getItem(`global_settings_${orgId}`);
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        setGlobalSettings({
          taxRate: parsedSettings.taxRate || 0,
          taxRate2: parsedSettings.taxRate2 || 0,
          defaultPriceLevel: parsedSettings.defaultPriceLevel || getPriceTierLabel(1),
          quoteTerms: parsedSettings.quoteTerms || 'Payment due within 30 days. All prices in USD.',
          audienceSegments: parsedSettings.audienceSegments || ['VIP', 'New Lead', 'Active Customer', 'Inactive', 'Prospect'],
          priceTierLabels: parsedSettings.priceTierLabels || { ...DEFAULT_PRICE_TIER_LABELS },
          userInviteMethod: parsedSettings.userInviteMethod || 'email',
          exportTemplates: parsedSettings.exportTemplates || [],
        });
      }
    } catch (err) {
    }
    
    // Load profile picture from localStorage as fallback
    try {
      const storedPicture = localStorage.getItem(`profile_picture_${user.id}`);
      if (storedPicture) {
        setProfileData(prev => ({ ...prev, profilePicture: storedPicture }));
      }
    } catch (err) {
    }
  };

  const resetNewExportTemplate = () => {
    setEditingTemplateId(null);
    setNewExportTemplate({
      id: '',
      name: '',
      description: '',
      module: 'all',
      enabled: true,
      file_extension: 'txt',
      layout_mode: 'fixed',
      delimiter: '|',
      header_lines: [],
      detail_fields: [
        {
          key: 'quote_number',
          label: 'Quote Number',
          start: 1,
          length: 20,
          align: 'left',
          pad_char: ' ',
        },
      ],
      include_column_headers: true,
    });
  };

  const addDetailFieldRow = () => {
    setNewExportTemplate((prev) => ({
      ...prev,
      detail_fields: [
        ...(prev.detail_fields || []),
        {
          key: '',
          label: '',
          start: 1,
          length: 10,
          align: 'left',
          pad_char: ' ',
        },
      ],
    }));
  };

  const updateDetailFieldRow = (index: number, patch: Partial<CustomExportField>) => {
    setNewExportTemplate((prev) => ({
      ...prev,
      detail_fields: (prev.detail_fields || []).map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...patch } : field
      ),
    }));
  };

  const removeDetailFieldRow = (index: number) => {
    setNewExportTemplate((prev) => ({
      ...prev,
      detail_fields: (prev.detail_fields || []).filter((_, fieldIndex) => fieldIndex !== index),
    }));
  };

  const addExportTemplate = () => {
    const templateName = newExportTemplate.name.trim();
    if (!templateName) {
      toast.error('Template name is required');
      return;
    }

    const detailFields = (newExportTemplate.detail_fields || []).filter((field) => field.key?.trim());
    if (detailFields.length === 0) {
      toast.error('Add at least one detail field with a field key');
      return;
    }

    if (newExportTemplate.layout_mode === 'fixed') {
      const invalidFixed = detailFields.some((field) => !field.start || !field.length);
      if (invalidFixed) {
        toast.error('Fixed-width templates require start and length for every detail field');
        return;
      }
    }

    const templateId =
      newExportTemplate.id ||
      (typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `tpl_${Date.now()}`);

    const template: CustomExportTemplate = {
      ...newExportTemplate,
      id: editingTemplateId || templateId,
      name: templateName,
      description: (newExportTemplate.description || '').trim(),
      detail_fields: detailFields.map((field) => ({
        ...field,
        key: field.key.trim(),
        label: (field.label || '').trim() || field.key.trim(),
      })),
      header_lines: (newExportTemplate.header_lines || []).filter((line) => line.trim()),
    };

    setGlobalSettings((prev) => ({
      ...prev,
      exportTemplates: editingTemplateId
        ? (prev.exportTemplates || []).map((existing) =>
            existing.id === editingTemplateId ? template : existing
          )
        : [...(prev.exportTemplates || []), template],
    }));
    resetNewExportTemplate();
    toast.success(
      editingTemplateId
        ? 'Export template updated. Save Module Defaults to persist.'
        : 'Export template added. Save Module Defaults to persist.'
    );
  };

  const editExportTemplate = (templateId: string) => {
    const template = (globalSettings.exportTemplates || []).find((item) => item.id === templateId);
    if (!template) return;

    setEditingTemplateId(templateId);
    setNewExportTemplate({
      ...template,
      header_lines: [...(template.header_lines || [])],
      detail_fields: (template.detail_fields || []).map((field) => ({ ...field })),
    });
  };

  const getTemplatePreview = () => {
    const sampleRows = [
      {
        quote_number: 'Q-1001',
        title: 'Sample Project',
        contact_name: 'Jane Smith',
        total: '12500.00',
        status: 'approved',
        design_name: 'Sample Design',
        project_type: 'deck',
        material_name: 'Composite Board',
        quantity: 24,
        sku: 'SKU-001',
        itemName: 'Composite Deck Board',
        itemId: 'inv-001',
        unitPrice: '35.50',
        lineTotal: '852.00',
      },
    ];

    if (newExportTemplate.layout_mode === 'fixed' || newExportTemplate.layout_mode === 'delimited') {
      return buildCustomText(sampleRows, newExportTemplate);
    }

    return '';
  };

  const removeExportTemplate = (templateId: string) => {
    const confirmed = window.confirm('Delete this custom export template?');
    if (!confirmed) return;

    setGlobalSettings((prev) => ({
      ...prev,
      exportTemplates: (prev.exportTemplates || []).filter((template) => template.id !== templateId),
    }));

    if (editingTemplateId === templateId) {
      resetNewExportTemplate();
    }

    toast.success('Export template removed. Save Module Defaults to persist.');
  };

  const toggleExportTemplateEnabled = (templateId: string) => {
    setGlobalSettings((prev) => ({
      ...prev,
      exportTemplates: (prev.exportTemplates || []).map((template) =>
        template.id === templateId ? { ...template, enabled: template.enabled === false ? true : false } : template
      ),
    }));
  };

  // Get user initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showAlert('error', 'Image size must be less than 2MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showAlert('error', 'Please upload an image file');
      return;
    }

    try {
      setIsUploading(true);

      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setProfileData({ ...profileData, profilePicture: base64String });
        
        try {
          // Save to Supabase user preferences (profile_picture)
          await settingsAPI.upsertUserPreferences({
            user_id: user.id,
            organization_id: user.organizationId,
            profile_picture: base64String,
            notifications_email: notifications.email,
            notifications_push: notifications.push,
            notifications_task_assignments: notifications.taskAssignments,
            notifications_appointments: notifications.appointments,
            notifications_bids: notifications.bids,
          });
          
          // Keep localStorage as backup
          localStorage.setItem(`profile_picture_${user.id}`, base64String);
          
          if (onUserUpdate) {
            const updatedUser: User = {
              ...user,
              avatar_url: base64String,
            };
            onUserUpdate(updatedUser);
          }
          
          showAlert('success', 'Profile picture updated successfully!');
        } catch (error) {
          showAlert('error', 'Failed to update profile picture');
        } finally {
          setIsUploading(false);
        }
      };

      reader.onerror = () => {
        showAlert('error', 'Failed to read image file');
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      showAlert('error', 'Failed to upload image');
      setIsUploading(false);
    }
  };

  const handleRemoveProfilePicture = async () => {
    try {
      setIsUploading(true);
      setProfileData({ ...profileData, profilePicture: '' });
      
      // Remove from Supabase user_preferences table
      await settingsAPI.upsertUserPreferences({
        user_id: user.id,
        organization_id: user.organizationId,
        profile_picture: '',
        notifications_email: notifications.email,
        notifications_push: notifications.push,
        notifications_task_assignments: notifications.taskAssignments,
        notifications_appointments: notifications.appointments,
        notifications_bids: notifications.bids,
      });
      
      // Remove from localStorage
      localStorage.removeItem(`profile_picture_${user.id}`);
      
      if (onUserUpdate) {
        const updatedUser: User = {
          ...user,
          avatar_url: undefined,
        };
        onUserUpdate(updatedUser);
      }
      
      showAlert('success', 'Profile picture removed successfully!');
    } catch (error) {
      showAlert('error', 'Failed to remove profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      
      // Save name and avatar_url to Supabase profiles table
      await settingsAPI.updateUserProfile(user.id, {
        name: profileData.name,
        avatar_url: profileData.profilePicture || '',
      });
      
      // Save profile picture to user_preferences table
      await settingsAPI.upsertUserPreferences({
        user_id: user.id,
        organization_id: user.organizationId,
        profile_picture: profileData.profilePicture || '',
        notifications_email: notifications.email,
        notifications_push: notifications.push,
        notifications_task_assignments: notifications.taskAssignments,
        notifications_appointments: notifications.appointments,
        notifications_bids: notifications.bids,
      });
      
      if (onUserUpdate) {
        const updatedUser: User = {
          ...user,
          full_name: profileData.name,
          avatar_url: profileData.profilePicture || undefined,
        };
        onUserUpdate(updatedUser);
      }
      
      toast.success('Profile updated successfully!');
      showAlert('success', 'Profile updated successfully!');
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to update profile. Please check console for details.';
      toast.error(errorMessage);
      showAlert('error', errorMessage);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingOrg(true);
    
    try {
      // Save organization name to Supabase
      await settingsAPI.updateOrganizationName(user.organizationId, orgName);
      
      // Also save to organization_settings table
      await settingsAPI.upsertOrganizationSettings({
        organization_id: user.organizationId,
        tax_rate: globalSettings.taxRate,
        default_price_level: globalSettings.defaultPriceLevel,
        organization_name: orgName,
      });
      
      showAlert('success', 'Organization settings saved successfully!');
    } catch (error) {
      showAlert('error', 'Failed to save organization settings');
    } finally {
      setIsSavingOrg(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsSavingNotifications(true);
    try {
      // Save notification preferences to Supabase
      await settingsAPI.upsertUserPreferences({
        user_id: user.id,
        organization_id: user.organizationId,
        notifications_email: notifications.email,
        notifications_push: notifications.push,
        notifications_task_assignments: notifications.taskAssignments,
        notifications_appointments: notifications.appointments,
        notifications_bids: notifications.bids,
        profile_picture: profileData.profilePicture,
      });
      
      showAlert('success', 'Notification preferences saved successfully!');
    } catch (error) {
      showAlert('error', 'Failed to save notification preferences');
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const handleToggleUserMode = async (newMode: OrgUserMode) => {
    setIsSavingUserMode(true);
    try {
      setUserMode(newMode);
      await setOrgMode(user.organizationId, newMode);

      // Update organization object in parent if callback available
      if (onOrganizationUpdate && organization) {
        onOrganizationUpdate({ ...organization, user_mode: newMode });
      }

      toast.success(`Organization switched to ${newMode === 'single' ? 'Single User' : 'Multi User'} mode`);
      showAlert('success', `Organization mode updated to ${newMode === 'single' ? 'Single User' : 'Multi User'}`);
    } catch (error: any) {
      // Revert on error
      setUserMode(newMode === 'single' ? 'multi' : 'single');
      const errorMessage = error?.message || 'Failed to update organization mode';
      toast.error(errorMessage);
      showAlert('error', errorMessage);
    } finally {
      setIsSavingUserMode(false);
    }
  };

  const handleSaveGlobalSettings = async () => {
    setIsSavingGlobal(true);
    try {
      // Save to Supabase
      const payload: any = {
        organization_id: user.organizationId,
        tax_rate: globalSettings.taxRate,
        tax_rate_2: globalSettings.taxRate2,
        default_price_level: globalSettings.defaultPriceLevel,
        quote_terms: globalSettings.quoteTerms,
        organization_name: orgName,
        audience_segments: globalSettings.audienceSegments, // Marketing segments
        price_tier_labels: globalSettings.priceTierLabels,
        user_invite_method: globalSettings.userInviteMethod,
      };

      if (canManageSettings) {
        payload.export_templates = globalSettings.exportTemplates;
      }

      const result = await settingsAPI.upsertOrganizationSettings(payload);
      
      // Keep localStorage as backup (always save regardless of Supabase status)
      const orgId = localStorage.getItem('currentOrgId') || user.organizationId;
      localStorage.setItem(`global_settings_${orgId}`, JSON.stringify(globalSettings));
      
      if (result) {
        showAlert('success', 'Global settings saved successfully to database!');
      } else {
        // Supabase save failed (likely tables don't exist or RLS prevents it), but localStorage worked
        showAlert('success', 'Settings saved locally. Database sync may require additional setup.');
      }
    } catch (error: any) {
      
      // Check if it's an RLS permission error
      if (error?.message?.includes('Permission denied') || error?.message?.includes('RLS')) {
        try {
          const orgId = localStorage.getItem('currentOrgId') || user.organizationId;
          localStorage.setItem(`global_settings_${orgId}`, JSON.stringify(globalSettings));
        } catch (_) {
          // ignore localStorage errors here; we still surface the backend error
        }
        showAlert('error', `Database permission error: ${error.message}\n\nYour settings have been saved locally. Please run the SQL script: SUPABASE_FIX_ORG_SETTINGS_RLS_SIMPLE.sql in your Supabase dashboard.`);
      } else {
        // Still try to save to localStorage as fallback
        try {
          const orgId = localStorage.getItem('currentOrgId') || user.organizationId;
          localStorage.setItem(`global_settings_${orgId}`, JSON.stringify(globalSettings));
          showAlert('success', 'Global settings saved locally (offline mode)');
        } catch (localError) {
          showAlert('error', 'Failed to save global settings');
        }
      }
    } finally {
      setIsSavingGlobal(false);
    }
  };

  const handleSaveAppearanceSettings = () => {
    // Theme is already auto-saved by ThemeSelector, but we can add more settings here
    toast.success('Appearance settings saved! Theme changes are applied automatically.');
  };

  const handleResetModuleHelpTours = () => {
    setIsResettingHelpTours(true);

    try {
      const userSuffix = `.${user.id}`;
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        const isHelpKey = key.startsWith('prospaces.') && key.includes('help');
        const isLegacyHelpKey =
          key.startsWith('prospaces.customer-help.') ||
          key.startsWith('prospaces.deals-help.');

        if ((isHelpKey || isLegacyHelpKey) && key.endsWith(userSuffix)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => localStorage.removeItem(key));

      // Also reset the Getting Started checklist and guided tour progress
      resetGettingStarted(user.id);
      const tourKeysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('prospaces.') && key.includes('.tour.')) {
          tourKeysToRemove.push(key);
        }
      }
      tourKeysToRemove.forEach((key) => localStorage.removeItem(key));

      if (keysToRemove.length > 0 || tourKeysToRemove.length > 0) {
        toast.success(`Reset ${keysToRemove.length + tourKeysToRemove.length} module help/tour setting(s).`);
      } else {
        toast.info('No module help tour settings were found for your account.');
      }
    } catch {
      toast.error('Failed to reset module help tours.');
    } finally {
      setIsResettingHelpTours(false);
    }
  };

  const canManageSettings = user.role === 'super_admin' || user.role === 'admin';
  const isSuperAdmin = user.role === 'super_admin';

  // Show loading spinner while settings are being fetched
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
            <p className="text-sm text-muted-foreground">Loading settings...</p>
            <p className="text-xs text-muted-foreground mt-2">
              If this takes too long, settings will load from local cache automatically.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 text-xs text-muted-foreground hover:text-muted-foreground"
              onClick={() => {
                loadSettingsFromLocalStorage();
                setShowDatabaseWarning(true);
                setIsLoading(false);
              }}
            >
              Skip and use cached settings
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <WorkflowSettingsDialog 
        open={showWorkflowDialog} 
        onOpenChange={setShowWorkflowDialog} 
        organizationId={user.organizationId}
      />
      <CustomFieldsDialog
        open={showCustomFieldsDialog}
        onOpenChange={setShowCustomFieldsDialog}
        organizationId={user.organizationId}
      />
      {/* Database Warning Banner */}
      {showDatabaseWarning && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 flex items-center justify-between gap-4">
            <span>
              Could not load settings from the database. Showing locally saved settings instead.
              Check that the <strong>organization_settings</strong> table exists in your Supabase database.
            </span>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 border-yellow-400 text-yellow-800 hover:bg-yellow-100"
              onClick={() => loadSettingsFromSupabase()}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}



      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full">
            <TabsTrigger value="profile" className="whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">Profile</TabsTrigger>
            <TabsTrigger value="notifications" className="whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">Notifications</TabsTrigger>
            {canManageSettings && <TabsTrigger value="organization" className="whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">Organization</TabsTrigger>}
            {canManageSettings && <TabsTrigger value="module-settings" className="whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">Module Defaults</TabsTrigger>}
            {canManageSettings && <TabsTrigger value="diagnostics" className="whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">Diagnostics</TabsTrigger>}
            <TabsTrigger value="appearance" className="whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">Appearance</TabsTrigger>
            {(userMode === 'single' || canManageSettings) && <TabsTrigger value="billing" className="whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">Billing</TabsTrigger>}
            {isSuperAdmin && <TabsTrigger value="billing-plans" className="whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">Billing Plans</TabsTrigger>}
            {canManageSettings && <TabsTrigger value="api-access" className="whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">API Access</TabsTrigger>}
          </TabsList>
        </div>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Profile Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue={user.email} disabled />
                <p className="text-xs text-muted-foreground">Contact support to change your email</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input id="role" defaultValue={user.role.replace('_', ' ').toUpperCase()} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organization">Organization</Label>
                <div className="flex items-center gap-2 p-3 border rounded-md bg-muted">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <Input 
                      id="organization" 
                      defaultValue={user.organizationId} 
                      disabled 
                      className="bg-transparent border-none p-0 h-auto font-mono text-sm"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {user.role === 'super_admin' 
                    ? 'As a Super Admin, you have access to all organizations' 
                    : 'Your organization ID. Contact a Super Admin to change organizations'}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Profile Picture</Label>
                <div className="flex items-start gap-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={profileData.profilePicture} alt={profileData.name} />
                      <AvatarFallback className="bg-blue-600 text-white text-2xl">
                        {getInitials(profileData.name)}
                      </AvatarFallback>
                    </Avatar>
                    {!isUploading && (
                      <button
                        type="button"
                        onClick={() => document.getElementById('profile-picture-upload')?.click()}
                        className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors border-2 border-white"
                      >
                        <Camera className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex-1 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Upload a profile picture to personalize your account. Recommended size: 400x400px
                    </p>
                    <div className="flex gap-2">
                      <input
                        id="profile-picture-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleProfilePictureUpload}
                        disabled={isUploading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('profile-picture-upload')?.click()}
                        disabled={isUploading}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {isUploading ? 'Uploading...' : 'Upload Photo'}
                      </Button>
                      {profileData.profilePicture && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveProfilePicture}
                          disabled={isUploading}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 2MB</p>
                  </div>
                </div>
              </div>
              <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
                {isSavingProfile ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

          <ThemeModeCard />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive browser push notifications</p>
                </div>
                <Switch
                  checked={notifications.push}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Task Assignments</Label>
                  <p className="text-sm text-muted-foreground">Get notified when tasks are assigned to you</p>
                </div>
                <Switch
                  checked={notifications.taskAssignments}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, taskAssignments: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Appointment Reminders</Label>
                  <p className="text-sm text-muted-foreground">Reminders for upcoming appointments</p>
                </div>
                <Switch
                  checked={notifications.appointments}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, appointments: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Deal Updates</Label>
                  <p className="text-sm text-muted-foreground">Updates on deal status changes</p>
                </div>
                <Switch
                  checked={notifications.bids}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, bids: checked })}
                />
              </div>
              <Button onClick={handleSaveNotifications} disabled={isSavingNotifications}>
                {isSavingNotifications ? 'Saving...' : 'Save Preferences'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {canManageSettings && (
          <TabsContent value="organization" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Organization Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveOrg} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="orgName">Organization Name</Label>
                    <Input
                      id="orgName"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orgId">Organization ID</Label>
                    <Input id="orgId" defaultValue={user.organizationId} disabled />
                  </div>
                  <Button type="submit" disabled={isSavingOrg}>
                    {isSavingOrg ? 'Saving...' : 'Save Organization Settings'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Organization User Mode Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Mode
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Control whether this organization operates as a single-user or multi-user workspace
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50 dark:bg-gray-800/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Label className="text-base font-medium">
                        {userMode === 'single' ? 'Single User' : 'Multi User'}
                      </Label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        userMode === 'multi'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-muted text-foreground dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {userMode === 'multi' ? 'Team' : 'Solo'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {userMode === 'single'
                        ? 'Only you have access. Team management features are hidden.'
                        : 'Multiple users can collaborate. Team management and roles are enabled.'}
                    </p>
                  </div>
                  <Switch
                    checked={userMode === 'multi'}
                    onCheckedChange={(checked) => handleToggleUserMode(checked ? 'multi' : 'single')}
                    disabled={isSavingUserMode}
                  />
                </div>

                {/* Mode details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className={`p-3 rounded-lg border-2 transition-colors ${
                    userMode === 'single'
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10'
                      : 'border-transparent bg-muted dark:bg-gray-800/30'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded-md ${userMode === 'single' ? 'bg-blue-100 text-blue-700' : 'bg-muted text-muted-foreground'}`}>
                        <SettingsIcon className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-sm">Single User</span>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>Personal workspace</li>
                      <li>Simplified navigation</li>
                      <li>No team management</li>
                      <li>All data is private</li>
                    </ul>
                  </div>
                  <div className={`p-3 rounded-lg border-2 transition-colors ${
                    userMode === 'multi'
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10'
                      : 'border-transparent bg-muted dark:bg-gray-800/30'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded-md ${userMode === 'multi' ? 'bg-blue-100 text-blue-700' : 'bg-muted text-muted-foreground'}`}>
                        <Users className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-sm">Multi User</span>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>Team collaboration</li>
                      <li>Role-based access</li>
                      <li>User management panel</li>
                      <li>Shared &amp; scoped data</li>
                    </ul>
                  </div>
                </div>

                {isSavingUserMode && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating organization mode...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Global Settings Card (moved to Module Defaults) */}
          </TabsContent>
        )}

        {canManageSettings && (
          <TabsContent value="module-settings" className="space-y-4">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <LayoutGrid className="h-6 w-6" />
                  Module Defaults
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure default settings and options for specific modules like Deals, Contacts, and Inventory
                </p>
              </div>
              <SettingsModuleHelp
                userId={user.id}
                onOpenProfileTab={() => setActiveTab('profile')}
                onOpenOrganizationTab={() => setActiveTab(canManageSettings ? 'organization' : 'profile')}
                onOpenModuleDefaultsTab={() => setActiveTab(canManageSettings ? 'module-settings' : 'profile')}
                onOpenAppearanceTab={() => setActiveTab('appearance')}
                onOpenDiagnosticsTab={() => setActiveTab(canManageSettings ? 'diagnostics' : 'profile')}
                onOpenWorkflowDialog={() => setShowWorkflowDialog(true)}
                onOpenCustomFieldsDialog={() => setShowCustomFieldsDialog(true)}
                onResetHelpTours={handleResetModuleHelpTours}
                onSaveAppearanceSettings={handleSaveAppearanceSettings}
              />
            </div>

            {(user.role === 'super_admin' || user.role === 'admin') && (
              <div className="space-y-4">
                <Tabs defaultValue="deals" className="w-full">
                  <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 mb-2">
                    <TabsList className="inline-flex sm:grid sm:w-full sm:grid-cols-6 min-w-max">
                      <TabsTrigger value="general" className="whitespace-nowrap px-4">General CRM</TabsTrigger>
                      <TabsTrigger value="deals" className="whitespace-nowrap px-4">Deals & Quotes</TabsTrigger>
                      <TabsTrigger value="contacts" className="whitespace-nowrap px-4">Contacts</TabsTrigger>
                      <TabsTrigger value="inventory" className="whitespace-nowrap px-4">Inventory & Pricing</TabsTrigger>
                      <TabsTrigger value="wizards" className="whitespace-nowrap px-4">Project Wizards</TabsTrigger>
                      <TabsTrigger value="users" className="whitespace-nowrap px-4">Users</TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <TabsContent value="general" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Cross-Module Settings</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Custom Fields</Label>
                          <p className="text-sm text-muted-foreground">Add custom fields to your CRM data types</p>
                          <Button type="button" variant="outline" onClick={() => setShowCustomFieldsDialog(true)}>Manage Custom Fields</Button>
                        </div>
                        <div className="space-y-2">
                          <Label>Workflows</Label>
                          <p className="text-sm text-muted-foreground">Configure automated workflows and statuses</p>
                          <Button type="button" variant="outline" onClick={() => setShowWorkflowDialog(true)}>Configure Workflows</Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="deals" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Deals & Quotes Settings</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="taxRate">Tax Rate 1 (%)</Label>
                            <Input
                              id="taxRate"
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={globalSettings.taxRate}
                              onChange={(e) => setGlobalSettings({ ...globalSettings, taxRate: parseFloat(e.target.value) || 0 })}
                              placeholder="Enter tax rate (e.g., 8.5 for 8.5%)"
                            />
                            <p className="text-xs text-muted-foreground">
                              Primary tax rate for bids and quotes
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="taxRate2">Tax Rate 2 (%) - Optional</Label>
                            <Input
                              id="taxRate2"
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={globalSettings.taxRate2}
                              onChange={(e) => setGlobalSettings({ ...globalSettings, taxRate2: parseFloat(e.target.value) || 0 })}
                              placeholder="Enter second tax rate (e.g., 2.0 for 2.0%)"
                            />
                            <p className="text-xs text-muted-foreground">
                              Secondary tax rate (if applicable)
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="quoteTerms">Default Terms for Quotes</Label>
                          <Textarea
                            id="quoteTerms"
                            value={globalSettings.quoteTerms}
                            onChange={(e) => setGlobalSettings({ ...globalSettings, quoteTerms: e.target.value })}
                            placeholder="Enter default terms for quotes"
                            rows={4}
                          />
                          <p className="text-xs text-muted-foreground">
                            These terms will be used as default when creating new quotes and bids
                          </p>
                        </div>

                        <div className="space-y-4 pt-2 border-t">
                          <div>
                            <Label className="text-base font-semibold">Custom Export Templates</Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              Define organization export formats for Quotes and Planners. Only Super Admin can modify templates.
                            </p>
                          </div>

                          {!isSuperAdmin && (
                            <Alert>
                              <AlertDescription>
                                You can view export templates, but only Super Admin can create or edit them.
                              </AlertDescription>
                            </Alert>
                          )}

                          {isSuperAdmin && (
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-base">
                                  {editingTemplateId ? 'Edit Export Template' : 'Add Export Template'}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="space-y-2">
                                    <Label>Template Name</Label>
                                    <Input
                                      value={newExportTemplate.name}
                                      onChange={(e) => setNewExportTemplate((prev) => ({ ...prev, name: e.target.value }))}
                                      placeholder="Eagle Export"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Input
                                      value={newExportTemplate.description || ''}
                                      onChange={(e) => setNewExportTemplate((prev) => ({ ...prev, description: e.target.value }))}
                                      placeholder="Partner system text feed"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                  <div className="space-y-2">
                                    <Label>Module</Label>
                                    <Select
                                      value={newExportTemplate.module || 'quotes'}
                                      onValueChange={(value: 'quotes' | 'planners' | 'all') =>
                                        setNewExportTemplate((prev) => ({ ...prev, module: value }))
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="quotes">Quotes</SelectItem>
                                        <SelectItem value="planners">Planners</SelectItem>
                                        <SelectItem value="all">All Modules</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Layout</Label>
                                    <Select
                                      value={newExportTemplate.layout_mode}
                                      onValueChange={(value: 'fixed' | 'delimited') =>
                                        setNewExportTemplate((prev) => ({ ...prev, layout_mode: value }))
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="fixed">Fixed Width</SelectItem>
                                        <SelectItem value="delimited">Delimited</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="space-y-2">
                                    <Label>File Extension</Label>
                                    <Input
                                      value={newExportTemplate.file_extension || 'txt'}
                                      onChange={(e) =>
                                        setNewExportTemplate((prev) => ({
                                          ...prev,
                                          file_extension: e.target.value.replace(/^\./, ''),
                                        }))
                                      }
                                      placeholder="txt"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Delimiter</Label>
                                    <Input
                                      value={newExportTemplate.delimiter || '|'}
                                      onChange={(e) => setNewExportTemplate((prev) => ({ ...prev, delimiter: e.target.value || '|' }))}
                                      disabled={newExportTemplate.layout_mode !== 'delimited'}
                                      placeholder="|"
                                    />
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label>Header Lines (one per line)</Label>
                                  <Textarea
                                    value={(newExportTemplate.header_lines || []).join('\n')}
                                    onChange={(e) =>
                                      setNewExportTemplate((prev) => ({
                                        ...prev,
                                        // Preserve raw lines while editing so pressing Enter creates a new row.
                                        // We sanitize on save in addExportTemplate().
                                        header_lines: e.target.value.split('\n'),
                                      }))
                                    }
                                    rows={3}
                                    placeholder="H|COMPANY|ProSpaces"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label>Detail Fields</Label>
                                    <Button type="button" variant="outline" size="sm" onClick={addDetailFieldRow}>
                                      Add Field
                                    </Button>
                                  </div>
                                  <div className="space-y-2">
                                    {(newExportTemplate.detail_fields || []).map((field, index) => (
                                      <div key={`${field.key}-${index}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end p-2 border rounded-md">
                                        <div className="md:col-span-3 space-y-1">
                                          <Label className="text-xs">Field Key</Label>
                                          <Select
                                            value={
                                              (field.key || '') && EXPORT_FIELD_KEY_OPTIONS.some((opt) => opt.value === field.key)
                                                ? field.key
                                                : '__custom__'
                                            }
                                            onValueChange={(value) => {
                                              if (value === '__custom__') {
                                                updateDetailFieldRow(index, { key: field.key || '' });
                                              } else {
                                                updateDetailFieldRow(index, { key: value });
                                              }
                                            }}
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select field key" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {EXPORT_FIELD_KEY_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                  {opt.label}
                                                </SelectItem>
                                              ))}
                                              <SelectItem value="__custom__">Custom Field Key</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          {(!field.key || !EXPORT_FIELD_KEY_OPTIONS.some((opt) => opt.value === field.key)) && (
                                            <Input
                                              className="mt-2"
                                              value={field.key || ''}
                                              onChange={(e) => updateDetailFieldRow(index, { key: e.target.value })}
                                              placeholder="custom_field_name"
                                            />
                                          )}
                                        </div>
                                        <div className="md:col-span-2 space-y-1">
                                          <Label className="text-xs">Label</Label>
                                          <Input
                                            value={field.label || ''}
                                            onChange={(e) => updateDetailFieldRow(index, { label: e.target.value })}
                                            placeholder="Quote #"
                                          />
                                        </div>
                                        <div className="md:col-span-2 space-y-1">
                                          <Label className="text-xs">Start</Label>
                                          <Input
                                            type="number"
                                            value={field.start || 1}
                                            onChange={(e) => updateDetailFieldRow(index, { start: parseInt(e.target.value, 10) || 1 })}
                                            disabled={newExportTemplate.layout_mode !== 'fixed'}
                                          />
                                        </div>
                                        <div className="md:col-span-2 space-y-1">
                                          <Label className="text-xs">Length</Label>
                                          <Input
                                            type="number"
                                            value={field.length || 10}
                                            onChange={(e) => updateDetailFieldRow(index, { length: parseInt(e.target.value, 10) || 1 })}
                                            disabled={newExportTemplate.layout_mode !== 'fixed'}
                                          />
                                        </div>
                                        <div className="md:col-span-2 space-y-1">
                                          <Label className="text-xs">Align</Label>
                                          <Select
                                            value={field.align || 'left'}
                                            onValueChange={(value: 'left' | 'right') => updateDetailFieldRow(index, { align: value })}
                                          >
                                            <SelectTrigger>
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="left">Left</SelectItem>
                                              <SelectItem value="right">Right</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div className="md:col-span-1 flex justify-end">
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeDetailFieldRow(index)}
                                          >
                                            <Trash2 className="h-4 w-4 text-red-600" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label>Template Preview</Label>
                                  <Textarea
                                    value={getTemplatePreview()}
                                    readOnly
                                    rows={5}
                                    className="font-mono text-xs"
                                  />
                                </div>

                                <div className="flex items-center gap-2">
                                  <Button type="button" onClick={addExportTemplate}>
                                    {editingTemplateId ? 'Update Template' : 'Add Template'}
                                  </Button>
                                  {editingTemplateId && (
                                    <Button type="button" variant="outline" onClick={resetNewExportTemplate}>
                                      Cancel Edit
                                    </Button>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          <div className="space-y-2">
                            {(globalSettings.exportTemplates || []).length === 0 ? (
                              <p className="text-sm text-muted-foreground">No custom templates configured yet.</p>
                            ) : (
                              (globalSettings.exportTemplates || []).map((template) => (
                                <div key={template.id} className="border rounded-md p-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-medium">{template.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {template.module || 'quotes'} • {template.layout_mode} • .{template.file_extension || 'txt'}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => editExportTemplate(template.id)}
                                        disabled={!canManageSettings}
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => toggleExportTemplateEnabled(template.id)}
                                        disabled={!canManageSettings}
                                      >
                                        {template.enabled === false ? 'Enable' : 'Disable'}
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeExportTemplate(template.id)}
                                        disabled={!canManageSettings}
                                      >
                                        <Trash2 className="h-4 w-4 text-red-600" />
                                      </Button>
                                    </div>
                                  </div>
                                  {template.description && (
                                    <p className="text-sm text-muted-foreground">{template.description}</p>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="contacts" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Contacts & Marketing</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="audienceSegments">Audience Segments</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="audienceSegments"
                              value={newSegment}
                              onChange={(e) => setNewSegment(e.target.value)}
                              placeholder="Add new segment"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (newSegment.trim()) {
                                  setGlobalSettings(prev => ({
                                    ...prev,
                                    audienceSegments: [...prev.audienceSegments, newSegment.trim()],
                                  }));
                                  setNewSegment('');
                                }
                              }}
                            >
                              Add
                            </Button>
                          </div>
                          <div className="mt-2">
                            <Label className="text-sm text-muted-foreground">Current Segments</Label>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {globalSettings.audienceSegments.map((segment, index) => (
                                <div key={index} className="bg-muted px-2 py-1 rounded text-sm flex items-center">
                                  {segment}
                                  <button
                                    type="button"
                                    className="ml-2 text-red-500 hover:bg-red-50 rounded p-0.5"
                                    onClick={() => {
                                      setGlobalSettings(prev => ({
                                        ...prev,
                                        audienceSegments: prev.audienceSegments.filter(s => s !== segment),
                                      }));
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="inventory" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Inventory & Pricing Defaults</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="defaultPriceLevel">Default Price Level</Label>
                          <Select
                            value={globalSettings.defaultPriceLevel}
                            onValueChange={(value) => setGlobalSettings({ ...globalSettings, defaultPriceLevel: value })}
                          >
                            <SelectTrigger id="defaultPriceLevel">
                              <SelectValue placeholder="Select default price level" />
                            </SelectTrigger>
                            <SelectContent>
                              {[
                                { key: 't1' as const, tier: 1 },
                                { key: 't2' as const, tier: 2 },
                                { key: 't3' as const, tier: 3 },
                                { key: 't4' as const, tier: 4 },
                                { key: 't5' as const, tier: 5 },
                              ]
                                .filter(({ key }) => {
                                  const label = (globalSettings.priceTierLabels || DEFAULT_PRICE_TIER_LABELS)[key];
                                  return label && label.trim() !== '' && label.trim() !== '0';
                                })
                                .map(({ key, tier }) => {
                                  const label = (globalSettings.priceTierLabels || DEFAULT_PRICE_TIER_LABELS)[key];
                                  return (
                                    <SelectItem key={key} value={label}>
                                      T{tier} — {label}
                                    </SelectItem>
                                  );
                                })}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            This price level will be used as default when creating new bids and quotes
                          </p>
                        </div>

                        {/* Price Tier Labels */}
                        <div className="space-y-3 pt-2">
                          <div>
                            <Label className="text-base font-semibold">Price Tier Labels</Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              Customize the names shown for each price tier across the entire CRM. Set a tier to "0" or leave blank to disable it.
                            </p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                            {([
                              { key: 't1' as const, tier: 1 },
                              { key: 't2' as const, tier: 2 },
                              { key: 't3' as const, tier: 3 },
                              { key: 't4' as const, tier: 4 },
                              { key: 't5' as const, tier: 5 },
                            ]).map(({ key, tier }) => (
                              <div key={key} className="space-y-1">
                                <Label htmlFor={`tierLabel-${key}`} className="text-xs text-muted-foreground">
                                  Tier {tier} Label
                                </Label>
                                <Input
                                  id={`tierLabel-${key}`}
                                  value={(globalSettings.priceTierLabels || DEFAULT_PRICE_TIER_LABELS)[key] || ''}
                                  onChange={(e) => setGlobalSettings(prev => ({
                                    ...prev,
                                    priceTierLabels: {
                                      ...(prev.priceTierLabels || DEFAULT_PRICE_TIER_LABELS),
                                      [key]: e.target.value,
                                    },
                                  }))}
                                  placeholder={DEFAULT_PRICE_TIER_LABELS[key]}
                                  className="text-sm"
                                />
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setGlobalSettings(prev => ({
                                ...prev,
                                priceTierLabels: { ...DEFAULT_PRICE_TIER_LABELS },
                              }))}
                            >
                              Reset to Defaults
                            </Button>
                            <span className="text-xs text-muted-foreground">
                              Defaults: Retail, VIP, VIP B, VIP A, 0
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="wizards" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Project Wizard Settings</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ProjectWizardSettings 
                          organizationId={user.organizationId}
                          onSave={showAlert}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="users" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">User Management Settings</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="userInviteMethod">Default Invite Method</Label>
                          <Select
                            value={globalSettings.userInviteMethod}
                            onValueChange={(value) => setGlobalSettings({ ...globalSettings, userInviteMethod: value })}
                          >
                            <SelectTrigger id="userInviteMethod">
                              <SelectValue placeholder="Select invite method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="email">Automatically email invite & password reset link (Requires SMTP setup)</SelectItem>
                              <SelectItem value="manual">Generate temporary password manually</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-2">
                            Choose how users are notified when invited. Emailing directly requires that you have configured SMTP settings in your Supabase Auth dashboard.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-start mt-6">
                  <Button onClick={handleSaveGlobalSettings} disabled={isSavingGlobal} className="w-full sm:w-auto">
                    {isSavingGlobal ? 'Saving...' : 'Save Module Defaults'}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        )}

        <TabsContent value="diagnostics" className="space-y-4">
          <DataDiagnostic />
        </TabsContent>



        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Theme</Label>
                <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
                <ThemeSelector />
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <p className="text-sm text-muted-foreground">Select your preferred language</p>
                <Button type="button" variant="outline">Manage Languages</Button>
              </div>
              <div className="space-y-2">
                <Label>Layout</Label>
                <p className="text-sm text-muted-foreground">Configure your dashboard layout</p>
                <Button type="button" variant="outline" onClick={() => setShowLayoutDialog(true)}>Configure Layout</Button>
              </div>
              <div className="space-y-2">
                <Label>Interactive Help Tours</Label>
                <p className="text-sm text-muted-foreground">
                  Reset first-time help popups and step progress for all module guides on this account.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetModuleHelpTours}
                  disabled={isResettingHelpTours}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isResettingHelpTours ? 'Resetting...' : 'Reset Help Tours'}
                </Button>
              </div>
              <Button 
                type="button"
                onClick={handleSaveAppearanceSettings}
              >
                Save Appearance Settings
              </Button>
            </CardContent>
          </Card>

          {/* Planner Defaults Migration Status */}
          <PlannerDefaultsMigrationStatus 
            userId={user.id}
            organizationId={user.organizationId}
          />
        </TabsContent>

        {(userMode === 'single' || canManageSettings) && (
        <TabsContent value="billing" className="space-y-4">
          <SubscriptionBilling user={user} planRefreshKey={planRefreshKey} />
        </TabsContent>
        )}

        {isSuperAdmin && (
          <TabsContent value="billing-plans" className="space-y-4">
            <BillingPlanConfig user={user} onConfigSaved={() => setPlanRefreshKey((k) => k + 1)} />
          </TabsContent>
        )}

        {canManageSettings && (
          <TabsContent value="api-access" className="space-y-4">
            <ApiAccess user={user} hasAccess={subHasFeature('api-access')} />
          </TabsContent>
        )}
        {/* end tabs */}
      </Tabs>

      {alert && (
        <Alert className={`mt-4 ${alert.type === 'success' ? 'bg-green-50 border-green-200' : ''}`} variant={alert.type === 'error' ? 'destructive' : 'default'}>
          {alert.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription className={alert.type === 'success' ? 'text-green-800' : ''}>
            {alert.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Layout Configuration Dialog */}
      <Dialog open={showLayoutDialog} onOpenChange={setShowLayoutDialog}>
        <DialogContent className="sm:max-w-[425px] max-h-[80vh] flex flex-col bg-background">
          <DialogHeader>
            <DialogTitle className="text-foreground">Configure Layout</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Customize your dashboard layout to suit your workflow.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label htmlFor="dashboardDensity" className="text-foreground font-medium">Dashboard Density</Label>
              <Select
                value={layoutConfig.dashboardDensity}
                onValueChange={(value) => setLayoutConfig({ ...layoutConfig, dashboardDensity: value })}
              >
                <SelectTrigger id="dashboardDensity" className="bg-background border-border text-foreground">
                  <SelectValue placeholder="Select dashboard density" className="text-foreground" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comfortable">Comfortable</SelectItem>
                  <SelectItem value="compact">Compact</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Adjust the density of your dashboard to fit more or less information.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sidebarPosition" className="text-foreground font-medium">Sidebar Position</Label>
              <Select
                value={layoutConfig.sidebarPosition}
                onValueChange={(value) => setLayoutConfig({ ...layoutConfig, sidebarPosition: value })}
              >
                <SelectTrigger id="sidebarPosition" className="bg-background border-border text-foreground">
                  <SelectValue placeholder="Select sidebar position" className="text-foreground" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose where the sidebar should be positioned on your dashboard.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="moduleCardSize" className="text-foreground font-medium">Module Card Size</Label>
              <Select
                value={layoutConfig.moduleCardSize}
                onValueChange={(value) => setLayoutConfig({ ...layoutConfig, moduleCardSize: value })}
              >
                <SelectTrigger id="moduleCardSize" className="bg-background border-border text-foreground">
                  <SelectValue placeholder="Select module card size" className="text-foreground" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Set the size of the module cards on your dashboard.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-foreground font-medium">Show Module Icons</Label>
                  <p className="text-xs text-muted-foreground">
                    Toggle the visibility of module icons on your dashboard.
                  </p>
                </div>
                <Switch
                  checked={layoutConfig.showModuleIcons}
                  onCheckedChange={(checked) => setLayoutConfig({ ...layoutConfig, showModuleIcons: checked })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-foreground font-medium">Compact Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable compact mode to reduce the space used by elements on your dashboard.
                  </p>
                </div>
                <Switch
                  checked={layoutConfig.compactMode}
                  onCheckedChange={(checked) => setLayoutConfig({ ...layoutConfig, compactMode: checked })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tableRowHeight" className="text-foreground font-medium">Table Row Height</Label>
              <Select
                value={layoutConfig.tableRowHeight}
                onValueChange={(value) => setLayoutConfig({ ...layoutConfig, tableRowHeight: value })}
              >
                <SelectTrigger id="tableRowHeight" className="bg-background border-border text-foreground">
                  <SelectValue placeholder="Select table row height" className="text-foreground" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Set the height of the rows in tables on your dashboard.
              </p>
            </div>
          </div>
          <Button
            type="button"
            className="mt-4"
            onClick={() => setShowLayoutDialog(false)}
          >
            Save Layout Settings
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}