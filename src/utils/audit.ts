/**
 * Frontend Audit Log Helper
 *
 * Provides a simple `logAuditEvent()` function that any component can call
 * to record user actions to the enterprise audit log (stored in the
 * `audit_logs` Supabase table via the server API).
 *
 * Usage:
 *   import { logAuditEvent } from '../utils/audit';
 *   await logAuditEvent({ action: 'create', resourceType: 'contact', resourceId: contact.id, description: 'Created new contact' });
 */

import { getServerHeaders } from './server-headers';
import { projectId } from './supabase/info';

const SERVER_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-8405be07`;

export interface AuditEventParams {
  action: string;           // e.g. 'create', 'update', 'delete', 'login', 'logout', 'export', 'permission_change', 'view'
  resourceType: string;     // e.g. 'contact', 'bid', 'inventory', 'user', 'permission', 'appointment', 'email', 'document'
  resourceId?: string;      // UUID of the affected resource (nullable)
  description?: string;     // human-readable description of what happened
  oldValues?: Record<string, any>;  // previous state (for update/delete)
  newValues?: Record<string, any>;  // new state (for create/update)
  metadata?: Record<string, any>;   // any extra context
}

/**
 * Log an audit event to the server.
 * This is fire-and-forget — it will never throw or block the UI.
 */
export async function logAuditEvent(params: AuditEventParams): Promise<void> {
  try {
    const headers = await getServerHeaders();
    const body = {
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId || null,
      details: {
        description: params.description || null,
        old_values: params.oldValues || null,
        new_values: params.newValues || null,
        ...(params.metadata || {}),
      },
    };

    // Fire-and-forget — don't await the response
    fetch(`${SERVER_BASE}/audit-logs`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }).then(async (res) => {
      if (!res.ok) {
        await res.text().catch(() => '');
      }
    }).catch((err) => {
      // Ignore network errors logging events
    });
  } catch (err: any) {
    // Ignore exceptions
  }
}

// ── Convenience wrappers for common actions ─────────────────────────────

export const auditCreate = (resourceType: string, resourceId: string, description: string, newValues?: Record<string, any>) =>
  logAuditEvent({ action: 'create', resourceType, resourceId, description, newValues });

export const auditUpdate = (resourceType: string, resourceId: string, description: string, oldValues?: Record<string, any>, newValues?: Record<string, any>) =>
  logAuditEvent({ action: 'update', resourceType, resourceId, description, oldValues, newValues });

export const auditDelete = (resourceType: string, resourceId: string, description: string, oldValues?: Record<string, any>) =>
  logAuditEvent({ action: 'delete', resourceType, resourceId, description, oldValues });

export const auditLogin = (description?: string) =>
  logAuditEvent({ action: 'login', resourceType: 'session', description: description || 'User logged in' });

export const auditLogout = (description?: string) =>
  logAuditEvent({ action: 'logout', resourceType: 'session', description: description || 'User logged out' });

export const auditExport = (resourceType: string, description: string, metadata?: Record<string, any>) =>
  logAuditEvent({ action: 'export', resourceType, description, metadata });

export const auditPermissionChange = (description: string, oldValues?: Record<string, any>, newValues?: Record<string, any>) =>
  logAuditEvent({ action: 'permission_change', resourceType: 'permission', description, oldValues, newValues });
