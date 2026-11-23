import { createClient } from './supabase/client';
import { getServerHeaders } from './server-headers';
import { buildServerFunctionUrl } from './server-function-url';

const supabase = createClient();

export interface ProjectWizardDefault {
  id?: string;
  organization_id: string;
  planner_type: string;
  material_type: string;
  material_category: string;
  inventory_item_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  category?: string;
  description?: string;
}

export async function getProjectWizardDefaults(organizationId: string): Promise<ProjectWizardDefault[]> {
  if (!organizationId) return [];
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const headers = await getServerHeaders();
    const url = buildServerFunctionUrl(`/project-wizard-defaults?organization_id=${encodeURIComponent(organizationId)}`);
    const res = await fetch(url, { headers, signal: controller.signal });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.defaults)) {
        return data.defaults;
      }
    }
  } catch (err) {
    console.warn('[project-wizard-defaults] Server fetch failed, falling back to direct query:', err);
  } finally {
    clearTimeout(timeoutId);
  }

  try {
    const { data, error } = await supabase
      .from('project_wizard_defaults')
      .select('*')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false, nullsFirst: false });
    if (!error && Array.isArray(data)) {
      return data;
    }
  } catch (err) {
    console.warn('[project-wizard-defaults] Direct fetch error:', err);
  }

  return [];
}

export const getProjectWizardDefaultsRaw = getProjectWizardDefaults;

export async function upsertProjectWizardDefault(config: ProjectWizardDefault): Promise<boolean> {
  try {
    const headers = await getServerHeaders();
    const url = buildServerFunctionUrl('/project-wizard-defaults');
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (res.ok) {
      return true;
    }
  } catch (err) {
    console.warn('[project-wizard-defaults] Server upsert failed:', err);
  }

  try {
    const { error } = await supabase
      .from('project_wizard_defaults')
      .upsert(config, { onConflict: 'organization_id,planner_type,material_type,material_category' });
    return !error;
  } catch {
    return false;
  }
}

export async function deleteProjectWizardDefault(id: string): Promise<boolean> {
  try {
    const headers = await getServerHeaders();
    const url = buildServerFunctionUrl(`/project-wizard-defaults/${id}`);
    const res = await fetch(url, {
      method: 'DELETE',
      headers,
    });
    if (res.ok) {
      return true;
    }
  } catch (err) {
    console.warn('[project-wizard-defaults] Server delete failed:', err);
  }

  try {
    const { error } = await supabase
      .from('project_wizard_defaults')
      .delete()
      .eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function getInventoryItemsForDropdown(
  organizationId: string,
  itemIds?: string[]
): Promise<InventoryItem[]> {
  const PRIMARY_ORG_ID = '34638283-7b3d-47e2-bec8-a9e600e28c4a';
  const activeOrgId = (organizationId && organizationId !== 'default-org') ? organizationId : PRIMARY_ORG_ID;
  const orgsToTry = Array.from(new Set([activeOrgId, PRIMARY_ORG_ID, organizationId].filter(Boolean)));

  // 1. If specific itemIds are requested, fetch them directly in chunks and fall back to server endpoint for any missing IDs
  if (itemIds && itemIds.length > 0) {
    const uniqueIds = Array.from(new Set(itemIds.filter(Boolean)));
    const foundById = new Map<string, InventoryItem>();

    // Chunked direct query (UUIDs are globally unique)
    const CHUNK_SIZE = 150;
    for (let i = 0; i < uniqueIds.length; i += CHUNK_SIZE) {
      const chunk = uniqueIds.slice(i, i + CHUNK_SIZE);
      try {
        const { data, error } = await supabase
          .from('inventory')
          .select('id, name, sku, category, description')
          .in('id', chunk)
          .limit(CHUNK_SIZE);
        if (!error && Array.isArray(data)) {
          data.forEach((item) => foundById.set(item.id, item));
        }
      } catch (err) {
        console.warn('[project-wizard-defaults] Direct itemIds inventory query failed:', err);
      }
    }

    // Server fallback for any IDs not returned by client Supabase (e.g. RLS restrictions)
    const missingIds = uniqueIds.filter((id) => !foundById.has(id));
    if (missingIds.length > 0) {
      try {
        const headers = await getServerHeaders();
        for (const orgId of orgsToTry) {
          const stillMissing = uniqueIds.filter((id) => !foundById.has(id));
          if (stillMissing.length === 0) break;
          for (let i = 0; i < stillMissing.length; i += CHUNK_SIZE) {
            const chunk = stillMissing.slice(i, i + CHUNK_SIZE);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            try {
              const url = buildServerFunctionUrl(
                `/project-wizard-inventory/${encodeURIComponent(orgId)}?ids=${encodeURIComponent(chunk.join(','))}`
              );
              const res = await fetch(url, { headers, signal: controller.signal });
              if (res.ok) {
                const payload = await res.json();
                if (Array.isArray(payload?.items)) {
                  payload.items.forEach((item: InventoryItem) => foundById.set(item.id, item));
                }
              }
            } finally {
              clearTimeout(timeoutId);
            }
          }
        }
      } catch (err) {
        console.warn('[project-wizard-defaults] Server itemIds inventory fallback failed:', err);
      }
    }

    return Array.from(foundById.values());
  }

  // 2. Full dropdown list: try service-role server endpoint first (paginates all org inventory & bypasses RLS)
  try {
    const headers = await getServerHeaders();
    for (const orgId of orgsToTry) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      try {
        const url = buildServerFunctionUrl(`/project-wizard-inventory/${encodeURIComponent(orgId)}`);
        const res = await fetch(url, { headers, signal: controller.signal });
        if (res.ok) {
          const payload = await res.json();
          if (Array.isArray(payload?.items) && payload.items.length > 0) {
            return payload.items;
          }
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }
  } catch (err) {
    console.warn('[project-wizard-defaults] Server full inventory fetch failed, falling back to direct query:', err);
  }

  // 3. Direct Supabase fallback with pagination (up to 5,000 items)
  for (const orgId of orgsToTry) {
    try {
      const pageSize = 1000;
      const collected: InventoryItem[] = [];
      for (let page = 0; page < 5; page++) {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        const { data, error } = await supabase
          .from('inventory')
          .select('id, name, sku, category, description')
          .eq('organization_id', orgId)
          .order('name', { ascending: true })
          .range(from, to);
        if (error || !Array.isArray(data) || data.length === 0) break;
        collected.push(...data);
        if (data.length < pageSize) break;
      }
      if (collected.length > 0) {
        return collected;
      }
    } catch (err) {
      console.warn(`[project-wizard-defaults] Inventory query for org ${orgId} failed:`, err);
    }
  }

  // 4. Absolute fallback: fetch any inventory items available
  try {
    const { data, error } = await supabase
      .from('inventory')
      .select('id, name, sku, category, description')
      .order('name', { ascending: true })
      .limit(1000);
    if (!error && Array.isArray(data)) {
      return data;
    }
  } catch (err) {
    console.warn('[project-wizard-defaults] Final fallback inventory query failed:', err);
  }

  return [];
}

export async function getOrgConversionFactors(organizationId: string): Promise<Record<string, string>> {
  if (!organizationId) return {};
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const headers = await getServerHeaders();
    const url = buildServerFunctionUrl(`/org-conversion-factors/${organizationId}`);
    const res = await fetch(url, { headers, signal: controller.signal });
    if (res.ok) {
      const data = await res.json();
      return data.conversionFactors || {};
    }
  } catch (err) {
    console.warn('[project-wizard-defaults] Failed to get org conversion factors:', err);
  } finally {
    clearTimeout(timeoutId);
  }
  return {};
}

export async function saveOrgConversionFactors(
  organizationId: string,
  conversionFactors: Record<string, string>
): Promise<boolean> {
  if (!organizationId) return false;
  try {
    const headers = await getServerHeaders();
    const url = buildServerFunctionUrl(`/org-conversion-factors/${organizationId}`);
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversionFactors }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[project-wizard-defaults] Failed to save org conversion factors:', err);
    return false;
  }
}

export async function getUserDefaults(
  userId: string,
  organizationId: string
): Promise<Record<string, string>> {
  if (!userId || !organizationId) return {};
  try {
    const headers = await getServerHeaders();
    const url = buildServerFunctionUrl(`/user-planner-defaults/${organizationId}/${userId}`);
    const res = await fetch(url, { headers });
    if (res.ok) {
      const data = await res.json();
      return data.defaults || {};
    }
  } catch (err) {
    console.warn('[project-wizard-defaults] Failed to get user defaults:', err);
  }
  return {};
}

export async function saveUserDefaults(
  userId: string,
  organizationId: string,
  defaults: Record<string, string>
): Promise<boolean> {
  if (!userId || !organizationId) return false;
  try {
    const headers = await getServerHeaders();
    const url = buildServerFunctionUrl(`/user-planner-defaults/${organizationId}/${userId}`);
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ defaults }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[project-wizard-defaults] Failed to save user defaults:', err);
    return false;
  }
}

export async function deleteUserDefaults(
  userId: string,
  organizationId: string
): Promise<boolean> {
  if (!userId || !organizationId) return false;
  try {
    const headers = await getServerHeaders();
    const url = buildServerFunctionUrl(`/user-planner-defaults/${organizationId}/${userId}`);
    const res = await fetch(url, {
      method: 'DELETE',
      headers,
    });
    return res.ok;
  } catch (err) {
    console.warn('[project-wizard-defaults] Failed to delete user defaults:', err);
    return false;
  }
}

export async function migrateUserDefaultsFromLocalStorage(
  userId: string,
  organizationId: string
): Promise<boolean> {
  if (typeof window === 'undefined' || !userId || !organizationId) return false;
  const localStorageKey = `planner_defaults_${organizationId}_${userId}`;
  const stored = localStorage.getItem(localStorageKey);
  if (!stored) {
    return true;
  }

  try {
    const localDefaults = JSON.parse(stored);
    if (!localDefaults || typeof localDefaults !== 'object' || Object.keys(localDefaults).length === 0) {
      localStorage.removeItem(localStorageKey);
      return true;
    }

    const currentServerDefaults = await getUserDefaults(userId, organizationId);
    const merged = { ...currentServerDefaults, ...localDefaults };
    const saved = await saveUserDefaults(userId, organizationId, merged);
    if (saved) {
      localStorage.removeItem(localStorageKey);
      return true;
    }
    return false;
  } catch (err) {
    console.error('[project-wizard-defaults] Migration error:', err);
    return false;
  }
}

export function extractConversionFactors(
  defaults: Record<string, any>,
  plannerType: string,
  materialType?: string
): Record<string, number> {
  const result: Record<string, number> = {};
  if (!defaults || typeof defaults !== 'object') return result;

  const targetPlanner = (plannerType || '').toLowerCase();
  const targetMaterial = (materialType || 'default').toLowerCase();

  Object.entries(defaults).forEach(([key, rawVal]) => {
    if (rawVal === undefined || rawVal === null || rawVal === '') return;
    const num = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal));
    if (isNaN(num)) return;

    const lowerKey = key.toLowerCase();
    const isCFKey = lowerKey.endsWith('-cf');
    const cleanKey = isCFKey ? lowerKey.slice(0, -3) : lowerKey;

    const parts = cleanKey.split('-');
    if (parts.length >= 3) {
      const pType = parts[0];
      const mType = parts[1];
      const category = parts.slice(2).join('-');

      if (pType === targetPlanner && (mType === targetMaterial || mType === 'default' || !materialType)) {
        result[category] = num;
        result[cleanKey] = num;
        result[key] = num;
      }
    } else {
      result[cleanKey] = num;
      result[key] = num;
    }
  });

  return result;
}

export function extractOrgConversionFactors(
  orgCFs: Record<string, any>,
  plannerType: string,
  materialType?: string
): Record<string, number> {
  return extractConversionFactors(orgCFs, plannerType, materialType);
}
