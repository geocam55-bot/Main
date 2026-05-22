/**
 * Global Settings Utility
 * Provides access to organization-wide settings like tax rates and price levels
 */

export interface PriceTierLabels {
  t1: string;
  t2: string;
  t3: string;
  t4: string;
  t5: string;
}

export const DEFAULT_PRICE_TIER_LABELS: PriceTierLabels = {
  t1: 'Retail',
  t2: 'VIP',
  t3: 'VIP B',
  t4: 'VIP A',
  t5: '0',
};

export interface GlobalSettings {
  taxRate: number;
  taxRate2?: number;
  defaultPriceLevel: string;
  quoteTerms?: string;
  priceTierLabels?: PriceTierLabels;
}

export const AVAILABLE_MODULES = [
  { id: 'ai_suggestions_enabled', label: 'AI Suggestions' },
  { id: 'marketing_enabled', label: 'Marketing' },
  { id: 'inventory_enabled', label: 'Inventory' },
  { id: 'import_export_enabled', label: 'Import/Export' },
  { id: 'documents_enabled', label: 'Documents' },
  { id: 'project_wizards_enabled', label: 'Project Wizards' },
  { id: 'appointments_enabled', label: 'Appointments' }
];

// Price level mapping constants
// Tier labels are now configurable via Admin Settings > Organization
// Defaults: T1=Retail, T2=VIP, T3=VIP B, T4=VIP A, T5=0
export type PriceLevel = string;

/** @deprecated Use getActivePriceLevels() instead */
export const PRICE_LEVELS: string[] = ['Retail', 'VIP', 'VIP B', 'VIP A'];

/**
 * Get the configured price tier labels for the current organization
 */
export function getPriceTierLabels(): PriceTierLabels {
  const settings = getGlobalSettings();
  return settings.priceTierLabels || DEFAULT_PRICE_TIER_LABELS;
}

/**
 * Get the display label for a single tier number (1-5)
 */
export function getPriceTierLabel(tier: number): string {
  const labels = getPriceTierLabels();
  const key = `t${tier}` as keyof PriceTierLabels;
  return labels[key] || `T${tier}`;
}

/**
 * Get the active (non-zero/non-empty) price levels as an array of label strings.
 * Skips tiers whose label is '0', empty, or blank.
 */
export function getActivePriceLevels(): string[] {
  const labels = getPriceTierLabels();
  return [labels.t1, labels.t2, labels.t3, labels.t4, labels.t5]
    .filter(l => l && l.trim() !== '' && l.trim() !== '0');
}

/**
 * Check if a specific tier number (1-5) is active (not labeled '0' or empty)
 */
export function isTierActive(tier: number): boolean {
  const labels = getPriceTierLabels();
  const key = `t${tier}` as keyof PriceTierLabels;
  const label = labels[key];
  return !!label && label.trim() !== '' && label.trim() !== '0';
}

/**
 * Get the active tier numbers (1-5) as an array
 */
export function getActiveTierNumbers(): number[] {
  return [1, 2, 3, 4, 5].filter(t => isTierActive(t));
}

/**
 * Map price level names to inventory tier numbers
 * Dynamically built from configured tier labels + legacy fallbacks
 */
export function priceLevelToTier(priceLevel: string): number {
  const labels = getPriceTierLabels();

  // Build dynamic mapping from configured labels
  const mapping: Record<string, number> = {};
  for (let i = 1; i <= 5; i++) {
    const label = labels[`t${i}` as keyof PriceTierLabels];
    if (label && label.trim() !== '' && label.trim() !== '0') {
      mapping[label] = i;
    }
  }

  // Legacy / shorthand mappings for backward compatibility
  if (!mapping['VIPB'])  mapping['VIPB']  = mapping['VIP B'] || 3;
  if (!mapping['VIPA'])  mapping['VIPA']  = mapping['VIP A'] || 4;
  if (!mapping['T5'])    mapping['T5']    = 4;
  if (!mapping['Wholesale'])  mapping['Wholesale']  = 3;
  if (!mapping['Contractor']) mapping['Contractor'] = 4;
  if (!mapping['Premium'])    mapping['Premium']    = 4;
  if (!mapping['Standard'])   mapping['Standard']   = 4;

  return mapping[priceLevel] || 1; // Default to tier 1 if not found
}

/**
 * Map inventory tier numbers to price level names (uses configured labels)
 */
export function tierToPriceLevel(tier: number): string {
  return getPriceTierLabel(tier);
}

/**
 * Get global settings for the current organization
 */
export function getGlobalSettings(): GlobalSettings {
  const orgId = localStorage.getItem('currentOrgId') || 'org_001';
  const stored = localStorage.getItem(`global_settings_${orgId}`);
  
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to parse global settings:', error);
    }
  }
  
  // Default values if not found
  return {
    taxRate: 0,
    taxRate2: 0,
    defaultPriceLevel: DEFAULT_PRICE_TIER_LABELS.t1,
    quoteTerms: 'Payment due within 30 days. All prices in USD.',
  };
}

/**
 * Get the global tax rate for the current organization
 */
export function getGlobalTaxRate(): number {
  const settings = getGlobalSettings();
  return settings.taxRate;
}

/**
 * Get the second tax rate for the current organization
 */
export function getGlobalTaxRate2(): number {
  const settings = getGlobalSettings();
  return settings.taxRate2 || 0;
}

/**
 * Get the default price level for the current organization
 */
export function getDefaultPriceLevel(): string {
  const settings = getGlobalSettings();
  return settings.defaultPriceLevel;
}

/**
 * Get the default quote terms for the current organization
 */
export function getDefaultQuoteTerms(): string {
  const settings = getGlobalSettings();
  return settings.quoteTerms || 'Payment due within 30 days. All prices in USD.';
}