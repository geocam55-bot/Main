import { getServerHeaders } from './server-headers';

export type EmailTone = 'professional' | 'friendly' | 'concise' | 'persuasive' | 'direct';

export interface CustomerAssistantResponse {
  success: boolean;
  answer: string;
  relationshipStatus: string;
  keyHighlights: string[];
  suggestedNextActions: Array<{
    title: string;
    actionType: string;
    reason: string;
    suggestedSubject?: string;
  }>;
}

export interface EmailWriterResponse {
  success: boolean;
  subject: string;
  body: string;
  summaryPoints: string[];
}

export interface SmartSearchMatch {
  contactId: string;
  reason: string;
}

export interface SmartSearchResponse {
  success: boolean;
  mode: 'smart-search';
  reply: string;
  matchedContacts: SmartSearchMatch[];
  suggestedFollowupQuery?: string;
}

export interface CustomerInsightsResponse {
  success: boolean;
  mode: 'insights';
  headline: string;
  buyingHabits: string[];
  inactiveCustomers: Array<{
    contactId: string;
    name: string;
    company?: string;
    daysInactive: number;
    reason: string;
  }>;
  opportunities: string[];
  strategicRecommendations: string[];
  totals?: {
    totalContacts: number;
    activeCount: number;
    prospectCount: number;
    inactiveOver30DaysCount: number;
    totalYtdSales: number;
    totalLyrSales: number;
    totalOpenPipelineValue: number;
  };
}

export interface FollowupAssistantResponse {
  success: boolean;
  mode: 'followup';
  summary: string;
  prioritizedFollowups: Array<{
    contactId: string;
    contactName: string;
    company?: string;
    urgency: string;
    daysInactive?: number;
    recommendedChannel: string;
    bestTimeHint: string;
    suggestedAction: string;
    emailDraftPrompt?: string;
  }>;
  totals?: CustomerInsightsResponse['totals'];
}

export interface SalesAnalysisResponse {
  success: boolean;
  mode: 'sales-analysis';
  executiveSummary: string;
  trends: string[];
  revenueOpportunities: string[];
  atRiskRevenue: string[];
  recommendedActions: string[];
  totals?: CustomerInsightsResponse['totals'];
  tradeBreakdown?: Array<{
    trade: string;
    count: number;
    ytd: number;
    lyr: number;
    open: number;
  }>;
}

export interface LogisticsAIResponse {
  success: boolean;
  mode: string;
  answer?: string;
  highlightedDeliveryIds?: string[];
  recommendedActions?: string[];
  summary?: string;
  warnings?: string[];
  recommendations?: Array<{
    deliveryId: string;
    customerName: string;
    recommendedTruck: string;
    recommendedSlot: string;
    rationale: string;
  }>;
  emailSubject?: string;
  emailBody?: string;
  smsText?: string;
  polishedNote?: string;
}

async function postAI<T>(
  endpoint: string,
  payload: Record<string, any>,
  extraHeaders?: Record<string, string>
): Promise<T> {
  const headers = await getServerHeaders(extraHeaders);
  try {
    const rawUser = localStorage.getItem('prospaces_current_user') || localStorage.getItem('prospaces_user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed?.email && !payload.email) payload.email = parsed.email;
      if ((parsed?.organizationId || parsed?.organization_id) && !payload.organizationId) {
        payload.organizationId = parsed.organizationId || parsed.organization_id;
      }
    }
  } catch {}

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `AI request failed with status ${res.status}`);
  }
  return data as T;
}

export function askCustomerAssistant(params: {
  contactId: string;
  mode: 'summary' | 'qa';
  question?: string;
  includeCostData?: boolean;
  recentDeals?: any[];
}) {
  return postAI<CustomerAssistantResponse>('/api/ai/customer-assistant', params);
}

export function runEmailWriter(params: {
  mode: 'draft' | 'followup' | 'rewrite' | 'summarize';
  tone?: EmailTone;
  prompt?: string;
  currentSubject?: string;
  currentBody?: string;
  recipientName?: string;
  recipientCompany?: string;
  contextSummary?: string;
  contactId?: string;
}) {
  return postAI<EmailWriterResponse>('/api/ai/email-writer', params);
}

export function runCRMIntelligence<
  T extends
    | SmartSearchResponse
    | CustomerInsightsResponse
    | FollowupAssistantResponse
    | SalesAnalysisResponse
>(params: {
  mode: 'insights' | 'followup' | 'sales-analysis' | 'smart-search';
  query?: string;
  scope?: 'personal' | 'team';
  includeCostData?: boolean;
}) {
  return postAI<T>('/api/ai/crm-intelligence', params);
}

export function runLogisticsAI(
  params: {
    mode: 'dispatch-qa' | 'route-optimize' | 'customer-eta' | 'polish-pod';
    question?: string;
    deliveryId?: string;
    rawNotes?: string;
    delivery?: any;
    deliveries?: any[];
    trucks?: any[];
    tenantId?: string;
  },
  logisticsAuth?: { userId?: string; userEmail?: string; tenantId?: string }
) {
  const extraHeaders: Record<string, string> = {};
  if (logisticsAuth?.userId) extraHeaders['X-Logistics-User-Id'] = logisticsAuth.userId;
  if (logisticsAuth?.userEmail) extraHeaders['X-Logistics-User-Email'] = logisticsAuth.userEmail;
  if (logisticsAuth?.tenantId) extraHeaders['X-Logistics-Tenant-Id'] = logisticsAuth.tenantId;
  return postAI<LogisticsAIResponse>('/api/ai/logistics-assistant', params, extraHeaders);
}

/**
 * Safely convert plain text lines into escaped HTML paragraphs for the CRM rich-text email editor.
 */
export function plainTextToSafeEditorHtml(text: string): string {
  const escapeHtml = (input: string) =>
    input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const blocks = String(text || '')
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  if (blocks.length === 0) return '<p></p>';
  return blocks
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br/>')}</p>`)
    .join('');
}
