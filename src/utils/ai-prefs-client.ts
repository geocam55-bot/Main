import { projectId } from './supabase/info';
import { getServerHeaders } from './server-headers';

const SERVER_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-8405be07`;

export async function getAIPrefsClient() {
  try {
    const headers = await getServerHeaders();
    if (!headers['X-User-Token']) return null;
    const res = await fetch(`${SERVER_BASE}/ai-preferences`, { headers });
    if (res.ok) {
      const json = await res.json();
      return json.preferences || null;
    }
  } catch (err) {
    return null;
  }
}

let _pendingUpdates: any = {};
let _upsertTimeout: ReturnType<typeof setTimeout> | null = null;

export function upsertAIPrefsClient(updates: any) {
  _pendingUpdates = { ..._pendingUpdates, ...updates };
  
  if (_upsertTimeout) {
    clearTimeout(_upsertTimeout);
  }
  
  _upsertTimeout = setTimeout(async () => {
    const payload = { ..._pendingUpdates };
    _pendingUpdates = {};
    _upsertTimeout = null;
    
    try {
      const headers = await getServerHeaders();
      if (!headers['X-User-Token']) return;
      await fetch(`${SERVER_BASE}/ai-preferences`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });
    } catch (err) {
      // Failed to sync
    }
  }, 500);
}
