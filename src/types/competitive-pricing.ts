export type MatchConfidence = 'EXACT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNMATCHED';

export type MatchMethod =
  | 'MANUFACTURER_PART_NUMBER'
  | 'UPC_BARCODE'
  | 'MANUFACTURER_MODEL'
  | 'DESCRIPTION_SPEC'
  | 'MANUAL_REVIEW';

export type AvailabilityStatus = 'IN_STOCK' | 'OUT_OF_STOCK' | 'LIMITED' | 'UNAVAILABLE';

export type PricingJobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface CompetitorPriceEntry {
  competitorId: number | string;
  competitorName: string;
  websiteUrl?: string;
  productUrl?: string;
  productName?: string;
  externalProductId?: string;
  sku?: string;
  manufacturerPartNumber?: string;
  upc?: string;
  regularPrice?: number | null;
  salePrice?: number | null;
  price: number;
  currency: string;
  unitOfMeasure?: string;
  packQuantity?: number;
  normalizedUnitPrice: number;
  matchConfidence: MatchConfidence;
  matchMethod?: MatchMethod;
  availability: AvailabilityStatus;
  checkedAt: string;
  lastError?: string;
  notes?: string;
}

export interface ProductCompetitivePricing {
  productId: string | number;
  sku: string;
  productName: string;
  description?: string;
  brand?: string;
  manufacturer?: string;
  manufacturerPartNumber?: string;
  upc?: string;
  category?: string;
  yourPrice: number;
  currency: string;
  unitOfMeasure: string;
  packQuantity?: number;
  competitors: CompetitorPriceEntry[];
  lastCheckedAt?: string;
}

export interface PricingJobResponse {
  jobId: string;
  productId?: string | number;
  competitorId?: number | string;
  status: PricingJobStatus;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  retryCount?: number;
}

export interface PriceHistoryRecord {
  id: string;
  productId: string | number;
  competitorId: number | string;
  competitorName: string;
  price: number;
  normalizedUnitPrice: number;
  currency: string;
  checkedAt: string;
  availability?: AvailabilityStatus;
}

export interface PricingDashboardMetrics {
  totalMonitored: number;
  withCompetitivePricing: number;
  noMatch: number;
  ronaHigher: number;
  ronaLower: number;
  outdatedPrices: number;
  lastSuccessfulUpdate: string | null;
}

export interface PricingDashboardItem {
  productId: string | number;
  sku: string;
  name: string;
  description?: string;
  category: string;
  yourPrice: number;
  lowestCompetitorPrice: number | null;
  lowestCompetitorName?: string;
  priceDifference: number | null;
  variancePct: number | null;
  matchConfidence: MatchConfidence;
  competitorCount: number;
  lastCheckedAt: string | null;
  isOutdated: boolean;
}

export interface CompetitorConfig {
  id: number | string;
  name: string;
  websiteUrl: string;
  searchUrlTemplate?: string;
  productUrlPattern?: string;
  active: boolean;
  scrapingMethod?: string;
  lastSuccessfulCheck?: string | null;
  lastError?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
