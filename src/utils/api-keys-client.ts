/**
 * API Keys client — communicates with server endpoints for Enterprise API key management.
 */

import { projectId } from './supabase/info';
import { getServerHeaders } from './server-headers';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-8405be07`;

// ── Types ───────────────────────────────────────────────────────────────

export interface ApiKeyMeta {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  status: 'active' | 'revoked';
  created_by_name: string;
}

export interface CreateKeyResult {
  key: ApiKeyMeta;
  raw_key: string;
}

// Available scopes for API keys
export const API_SCOPES = [
  { id: 'contacts:read', label: 'Contacts', description: 'Read contacts', group: 'Contacts' },
  { id: 'contacts:write', label: 'Contacts', description: 'Create/update contacts', group: 'Contacts' },
  { id: 'deals:read', label: 'Deals', description: 'Read deals', group: 'Deals' },
  { id: 'deals:write', label: 'Deals', description: 'Create/update deals', group: 'Deals' },
  { id: 'tasks:read', label: 'Tasks', description: 'Read tasks', group: 'Tasks' },
  { id: 'tasks:write', label: 'Tasks', description: 'Create/update tasks', group: 'Tasks' },
  { id: 'quotes:read', label: 'Quotes', description: 'Read quotes', group: 'Quotes' },
  { id: 'quotes:write', label: 'Quotes', description: 'Create/update quotes', group: 'Quotes' },
  { id: 'inventory:read', label: 'Inventory', description: 'Read inventory', group: 'Inventory' },
  { id: 'inventory:write', label: 'Inventory', description: 'Manage inventory', group: 'Inventory' },
  { id: 'users:read', label: 'Users', description: 'Read user list', group: 'Users' },
  { id: 'reports:read', label: 'Reports', description: 'Read reports', group: 'Reports' },
] as const;

// ── API calls ───────────────────────────────────────────────────────────

export async function listApiKeys(): Promise<ApiKeyMeta[]> {
  const headers = await getServerHeaders();
  const res = await fetch(`${BASE_URL}/api-keys`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to list API keys');
  }
  const data = await res.json();
  return data.keys || [];
}

export async function createApiKey(params: {
  name: string;
  scopes: string[];
  expires_in_days?: number;
}): Promise<CreateKeyResult> {
  const headers = await getServerHeaders();
  const res = await fetch(`${BASE_URL}/api-keys`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create API key');
  }
  return res.json();
}

export async function revokeApiKey(keyId: string): Promise<void> {
  const headers = await getServerHeaders();
  const res = await fetch(`${BASE_URL}/api-keys/${keyId}/revoke`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to revoke API key');
  }
}

export async function deleteApiKey(keyId: string): Promise<void> {
  const headers = await getServerHeaders();
  const res = await fetch(`${BASE_URL}/api-keys/${keyId}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete API key');
  }
}
