/**
 * API Key Management routes (KV-backed).
 * Enterprise-only feature — gated by subscription plan check.
 *
 * Key patterns:
 *   api_keys:{orgId}                    — array of API key metadata for the org
 *   api_key_lookup:{hashedKey}          — reverse lookup: hashed key -> { orgId, keyId }
 *   subscription:{orgId}               — checked to verify Enterprise plan
 */

import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';
import { authenticateRequest } from './auth-helper.ts';

const PREFIX = '/make-server-8405be07';

// ── Types ───────────────────────────────────────────────────────────────

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;   // First 8 chars for display (e.g., "ps_live_a1b2...")
  key_hash: string;     // SHA-256 hash of the full key for validation
  scopes: string[];     // e.g., ['contacts:read', 'contacts:write', 'deals:read']
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  status: 'active' | 'revoked';
  created_by: string;   // user ID
  created_by_name: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────

function generateId(): string {
  return crypto.randomUUID();
}

/** Generate a secure API key string */
function generateApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `ps_live_${hex}`;
}

/** SHA-256 hash of a key for storage (we never store the raw key) */
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Check if org has an active Enterprise subscription */
async function isEnterprisePlan(orgId: string): Promise<boolean> {
  try {
    const sub = await kv.get(`subscription:${orgId}`) as any;
    if (!sub) return false;
    return sub.plan_id === 'enterprise' && (sub.status === 'active' || sub.status === 'trialing');
  } catch {
    return false;
  }
}

// ── Routes ──────────────────────────────────────────────────────────────

export const apiKeys = new Hono();

// List API keys for the org
apiKeys.get(`${PREFIX}/api-keys`, async (c) => {
  try {
    const auth = await authenticateRequest(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);

    const orgId = auth.profile.organization_id;
    if (!orgId) return c.json({ error: 'No organization found' }, 400);

    // Check Enterprise plan
    const isEnterprise = await isEnterprisePlan(orgId);
    if (!isEnterprise) {
      return c.json({ error: 'API access requires an Enterprise plan', upgrade_required: true }, 403);
    }

    // Only admin+ can manage API keys
    if (!['admin', 'super_admin'].includes(auth.profile.role)) {
      return c.json({ error: 'Only administrators can manage API keys' }, 403);
    }

    const keys = (await kv.get(`api_keys:${orgId}`)) as ApiKey[] || [];
    // Never return the hash to the client
    const safeKeys = keys.map(({ key_hash, ...rest }) => rest);
    return c.json({ keys: safeKeys });
  } catch (err: any) {
    console.log('[api-keys] GET error:', err.message);
    return c.json({ error: err.message }, 500);
  }
});

// Create a new API key
apiKeys.post(`${PREFIX}/api-keys`, async (c) => {
  try {
    const auth = await authenticateRequest(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);

    const orgId = auth.profile.organization_id;
    if (!orgId) return c.json({ error: 'No organization found' }, 400);

    const isEnterprise = await isEnterprisePlan(orgId);
    if (!isEnterprise) {
      return c.json({ error: 'API access requires an Enterprise plan', upgrade_required: true }, 403);
    }

    if (!['admin', 'super_admin'].includes(auth.profile.role)) {
      return c.json({ error: 'Only administrators can create API keys' }, 403);
    }

    const body = await c.req.json();
    const { name, scopes, expires_in_days } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return c.json({ error: 'API key name is required' }, 400);
    }

    // Limit to 10 active keys per org
    const existingKeys = (await kv.get(`api_keys:${orgId}`)) as ApiKey[] || [];
    const activeKeys = existingKeys.filter(k => k.status === 'active');
    if (activeKeys.length >= 10) {
      return c.json({ error: 'Maximum of 10 active API keys per organization' }, 400);
    }

    // Generate key
    const rawKey = generateApiKey();
    const keyHash = await hashKey(rawKey);
    const keyPrefix = rawKey.substring(0, 16) + '...';

    const newKey: ApiKey = {
      id: generateId(),
      name: name.trim(),
      key_prefix: keyPrefix,
      key_hash: keyHash,
      scopes: scopes || ['contacts:read', 'deals:read', 'tasks:read'],
      created_at: new Date().toISOString(),
      last_used_at: null,
      expires_at: expires_in_days
        ? new Date(Date.now() + expires_in_days * 86400000).toISOString()
        : null,
      status: 'active',
      created_by: auth.user.id,
      created_by_name: auth.profile.name || auth.profile.full_name || auth.user.email || 'Unknown',
    };

    existingKeys.push(newKey);
    await kv.set(`api_keys:${orgId}`, existingKeys);

    // Store reverse lookup for key validation
    await kv.set(`api_key_lookup:${keyHash}`, { orgId, keyId: newKey.id });

    console.log(`[api-keys] Created key "${name}" for org ${orgId} by user ${auth.user.id}`);

    // Return the raw key ONCE — it won't be shown again
    return c.json({
      key: {
        id: newKey.id,
        name: newKey.name,
        key_prefix: newKey.key_prefix,
        scopes: newKey.scopes,
        created_at: newKey.created_at,
        expires_at: newKey.expires_at,
        status: newKey.status,
        created_by_name: newKey.created_by_name,
      },
      raw_key: rawKey,  // Only returned at creation time
    }, 201);
  } catch (err: any) {
    console.log('[api-keys] POST error:', err.message);
    return c.json({ error: err.message }, 500);
  }
});

// Revoke an API key
apiKeys.post(`${PREFIX}/api-keys/:keyId/revoke`, async (c) => {
  try {
    const auth = await authenticateRequest(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);

    const orgId = auth.profile.organization_id;
    if (!orgId) return c.json({ error: 'No organization found' }, 400);

    if (!['admin', 'super_admin'].includes(auth.profile.role)) {
      return c.json({ error: 'Only administrators can revoke API keys' }, 403);
    }

    const keyId = c.req.param('keyId');
    const keys = (await kv.get(`api_keys:${orgId}`)) as ApiKey[] || [];
    const keyIndex = keys.findIndex(k => k.id === keyId);
    if (keyIndex === -1) return c.json({ error: 'API key not found' }, 404);

    keys[keyIndex].status = 'revoked';

    // Remove reverse lookup
    await kv.del(`api_key_lookup:${keys[keyIndex].key_hash}`);
    await kv.set(`api_keys:${orgId}`, keys);

    console.log(`[api-keys] Revoked key ${keyId} for org ${orgId}`);
    return c.json({ success: true });
  } catch (err: any) {
    console.log('[api-keys] revoke error:', err.message);
    return c.json({ error: err.message }, 500);
  }
});

// Delete an API key permanently
apiKeys.delete(`${PREFIX}/api-keys/:keyId`, async (c) => {
  try {
    const auth = await authenticateRequest(c);
    if (auth.error) return c.json({ error: auth.error }, auth.status);

    const orgId = auth.profile.organization_id;
    if (!orgId) return c.json({ error: 'No organization found' }, 400);

    if (!['admin', 'super_admin'].includes(auth.profile.role)) {
      return c.json({ error: 'Only administrators can delete API keys' }, 403);
    }

    const keyId = c.req.param('keyId');
    const keys = (await kv.get(`api_keys:${orgId}`)) as ApiKey[] || [];
    const keyIndex = keys.findIndex(k => k.id === keyId);
    if (keyIndex === -1) return c.json({ error: 'API key not found' }, 404);

    // Remove reverse lookup
    await kv.del(`api_key_lookup:${keys[keyIndex].key_hash}`);

    keys.splice(keyIndex, 1);
    await kv.set(`api_keys:${orgId}`, keys);

    console.log(`[api-keys] Deleted key ${keyId} for org ${orgId}`);
    return c.json({ success: true });
  } catch (err: any) {
    console.log('[api-keys] delete error:', err.message);
    return c.json({ error: err.message }, 500);
  }
});
