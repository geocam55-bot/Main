/**
 * Client helper for saved planner designs.
 * All CRUD goes through the Edge Function server (service-role) to bypass RLS.
 */

import { projectId } from './supabase/info';
import { getServerHeaders } from './server-headers';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-8405be07`;

export type PlannerType = 'deck' | 'garage' | 'shed' | 'roof' | 'kitchen' | 'finishing';

export interface SavedDesignRow {
  id: string;
  name: string;
  description: string | null;
  config: any;
  customer_id: string | null;
  customer_name: string | null;
  customer_company: string | null;
  deal_id: string | null;
  deal_title: string | null;
  price_tier: string;
  total_cost: number;
  materials: any[];
  created_at: string;
  updated_at: string;
}

export async function listDesigns(type: PlannerType): Promise<SavedDesignRow[]> {
  const headers = await getServerHeaders();
  const res = await fetch(`${BASE_URL}/designs/${type}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to list ${type} designs (${res.status})`);
  }
  const data = await res.json();
  return data.designs || [];
}

export async function saveDesign(type: PlannerType, payload: {
  customer_id?: string | null;
  opportunity_id?: string | null;
  name: string;
  description?: string | null;
  config: any;
  price_tier?: string;
  total_cost?: number;
  materials?: any[];
}): Promise<SavedDesignRow> {
  const headers = await getServerHeaders();
  const res = await fetch(`${BASE_URL}/designs/${type}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to save ${type} design (${res.status})`);
  }
  const data = await res.json();
  return data.design;
}

export async function deleteDesign(type: PlannerType, id: string): Promise<void> {
  const headers = await getServerHeaders();
  const res = await fetch(`${BASE_URL}/designs/${type}/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to delete ${type} design (${res.status})`);
  }
}

// ── Deal (Opportunity) creation via server (bypasses RLS) ──────────────

export interface CreateDealPayload {
  customer_id: string;
  title: string;
  description?: string;
  value?: number;
  status?: string;
}

export async function createDeal(payload: CreateDealPayload): Promise<any> {
  const headers = await getServerHeaders();
  const res = await fetch(`${BASE_URL}/designs/create-deal`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to create deal (${res.status})`);
  }
  const data = await res.json();
  return data.deal;
}

// ── Quote creation via server (bypasses RLS) ───────────────────────────

export interface CreateQuotePayload {
  contact_id: string;
  quote_number: string;
  title: string;
  line_items?: any[];
  subtotal?: number;
  total?: number;
  status?: string;
  valid_until?: string;
}

export async function createQuote(payload: CreateQuotePayload): Promise<any> {
  const headers = await getServerHeaders();
  const res = await fetch(`${BASE_URL}/designs/create-quote`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to create quote (${res.status})`);
  }
  const data = await res.json();
  return data.quote;
}