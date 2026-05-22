import { publicAnonKey } from './supabase/info';
import { buildServerFunctionUrl } from './server-function-url';
import { getServerHeaders } from './server-headers';

const BASE_URL = buildServerFunctionUrl('/portal');

// ── Session management ──
const PORTAL_TOKEN_KEY = 'portal_session_token';
const PORTAL_USER_KEY = 'portal_user';

export interface PortalAttachment {
  id?: string;
  name: string;
  fileName?: string;
  filePath: string;
  contentType?: string;
  size?: number;
  url?: string;
  uploadedAt?: string;
}

export function getPortalToken(): string | null {
  return localStorage.getItem(PORTAL_TOKEN_KEY);
}

export function getPortalUser(): { email: string; name: string; contactId: string } | null {
  const raw = localStorage.getItem(PORTAL_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isPortalLoggedIn(): boolean {
  return !!getPortalToken() && !!getPortalUser();
}

function saveSession(token: string, user: { email: string; name: string; contactId: string }) {
  localStorage.setItem(PORTAL_TOKEN_KEY, token);
  localStorage.setItem(PORTAL_USER_KEY, JSON.stringify(user));
}

export function clearPortalSession() {
  localStorage.removeItem(PORTAL_TOKEN_KEY);
  localStorage.removeItem(PORTAL_USER_KEY);
}

// ── Shared fetch helper ──
async function portalFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = getPortalToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${publicAnonKey}`,
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['X-Portal-Token'] = token;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.statusText}`);
  }

  return data;
}

// ── Auth ──

export async function portalLogin(email: string, password: string) {
  const data = await portalFetch('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (data.success && data.token) {
    saveSession(data.token, data.user);
  }

  return data;
}

export async function portalRegister(inviteCode: string, password: string) {
  const data = await portalFetch('/register', {
    method: 'POST',
    body: JSON.stringify({ inviteCode, password }),
  });

  if (data.success && data.token) {
    saveSession(data.token, data.user);
  }

  return data;
}

export async function portalLogout() {
  try {
    await portalFetch('/logout', { method: 'POST' });
  } catch {
    // Ignore errors on logout
  }
  clearPortalSession();
}

// ── Data ──

export async function getPortalDashboard() {
  return portalFetch('/dashboard');
}

export async function getPortalQuotes() {
  return portalFetch('/quotes');
}

export async function getPortalProjects() {
  return portalFetch('/projects');
}

export async function getPortalDocuments() {
  return portalFetch('/documents');
}

export async function getPortalMessages() {
  return portalFetch('/messages');
}

export async function sendPortalMessage(
  subject: string,
  message: string,
  messageId?: string,
  context?: { contextType?: string; contextLabel?: string },
  attachments?: PortalAttachment[]
) {
  return portalFetch('/messages', {
    method: 'POST',
    body: JSON.stringify({
      subject,
      message,
      messageId,
      contextType: context?.contextType,
      contextLabel: context?.contextLabel,
      attachments: attachments || [],
    }),
  });
}

export async function uploadPortalAttachment(file: File, opts?: { contactId?: string }, accessToken?: string) {
  const formData = new FormData();
  formData.append('file', file);
  if (opts?.contactId) formData.append('contactId', opts.contactId);

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${publicAnonKey}`,
  };

  if (accessToken) {
    headers['X-User-Token'] = accessToken;
  } else {
    const token = getPortalToken();
    if (token) headers['X-Portal-Token'] = token;
  }

  const response = await fetch(`${BASE_URL}/attachments`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to upload attachment');
  return data;
}

export async function markMessageRead(messageId: string) {
  return portalFetch(`/messages/${messageId}/read`, { method: 'POST' });
}

export async function updatePortalProfile(updates: { phone?: string; address?: string; company?: string }) {
  return portalFetch('/profile', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function acceptQuote(quoteId: string) {
  return portalFetch(`/quotes/${quoteId}/accept`, { method: 'POST' });
}

export async function rejectQuote(quoteId: string) {
  return portalFetch(`/quotes/${quoteId}/reject`, { method: 'POST' });
}

// ── CRM-side functions (use CRM auth) ──

export async function getCrmPortalMessages(accessToken: string) {
  const headers = await getServerHeaders();
  const response = await fetch(`${BASE_URL}/crm-messages`, {
    headers,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to load portal messages');
  return data;
}

export async function createPortalInvite(contactId: string, accessToken: string) {
  const headers = await getServerHeaders();
  const response = await fetch(`${BASE_URL}/invite`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ contactId }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to create invite');
  return data;
}

export async function getPortalUsers(accessToken: string) {
  const headers = await getServerHeaders();
  const response = await fetch(`${BASE_URL}/portal-users`, {
    headers,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to list portal users');
  return data;
}

export async function revokePortalAccess(contactId: string, accessToken: string) {
  const headers = await getServerHeaders();
  const response = await fetch(`${BASE_URL}/revoke/${contactId}`, {
    method: 'DELETE',
    headers,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to revoke access');
  return data;
}

export async function replyToPortalMessage(
  messageId: string,
  contactId: string,
  reply: string,
  accessToken: string,
  attachments?: PortalAttachment[]
) {
  const headers = await getServerHeaders();
  const response = await fetch(`${BASE_URL}/reply`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ messageId, contactId, reply, attachments: attachments || [] }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to send reply');
  return data;
}

export async function addPortalInternalNote(messageId: string, contactId: string, note: string, accessToken: string) {
  const headers = await getServerHeaders();
  const response = await fetch(`${BASE_URL}/internal-note`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ messageId, contactId, note }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to save internal note');
  return data;
}

export async function updatePortalThreadStatus(messageId: string, contactId: string, status: 'open' | 'resolved', accessToken: string) {
  const headers = await getServerHeaders();
  const response = await fetch(`${BASE_URL}/status`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ messageId, contactId, status }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to update conversation status');
  return data;
}

export async function getInternalChats(accessToken: string) {
  const headers = await getServerHeaders();
  const response = await fetch(`${BASE_URL}/internal-chats`, {
    headers,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to load internal chats');
  return data;
}

export async function createInternalChat(payload: {
  title: string;
  contextType?: string;
  contextLabel?: string;
  initialMessage?: string;
  chatType?: 'general' | 'direct' | 'group';
  participants?: Array<{ id?: string; name: string; email?: string; kind?: 'staff' | 'portal' }>;
}, accessToken: string) {
  const headers = await getServerHeaders();
  const response = await fetch(`${BASE_URL}/internal-chats`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to create internal chat');
  return data;
}

export async function sendInternalChatMessage(chatId: string, message: string, accessToken: string) {
  const headers = await getServerHeaders();
  const response = await fetch(`${BASE_URL}/internal-chats/${chatId}/message`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to send internal chat message');
  return data;
}