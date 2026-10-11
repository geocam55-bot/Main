import { getSupabaseUrl } from './supabase/client';
import { publicAnonKey } from './supabase/info';

const BASE = `${getSupabaseUrl()}/functions/v1/make-server-8405be07/portal`;

export interface PortalUser {
  contactId: string;
  email: string;
  name: string;
  orgId: string;
  phone?: string;
  company?: string;
  address?: string;
  lastLogin?: string;
  lastActiveAt?: string;
}

export function getPortalToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem('portal_token') || localStorage.getItem('prospaces_portal_token');
}

export function getPortalUser(): PortalUser | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem('portal_user') || localStorage.getItem('prospaces_portal_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isPortalLoggedIn(): boolean {
  return !!getPortalToken();
}

export function clearPortalSession(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem('portal_token');
  localStorage.removeItem('portal_user');
  localStorage.removeItem('prospaces_portal_token');
  localStorage.removeItem('prospaces_portal_user');
}

function getPortalHeaders(customToken?: string): HeadersInit {
  const token = customToken || getPortalToken() || '';
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${publicAnonKey}`,
    'X-Portal-Token': token,
  };
}

function getCrmHeaders(crmAccessToken?: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${publicAnonKey}`,
    ...(crmAccessToken ? { 'X-User-Token': crmAccessToken } : {}),
  };
}

export async function portalLogin(email: string, password: string): Promise<any> {
  const res = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');

  if (data.token) {
    localStorage.setItem('portal_token', data.token);
    if (data.user) {
      localStorage.setItem('portal_user', JSON.stringify(data.user));
    }
  }

  return data;
}

export async function portalRegister(inviteCode: string, password: string): Promise<any> {
  const res = await fetch(`${BASE}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify({ inviteCode, password }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Registration failed');

  if (data.token) {
    localStorage.setItem('portal_token', data.token);
    if (data.user) {
      localStorage.setItem('portal_user', JSON.stringify(data.user));
    }
  }

  return data;
}

export async function portalLogout(): Promise<void> {
  try {
    const token = getPortalToken();
    if (token) {
      await fetch(`${BASE}/logout`, {
        method: 'POST',
        headers: getPortalHeaders(token),
      });
    }
  } catch (err) {
    console.warn('Error during portal logout:', err);
  } finally {
    clearPortalSession();
  }
}

export async function getPortalDashboard(): Promise<any> {
  const res = await fetch(`${BASE}/dashboard`, {
    headers: getPortalHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch dashboard');
  return data;
}

export async function getPortalQuotes(): Promise<any> {
  const res = await fetch(`${BASE}/quotes`, {
    headers: getPortalHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch quotes');
  return data;
}

export async function getPortalProjects(): Promise<any> {
  const res = await fetch(`${BASE}/projects`, {
    headers: getPortalHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch projects');
  return data;
}

export async function getPortalDocuments(): Promise<any> {
  const res = await fetch(`${BASE}/documents`, {
    headers: getPortalHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch documents');
  return data;
}

export async function getPortalMessages(): Promise<any> {
  const res = await fetch(`${BASE}/messages`, {
    headers: getPortalHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch messages');
  return data;
}

export async function sendPortalMessage(msgData: {
  subject?: string;
  body: string;
  replyToId?: string;
  attachments?: any[];
}): Promise<any> {
  const res = await fetch(`${BASE}/messages`, {
    method: 'POST',
    headers: getPortalHeaders(),
    body: JSON.stringify(msgData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to send message');
  return data;
}

export async function markMessageRead(messageId: string): Promise<any> {
  const res = await fetch(`${BASE}/messages/${messageId}/read`, {
    method: 'POST',
    headers: getPortalHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to mark message as read');
  return data;
}

export async function updatePortalProfile(profileData: {
  phone?: string;
  address?: string;
  company?: string;
}): Promise<any> {
  const res = await fetch(`${BASE}/profile`, {
    method: 'PUT',
    headers: getPortalHeaders(),
    body: JSON.stringify(profileData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update profile');
  return data;
}

export async function acceptQuote(quoteId: string): Promise<any> {
  const res = await fetch(`${BASE}/quotes/${quoteId}/accept`, {
    method: 'POST',
    headers: getPortalHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to accept quote');
  return data;
}

export async function rejectQuote(quoteId: string, reason?: string): Promise<any> {
  const res = await fetch(`${BASE}/quotes/${quoteId}/reject`, {
    method: 'POST',
    headers: getPortalHeaders(),
    body: JSON.stringify({ reason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to decline quote');
  return data;
}

export async function createPortalInvite(contactId: string, crmAccessToken: string): Promise<any> {
  const res = await fetch(`${BASE}/invite`, {
    method: 'POST',
    headers: getCrmHeaders(crmAccessToken),
    body: JSON.stringify({ contactId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create invite');
  return data;
}

export async function revokePortalAccess(contactId: string, crmAccessToken: string): Promise<any> {
  const res = await fetch(`${BASE}/revoke/${contactId}`, {
    method: 'DELETE',
    headers: getCrmHeaders(crmAccessToken),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to revoke portal access');
  return data;
}

export async function getPortalUsers(crmAccessToken?: string): Promise<any> {
  const res = await fetch(`${BASE}/portal-users`, {
    headers: getCrmHeaders(crmAccessToken),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch portal users');
  return data;
}

export async function getCrmPortalMessages(crmAccessToken?: string): Promise<any> {
  const res = await fetch(`${BASE}/crm-messages`, {
    headers: getCrmHeaders(crmAccessToken),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch CRM portal messages');
  return data;
}

export async function replyToPortalMessage(
  messageId: string,
  contactId: string,
  body: string,
  crmAccessToken?: string,
  attachments?: any[]
): Promise<any> {
  const res = await fetch(`${BASE}/reply`, {
    method: 'POST',
    headers: getCrmHeaders(crmAccessToken),
    body: JSON.stringify({ messageId, contactId, body, attachments }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to send reply');
  return data;
}

export async function addPortalInternalNote(
  messageId: string,
  contactId: string,
  body: string,
  crmAccessToken?: string,
  attachments?: any[]
): Promise<any> {
  const res = await fetch(`${BASE}/internal-note`, {
    method: 'POST',
    headers: getCrmHeaders(crmAccessToken),
    body: JSON.stringify({ messageId, contactId, body, attachments }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to add internal note');
  return data;
}

export async function updatePortalThreadStatus(
  messageId: string,
  contactId: string,
  status: 'open' | 'resolved',
  crmAccessToken?: string
): Promise<any> {
  const res = await fetch(`${BASE}/status`, {
    method: 'POST',
    headers: getCrmHeaders(crmAccessToken),
    body: JSON.stringify({ messageId, contactId, status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update status');
  return data;
}

export async function getInternalChats(crmAccessToken?: string): Promise<any> {
  const res = await fetch(`${BASE}/internal-chats`, {
    headers: getCrmHeaders(crmAccessToken),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch internal chats');
  return data;
}

export async function createInternalChat(
  chatData: {
    title?: string;
    contextType?: string;
    contextLabel?: string;
    chatType?: string;
    participants?: any[];
    initialMessage?: string;
  },
  crmAccessToken?: string
): Promise<any> {
  const res = await fetch(`${BASE}/internal-chats`, {
    method: 'POST',
    headers: getCrmHeaders(crmAccessToken),
    body: JSON.stringify(chatData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create internal chat');
  return data;
}

export async function sendInternalChatMessage(
  chatId: string,
  body: string,
  crmAccessToken?: string
): Promise<any> {
  const res = await fetch(`${BASE}/internal-chats/${chatId}/message`, {
    method: 'POST',
    headers: getCrmHeaders(crmAccessToken),
    body: JSON.stringify({ body }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to send internal chat message');
  return data;
}

export async function uploadPortalAttachment(
  file: File,
  context?: { contactId?: string },
  crmAccessToken?: string
): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  if (context?.contactId) {
    formData.append('contactId', context.contactId);
  }

  const token = crmAccessToken || getPortalToken() || '';
  const headers: HeadersInit = {
    'Authorization': `Bearer ${publicAnonKey}`,
    ...(crmAccessToken ? { 'X-User-Token': token } : { 'X-Portal-Token': token }),
  };

  const res = await fetch(`${BASE}/attachments`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to upload attachment');
  return data;
}
