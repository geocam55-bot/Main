import { useState, useEffect } from 'react';
import { emailAPI } from '../utils/api';
import { toast } from 'sonner@2.0.3';
import { createClient } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info.tsx';
import { getServerHeaders } from '../utils/server-headers';
import {
  Mail,
  Send,
  Search,
  Star,
  Archive,
  Trash2,
  MoreVertical,
  Plus,
  RefreshCw,
  Link2,
  Settings,
  Paperclip,
  Info,
  CheckCircle,
  XCircle,
  Inbox,
  AlertCircle,
  Flag,
  FolderOpen,
  FileText,
  Folders,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { EmailAccountSetup } from './EmailAccountSetup';
import { EmailModuleHelp } from './EmailModuleHelp';
import type { User } from '../App';
import { PermissionGate } from './PermissionGate';
import { canAdd, canDelete } from '../utils/permissions';
import { useDebounce } from '../utils/useDebounce';
import { getPreloadedAccounts, clearPreloadedAccounts } from '../utils/email-preloader';

// Cache backend availability check to avoid repeated failed requests
// This prevents console spam from 404 errors when Edge Functions aren't deployed
let backendAvailabilityCache: { checked: boolean; available: boolean; timestamp: number } | null = null;
const CACHE_DURATION = 60000; // Cache for 1 minute

// Function to check if the consolidated server is available
async function checkEdgeFunctionAvailability(): Promise<boolean> {
  // Check cache first
  if (backendAvailabilityCache && (Date.now() - backendAvailabilityCache.timestamp < CACHE_DURATION)) {
    return backendAvailabilityCache.available;
  }

  try {
    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/health`,
      { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
    );
    const available = res.ok;
    backendAvailabilityCache = { checked: true, available, timestamp: Date.now() };
    return available;
  } catch (error: any) {
    backendAvailabilityCache = { checked: true, available: false, timestamp: Date.now() };
    return false;
  }
}

interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: string;
  read: boolean;
  starred: boolean;
  folder: 'inbox' | 'sent' | 'drafts' | 'archive' | 'trash' | 'spam' | 'important' | string; // Allow custom folder IDs
  linkedTo?: string;
  accountId: string;
  flagged?: boolean;
  priority?: 'low' | 'normal' | 'high';
  hasAttachments?: boolean;
}

interface EmailAccount {
  id: string;
  provider: 'gmail' | 'outlook' | 'apple' | 'imap';
  email: string;
  connected: boolean;
  lastSync?: string;
  imapConfig?: {
    host: string;
    port: number;
    username: string;
    password: string;
  };
  smtpConfig?: {
    host: string;
    port: number;
    username: string;
    password: string;
  };
}

interface EmailProps {
  user: User;
}

export function Email({ user }: EmailProps) {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [selectedAccount, setSelectedAccountRaw] = useState<string>(() => {
    try { return localStorage.getItem('prospaces_selected_email_account') || ''; } catch { return ''; }
  });
  // Wrap setter to persist selection across module navigation
  const setSelectedAccount = (id: string) => {
    setSelectedAccountRaw(id);
    try { localStorage.setItem('prospaces_selected_email_account', id); } catch {}
  };
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // 🚀 Debounce search for better performance
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingAccount, setEditingAccount] = useState<EmailAccount | null>(null);
  const [currentFolder, setCurrentFolder] = useState<Email['folder']>('inbox');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; email: Email } | null>(null);
  const [showFoldersSidebar, setShowFoldersSidebar] = useState(true);

  // Custom folders state
  const [customFolders, setCustomFolders] = useState<Array<{ id: string; name: string; color?: string }>>([]);
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#3b82f6');

  const [composeEmail, setComposeEmail] = useState({
    to: '',
    subject: '',
    body: '',
    linkTo: '',
  });

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    const handleScroll = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    document.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  // 🔄 Auto-sync emails every 5 minutes
  useEffect(() => {
    if (!selectedAccount) return;

    // Set up interval for auto-sync every 5 minutes
    const syncInterval = setInterval(() => {
      handleSync();
    }, 5 * 60 * 1000); // 5 minutes in milliseconds

    // Cleanup interval on unmount or when account changes
    return () => {
      clearInterval(syncInterval);
    };
  }, [selectedAccount]);

  // Load data on mount from Supabase — use preloaded accounts if available
  useEffect(() => {
    const preloaded = getPreloadedAccounts();
    if (preloaded && preloaded.length > 0) {
      const transformed: EmailAccount[] = preloaded.map(a => ({
        id: a.id,
        provider: a.provider,
        email: a.email,
        connected: a.connected,
        lastSync: a.last_sync,
        imapConfig: a.imap_host ? { host: a.imap_host, port: a.imap_port!, username: a.imap_username!, password: a.imap_password! } : undefined,
        smtpConfig: a.smtp_host ? { host: a.smtp_host, port: a.smtp_port!, username: a.smtp_username!, password: a.smtp_password! } : undefined,
      }));
      setAccounts(transformed);
      setIsLoading(false);
      clearPreloadedAccounts();
    } else {
      loadAccountsFromSupabase();
    }
    loadEmailsFromSupabase();
    loadCustomFolders();
    
    // Check for OAuth callback success/error
    const urlParams = new URLSearchParams(window.location.search);
    const oauthSuccess = urlParams.get('oauth_success');
    const oauthError = urlParams.get('oauth_error');
    const provider = urlParams.get('provider');
    const email = urlParams.get('email');
    
    if (oauthSuccess === 'true' && provider && email) {
      toast.success(`${provider.charAt(0).toUpperCase() + provider.slice(1)} account connected: ${decodeURIComponent(email)}`);
      // Reload accounts to show the newly connected account
      setTimeout(() => {
        loadAccountsFromSupabase();
      }, 1000);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (oauthError) {
      toast.error(`OAuth failed: ${decodeURIComponent(oauthError)}`);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Auto-select first account when accounts are loaded, or fix stale persisted selection
  useEffect(() => {
    if (accounts.length === 0) return;
    // If nothing selected, pick the first account
    if (!selectedAccount) {
      setSelectedAccount(accounts[0].id);
      return;
    }
    // If the persisted account no longer exists in the loaded list, reset to first
    if (!accounts.find(a => a.id === selectedAccount)) {
      setSelectedAccount(accounts[0].id);
    }
  }, [accounts]);

  const loadAccountsFromSupabase = async () => {
    try {
      const headers = await getServerHeaders();
      if (!headers['X-User-Token']) {
        setIsLoading(false);
        return;
      }

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/email-accounts`,
        { headers }
      );
      if (!res.ok) {
        const errBody = await res.text();
        return;
      }
      const json = await res.json();
      const data = json.accounts;
      const error = json.error;

      if (error) {
        return;
      }

      if (data && data.length > 0) {
        // Transform Supabase data to our format
        const transformedAccounts: EmailAccount[] = data.map(account => ({
          id: account.id,
          provider: account.provider as 'gmail' | 'outlook' | 'apple' | 'imap',
          email: account.email,
          connected: account.connected !== false, // default to true for KV-only accounts
          lastSync: account.last_sync,
          imapConfig: account.imap_host ? {
            host: account.imap_host,
            port: account.imap_port,
            username: account.imap_username,
            password: account.imap_password,
          } : undefined,
          smtpConfig: account.smtp_host ? {
            host: account.smtp_host,
            port: account.smtp_port,
            username: account.smtp_username,
            password: account.smtp_password,
          } : undefined,
        }));

        setAccounts(transformedAccounts);
      } else {
        // No accounts found — clear the list
        setAccounts([]);
      }
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  const loadEmailsFromSupabase = async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;

      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .eq('user_id', session.user.id)
        // Temporarily removed organization filter to debug
        // .eq('organization_id', user.organizationId)
        .order('received_at', { ascending: false })
        .limit(100);

      if (error) {
        return;
      }

      if (data && data.length > 0) {
        // Transform Supabase data to our format
        const transformedEmails: Email[] = data.map(email => ({
          id: email.id,
          from: email.from_email,
          to: email.to_email,
          subject: email.subject || '',
          body: email.body || '',
          date: email.received_at,
          read: email.is_read,
          starred: email.is_starred,
          folder: email.folder as Email['folder'],
          linkedTo: email.contact_id ? `Contact: ${email.contact_id}` : undefined,
          accountId: email.account_id,
          // New fields - use optional chaining for backward compatibility
          flagged: email.is_flagged ?? false,
          priority: email.priority ?? 'normal',
          hasAttachments: email.has_attachments ?? false,
        }));

        setEmails(transformedEmails);
      }
    } catch (error) {
    }
  };

  const saveAccountToSupabase = async (account: EmailAccount) => {
    try {
      const accountData: Record<string, any> = {
        id: account.id,
        organization_id: user.organizationId,
        provider: account.provider,
        email: account.email,
        connected: account.connected,
        last_sync: account.lastSync,
      };
      if (account.imapConfig) {
        accountData.imap_host = account.imapConfig.host;
        accountData.imap_port = account.imapConfig.port;
        accountData.imap_username = account.imapConfig.username;
        accountData.imap_password = account.imapConfig.password;
      }
      if (account.smtpConfig) {
        accountData.smtp_host = account.smtpConfig.host;
        accountData.smtp_port = account.smtpConfig.port;
        accountData.smtp_username = account.smtpConfig.username;
        accountData.smtp_password = account.smtpConfig.password;
      }
      const headers = await getServerHeaders();
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/email-accounts`,
        { method: 'POST', headers, body: JSON.stringify(accountData) }
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: 'Unknown server error' }));
        throw new Error(errBody.error || `Server returned ${res.status}`);
      }
    } catch (error) {
      throw error;
    }
  };

  const saveEmailToSupabase = async (email: Email) => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No session found');
      }

      const emailData = {
        id: email.id,
        user_id: session.user.id,
        organization_id: user.organizationId,
        account_id: email.accountId,
        message_id: email.id, // Use our ID as message_id for now
        from_email: email.from,
        to_email: email.to,
        subject: email.subject,
        body: email.body,
        folder: email.folder,
        is_read: email.read,
        is_starred: email.starred,
        received_at: email.date,
      };

      const { error } = await supabase
        .from('emails')
        .upsert(emailData);

      if (error) {
        throw error;
      }
    } catch (error) {
      // Don't throw - we'll still save to localStorage as fallback
    }
  };

  const deleteAccountFromSupabase = async (accountId: string): Promise<boolean> => {
    try {
      const headers = await getServerHeaders();
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/email-accounts/${accountId}`,
        { method: 'DELETE', headers }
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errBody.error || `Server returned ${res.status}`);
      }
      const result = await res.json();
      return true;
    } catch (error) {
      throw error;
    }
  };

  // Custom folder management functions
  const loadCustomFolders = async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;

      const { data, error } = await supabase
        .from('email_custom_folders')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('organization_id', user.organizationId)
        .order('name');

      if (error) {
        // Table might not exist yet
        if (error.code === '42P01') {
          return;
        }
        throw error;
      }

      setCustomFolders(data || []);
    } catch (error) {
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const { data, error } = await supabase
        .from('email_custom_folders')
        .insert({
          name: newFolderName.trim(),
          color: newFolderColor,
          user_id: session.user.id,
          organization_id: user.organizationId,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '42P01') {
          toast.error('Custom folders table does not exist. Please run the migration in Settings → Test Data tab.');
          return;
        }
        throw error;
      }

      setCustomFolders([...customFolders, data]);
      setNewFolderName('');
      setNewFolderColor('#3b82f6');
      setIsFolderDialogOpen(false);
      toast.success(`Folder "${data.name}" created!`);
    } catch (error: any) {
      toast.error(`Failed to create folder: ${error.message}`);
    }
  };

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    // Check if any emails are in this folder
    const emailsInFolder = emails.filter(e => e.folder === folderId);
    
    if (emailsInFolder.length > 0) {
      if (!confirm(`This folder contains ${emailsInFolder.length} email(s). These emails will be moved to Inbox. Continue?`)) {
        return;
      }
    }

    try {
      const supabase = createClient();

      // Move emails to inbox first
      if (emailsInFolder.length > 0) {
        for (const email of emailsInFolder) {
          await supabase
            .from('emails')
            .update({ folder: 'inbox' })
            .eq('id', email.id);
        }

        // Update local state
        setEmails(emails.map(e => 
          e.folder === folderId ? { ...e, folder: 'inbox' as Email['folder'] } : e
        ));
      }

      // Delete the folder
      const { error } = await supabase
        .from('email_custom_folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;

      setCustomFolders(customFolders.filter(f => f.id !== folderId));
      
      // If we're viewing this folder, switch to inbox
      if (currentFolder === folderId) {
        setCurrentFolder('inbox');
      }

      toast.success(`Folder "${folderName}" deleted`);
    } catch (error: any) {
      toast.error(`Failed to delete folder: ${error.message}`);
    }
  };

  const filteredEmails = emails
    .filter(email => {
      // If an account is selected, only show emails for that account
      // Otherwise show all emails
      if (selectedAccount && email.accountId !== selectedAccount) {
        return false;
      }

      // Handle special folders
      if (currentFolder === 'important') {
        return email.starred;
      } else if (currentFolder === 'flagged') {
        return email.flagged;
      }
      
      // Regular folders
      return email.folder === currentFolder;
    })
    .filter(email => {
      const query = debouncedSearchQuery.toLowerCase().trim();
      if (!query) return true;
      
      // 🔍 Enhanced search: search across multiple fields
      return email.subject.toLowerCase().includes(query) ||
        email.from.toLowerCase().includes(query) ||
        email.to.toLowerCase().includes(query) ||
        email.body.toLowerCase().includes(query);
    });

  const handleSendEmail = async () => {
    if (!selectedAccount) {
      toast.error('Please select an email account');
      return;
    }

    // Basic validation
    if (!composeEmail.to.trim()) {
      toast.error('Please enter a recipient email address');
      return;
    }

    if (!composeEmail.subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }

    if (!composeEmail.body.trim()) {
      toast.error('Please enter a message');
      return;
    }

    const currentAccount = accounts.find(a => a.id === selectedAccount);
    if (!currentAccount) {
      toast.error('Email account not found');
      return;
    }

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please log in to send emails');
        return;
      }

      // Use consolidated server endpoint for sending (supports Outlook + Gmail)
      if (currentAccount.provider === 'outlook' || currentAccount.provider === 'gmail') {
        
        try {
          const sendHeaders = await getServerHeaders();
          const sendRes = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/email-send`,
            {
              method: 'POST',
              headers: sendHeaders,
              body: JSON.stringify({
                accountId: selectedAccount,
                to: composeEmail.to.trim(),
                subject: composeEmail.subject.trim(),
                body: composeEmail.body.trim(),
              }),
            }
          );

          const sendData = await sendRes.json();
          if (!sendRes.ok || !sendData.success) {
            throw new Error(sendData.error || `Server returned ${sendRes.status}`);
          }

          await loadEmailsFromSupabase();
          setComposeEmail({ to: '', subject: '', body: '', linkTo: '' });
          setIsComposeOpen(false);
          toast.success('Email sent successfully!');
          return;
        } catch (sendError: any) {
          toast.error(`Failed to send email: ${sendError.message}`);
          
          // Save as draft
          const draftEmail: Email = {
            id: crypto.randomUUID(),
            from: currentAccount.email,
            to: composeEmail.to,
            subject: composeEmail.subject,
            body: composeEmail.body,
            date: new Date().toISOString(),
            read: true,
            starred: false,
            folder: 'drafts' as const,
            linkedTo: composeEmail.linkTo || undefined,
            accountId: selectedAccount,
          };
          
          await saveEmailToSupabase(draftEmail);
          setEmails([draftEmail, ...emails]);
          setComposeEmail({ to: '', subject: '', body: '', linkTo: '' });
          setIsComposeOpen(false);
          toast.info('Email saved as draft - sending failed');
          return;
        }
      }

      // Check if we have SMTP credentials for direct sending
      if (currentAccount.smtpConfig) {
        
        // Check if Edge Function is deployed before attempting to send
        const isFunctionAvailable = await checkEdgeFunctionAvailability();
        
        if (!isFunctionAvailable) {
          toast.error(
            'Email sending function not deployed yet. ' +
            'Deploy it via Supabase Dashboard at: ' +
            'https://supabase.com/dashboard/project/usorqldwroecyxucmtuw/functions',
            { duration: 8000 }
          );
          
          // Fall through to demo mode
        } else {
          
          // Validate SMTP config before sending
          if (!currentAccount.smtpConfig.host || !currentAccount.smtpConfig.port || 
              !currentAccount.smtpConfig.username || !currentAccount.smtpConfig.password) {
            throw new Error('Incomplete SMTP configuration. Please reconfigure your email account.');
          }
        
          // Prepare request payload
          const payload = {
            to: composeEmail.to.trim(),
            subject: composeEmail.subject.trim(),
            body: composeEmail.body.trim(),
            from: currentAccount.email,
            smtpConfig: {
              host: currentAccount.smtpConfig.host,
              port: currentAccount.smtpConfig.port,
              username: currentAccount.smtpConfig.username,
              password: currentAccount.smtpConfig.password,
            },
          };
          
          // Try to use simple-send-email function with SMTP credentials
          try {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
              throw new Error('Not authenticated');
            }

            // Direct fetch to Edge Function with proper CORS headers
            const functionUrl = `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/send-email`;
            
            const fetchResponse = await fetch(functionUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
                'apikey': publicAnonKey,
              },
              body: JSON.stringify(payload),
            });

            if (!fetchResponse.ok) {
              const errorText = await fetchResponse.text();
              throw new Error(`HTTP ${fetchResponse.status}: ${errorText}`);
            }

            const responseData = await fetchResponse.json();

            if (!responseData.success) {
              throw new Error(responseData.error || 'Failed to send email');
            }

            // Success! Email sent via SMTP
            
            const newEmail: Email = {
              id: crypto.randomUUID(),
              from: currentAccount.email,
              to: composeEmail.to,
              subject: composeEmail.subject,
              body: composeEmail.body,
              date: new Date().toISOString(),
              read: true,
              starred: false,
              folder: 'sent' as const,
              linkedTo: composeEmail.linkTo || undefined,
              accountId: selectedAccount,
            };

            // Save to Supabase
            await saveEmailToSupabase(newEmail);
            
            setEmails([newEmail, ...emails]);
            setComposeEmail({ to: '', subject: '', body: '', linkTo: '' });
            setIsComposeOpen(false);
            toast.success('✅ Email sent successfully via SMTP!');
            return;
          } catch (smtpError: any) {
            
            // Check if it's a CORS/network error
            if (smtpError instanceof TypeError && smtpError.message === 'Failed to fetch') {
              toast.error(
                '❌ CORS Error: Edge Function needs to be redeployed',
                {
                  description: 'The simple-send-email function needs to be redeployed via Supabase Dashboard with the updated CORS headers. Check the Edge Function code at /supabase/functions/simple-send-email/index.ts',
                  duration: 10000,
                }
              );
              
              // Save as draft instead
              const draftEmail: Email = {
                id: crypto.randomUUID(),
                from: currentAccount.email,
                to: composeEmail.to,
                subject: composeEmail.subject,
                body: composeEmail.body,
                date: new Date().toISOString(),
                read: true,
                starred: false,
                folder: 'drafts' as const,
                linkedTo: composeEmail.linkTo || undefined,
                accountId: selectedAccount,
              };
              
              await saveEmailToSupabase(draftEmail);
              setEmails([draftEmail, ...emails]);
              setComposeEmail({ to: '', subject: '', body: '', linkTo: '' });
              setIsComposeOpen(false);
              toast.info('💾 Email saved as draft due to CORS error');
              return;
            }
            
            // If simple-send-email function isn't deployed, fall through to demo mode
            if (smtpError.message?.includes('Failed to send a request') || 
                smtpError.message?.includes('FunctionsHttpError') ||
                smtpError.message?.includes('FunctionsRelayError') ||
                smtpError.message?.includes('404')) {
              toast.error('Email function not deployed. Run: supabase functions deploy simple-send-email');
              // Continue to demo mode below
            } else {
              // Real SMTP error - show it to user
              throw smtpError;
            }
          }
        }
      }

      // Demo mode fallback
      
      toast.error('Email sending failed', {
        description: 'The simple-send-email Edge Function is not responding. Please check:\n1. Edge Function is deployed in Supabase Dashboard\n2. SMTP configuration is complete\n3. Check browser console for detailed error',
        duration: 10000,
      });

      // Save as draft instead of showing confusing confirm dialog
      const draftEmail: Email = {
        id: crypto.randomUUID(),
        from: currentAccount.email,
        to: composeEmail.to,
        subject: composeEmail.subject,
        body: composeEmail.body,
        date: new Date().toISOString(),
        read: true,
        starred: false,
        folder: 'drafts' as const,
        linkedTo: composeEmail.linkTo || undefined,
        accountId: selectedAccount,
      };

      await saveEmailToSupabase(draftEmail);
      setEmails([draftEmail, ...emails]);
      setComposeEmail({ to: '', subject: '', body: '', linkTo: '' });
      setIsComposeOpen(false);
      toast.info('💾 Email saved as draft - please check email configuration');
      return;
    } catch (error: any) {
      
      // Show specific error message
      if (error.message?.includes('SMTP') || error.message?.includes('connection')) {
        toast.error(`SMTP Error: ${error.message}`);
      } else if (error.message?.includes('Failed to send a request') || error.message?.includes('FunctionsHttpError')) {
        toast.error('Email function not deployed. Run: supabase functions deploy simple-send-email');
      } else {
        toast.error(`Failed to send email: ${error.message}`);
      }
    }
  };

  const handleMarkAsRead = async (id: string, read: boolean = true) => {
    const email = emails.find(e => e.id === id);
    if (!email) return;

    try {
      const supabase = createClient();
      await supabase
        .from('emails')
        .update({ is_read: read })
        .eq('id', id);

      setEmails(emails.map(e =>
        e.id === id ? { ...e, read } : e
      ));
      toast.success(read ? 'Marked as read' : 'Marked as unread');
    } catch (error) {
    }
  };

  const handleToggleStar = async (id: string) => {
    const email = emails.find(e => e.id === id);
    if (!email) return;

    try {
      const supabase = createClient();
      await supabase
        .from('emails')
        .update({ is_starred: !email.starred })
        .eq('id', id);

      setEmails(emails.map(e =>
        e.id === id ? { ...e, starred: !e.starred } : e
      ));
      toast.success(email.starred ? 'Unstarred' : 'Starred');
    } catch (error) {
    }
  };

  const handleToggleFlag = async (id: string) => {
    const email = emails.find(e => e.id === id);
    if (!email) return;

    try {
      const supabase = createClient();
      await supabase
        .from('emails')
        .update({ is_flagged: !email.flagged })
        .eq('id', id);

      setEmails(emails.map(e =>
        e.id === id ? { ...e, flagged: !e.flagged } : e
      ));
      toast.success(email.flagged ? 'Flag removed' : 'Flagged');
    } catch (error) {
    }
  };

  const handleMoveToFolder = async (id: string, folder: string) => {
    const email = emails.find(e => e.id === id);
    if (!email) {
      return;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('emails')
        .update({ folder })
        .eq('id', id)
        .select();

      if (error) {
        toast.error(`Failed to move email: ${error.message}`);
        return;
      }

      setEmails(emails.map(e =>
        e.id === id ? { ...e, folder } : e
      ));
      
      setSelectedEmail(null);
      
      const folderNames: Record<string, string> = {
        inbox: 'Inbox',
        sent: 'Sent',
        drafts: 'Drafts',
        archive: 'Archive',
        trash: 'Trash',
        spam: 'Spam',
        important: 'Important'
      };
      
      // Check if it's a custom folder
      const customFolder = customFolders.find(f => f.id === folder);
      const folderName = customFolder ? customFolder.name : (folderNames[folder] || folder);
      
      toast.success(`Moved to ${folderName}`);
    } catch (error: any) {
      toast.error(`Failed to move email: ${error.message || 'Unknown error'}`);
    }
  };

  const handleArchive = (id: string) => {
    handleMoveToFolder(id, 'archive');
  };

  const handleDelete = (id: string) => {
    handleMoveToFolder(id, 'trash');
  };

  const handleContextMenu = (e: React.MouseEvent, email: Email) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      email
    });
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this email? This action cannot be undone.')) {
      return;
    }

    try {
      const supabase = createClient();
      
      // Delete from Supabase
      const { error } = await supabase
        .from('emails')
        .delete()
        .eq('id', id);

      if (error) {
        toast.error('Failed to delete email from database');
        return;
      }

      // Remove from local state
      setEmails(emails.filter(e => e.id !== id));
      setSelectedEmail(null);
      toast.success('Email permanently deleted');
    } catch (error) {
      toast.error('Failed to delete email');
    }
  };

  const handleEmptyTrash = async () => {
    const trashEmails = emails.filter(e => e.folder === 'trash' && e.accountId === selectedAccount);
    
    if (trashEmails.length === 0) {
      toast.info('Trash is already empty');
      return;
    }

    if (!confirm(`Permanently delete ${trashEmails.length} email(s) from Trash? This action cannot be undone.`)) {
      return;
    }

    try {
      const supabase = createClient();
      
      // Delete all trash emails from Supabase
      const { error } = await supabase
        .from('emails')
        .delete()
        .eq('folder', 'trash')
        .eq('account_id', selectedAccount);

      if (error) throw error;

      // Update local state
      setEmails(emails.filter(e => !(e.folder === 'trash' && e.accountId === selectedAccount)));
      setSelectedEmail(null);
      toast.success(`${trashEmails.length} email(s) permanently deleted`);
    } catch (error) {
      toast.error('Failed to empty trash');
    }
  };

  const handleSync = async () => {
    
    if (!selectedAccount) {
      toast.error('Please select an email account first');
      return;
    }
    
    setIsSyncing(true);
    
    try {
      const currentAccount = accounts.find(a => a.id === selectedAccount);
      
      if (!currentAccount) {
        toast.error('Please select an email account');
        setIsSyncing(false);
        return;
      }

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please log in to sync emails');
        setIsSyncing(false);
        return;
      }

      // Use consolidated server sync endpoint (handles Outlook + Gmail)

      const syncHeaders = await getServerHeaders();
      const syncRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/email-sync`,
        {
          method: 'POST',
          headers: syncHeaders,
          body: JSON.stringify({
            accountId: selectedAccount,
            limit: 50,
          }),
        }
      );

      const syncData = await syncRes.json();

      if (!syncRes.ok || !syncData.success) {
        throw new Error(syncData.error || `Sync failed with status ${syncRes.status}`);
      }

      // Success!
      backendAvailabilityCache = { checked: true, available: true, timestamp: Date.now() };

      // Reload emails from Supabase
      await loadEmailsFromSupabase();
      
      // Update last sync time
      setAccounts(accounts.map(account =>
        account.id === selectedAccount
          ? { ...account, lastSync: new Date().toISOString() }
          : account
      ));

      const syncedCount = syncData.syncedCount || 0;
      if (syncedCount > 0) {
        toast.success(`Synced ${syncedCount} new email${syncedCount > 1 ? 's' : ''}!`);
      } else {
        toast.success('No new emails');
      }
      
    } catch (error: any) {
      toast.error(`Failed to sync emails: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAccountAdded = async (account: EmailAccount) => {
    try {
      // Save to Supabase first
      await saveAccountToSupabase(account);
      
      if (editingAccount) {
        // Update existing account
        setAccounts(accounts.map(a => a.id === editingAccount.id ? account : a));
        toast.success('Email account updated successfully!');
      } else {
        // Add new account
        setAccounts([...accounts, account]);
        setSelectedAccount(account.id);
        toast.success('Email account connected successfully!');
      }
      setIsSettingsOpen(false);
      setEditingAccount(null);
    } catch (error: any) {
      toast.error(`Failed to save account: ${error.message}`);
    }
  };

  const handleEditAccount = () => {
    const account = accounts.find(a => a.id === selectedAccount);
    if (account) {
      setEditingAccount(account);
      setIsSettingsOpen(true);
    }
  };

  const handleDeleteAccount = async () => {
    if (!selectedAccount) return;
    
    const account = accounts.find(a => a.id === selectedAccount);
    const emailToDelete = account?.email;
    if (confirm(`Are you sure you want to delete the account ${emailToDelete}? All associated emails will be removed.`)) {
      try {
        // Delete from server first (DB + KV)
        await deleteAccountFromSupabase(selectedAccount);
        
        // Remove ALL accounts matching this email (catches duplicates with different IDs)
        const remainingAccounts = accounts.filter(a => 
          a.id !== selectedAccount && (!emailToDelete || a.email !== emailToDelete)
        );
        setAccounts(remainingAccounts);
        
        // Remove emails for this account
        setEmails(emails.filter(e => e.accountId !== selectedAccount));
        
        // Clear persisted selection from localStorage
        try { localStorage.removeItem('prospaces_selected_email_account'); } catch {}
        
        // Select first remaining account or clear
        if (remainingAccounts.length > 0) {
          setSelectedAccount(remainingAccounts[0].id);
        } else {
          setSelectedAccount('');
        }
        
        toast.success('Email account deleted successfully');
        
        // Re-fetch from server to confirm deletion stuck
        await loadAccountsFromSupabase();
      } catch (error) {
        toast.error(`Failed to delete account: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const stripHtml = (html: string) => {
    // Remove HTML tags and decode entities for preview
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const getEmailPreview = (body: string) => {
    // Strip HTML tags and limit to first 100 characters
    const plainText = stripHtml(body);
    return plainText.length > 100 ? plainText.substring(0, 100) + '...' : plainText;
  };

  const getProviderIcon = (provider: string) => {
    // For display purposes - in production would use actual provider logos
    return provider.charAt(0).toUpperCase();
  };

  const unreadCount = emails.filter(e => !e.read && e.folder === 'inbox' && e.accountId === selectedAccount).length;

  // Folder counts
  const folderCounts = {
    inbox: emails.filter(e => e.folder === 'inbox' && e.accountId === selectedAccount).length,
    sent: emails.filter(e => e.folder === 'sent' && e.accountId === selectedAccount).length,
    drafts: emails.filter(e => e.folder === 'drafts' && e.accountId === selectedAccount).length,
    archive: emails.filter(e => e.folder === 'archive' && e.accountId === selectedAccount).length,
    trash: emails.filter(e => e.folder === 'trash' && e.accountId === selectedAccount).length,
    spam: emails.filter(e => e.folder === 'spam' && e.accountId === selectedAccount).length,
    important: emails.filter(e => e.starred && e.accountId === selectedAccount).length,
    flagged: emails.filter(e => e.flagged && e.accountId === selectedAccount).length,
  };

  const folders: Array<{ 
    id: Email['folder'] | 'flagged'; 
    label: string; 
    icon: any; 
    count: number;
  }> = [
    { id: 'inbox', label: 'Inbox', icon: Inbox, count: folderCounts.inbox },
    { id: 'important', label: 'Starred', icon: Star, count: folderCounts.important },
    { id: 'flagged', label: 'Flagged', icon: Flag, count: folderCounts.flagged },
    { id: 'sent', label: 'Sent', icon: Send, count: folderCounts.sent },
    { id: 'drafts', label: 'Drafts', icon: FileText, count: folderCounts.drafts },
    { id: 'archive', label: 'Archive', icon: Archive, count: folderCounts.archive },
    { id: 'spam', label: 'Spam', icon: AlertCircle, count: folderCounts.spam },
    { id: 'trash', label: 'Trash', icon: Trash2, count: folderCounts.trash },
  ];

  return (
    <PermissionGate user={user} module="email" action="view">
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center justify-end gap-2">
          <EmailModuleHelp
            userId={user.id}
            totalEmails={filteredEmails.length}
            connectedAccounts={accounts.length}
            onOpenInbox={() => setCurrentFolder('inbox')}
            onOpenStarred={() => setCurrentFolder('important')}
            onOpenSearchExample={(query) => setSearchQuery(query)}
            onClearSearch={() => setSearchQuery('')}
            onSync={handleSync}
            onOpenAccountSetup={() => setIsSettingsOpen(true)}
            onOpenCompose={() => setIsComposeOpen(true)}
          />
          <Button variant="outline" onClick={() => setIsSettingsOpen(true)} className="text-xs sm:text-sm">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Account</span>
          </Button>
          {canAdd('email', user.role) && (
          <Button onClick={() => setIsComposeOpen(true)} className="text-xs sm:text-sm">
            <Send className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Compose</span>
          </Button>
          )}
        </div>
      </div>

      {/* Account Selector and Sync */}
      {accounts.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger className="w-full sm:w-64">
                    <SelectValue placeholder="Select email account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      .filter((account, index, self) => 
                        // Remove duplicates based on email address
                        index === self.findIndex((a) => a.email === account.email && a.connected)
                      )
                      .filter(account => account.connected) // Only show connected accounts
                      .map(account => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-xs text-blue-600">
                              {getProviderIcon(account.provider)}
                            </div>
                            <span className="text-xs sm:text-sm truncate">{account.email}</span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {accounts.find(a => a.id === selectedAccount)?.lastSync && (
                  <span className="text-xs text-muted-foreground hidden md:inline">
                    Last synced: {formatDate(accounts.find(a => a.id === selectedAccount)!.lastSync!)}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs">
                      <Settings className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Account Settings</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleEditAccount}>
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Account Settings
                    </DropdownMenuItem>
                    {canDelete('email', user.role) && (
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={handleDeleteAccount}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing} className="text-xs">
                  <RefreshCw className={`h-4 w-4 sm:mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Sync</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg text-foreground mb-2">No email accounts connected</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Connect your Gmail, Outlook, or Apple Mail account to manage emails within the CRM
            </p>
            
            <Alert className="mb-6 text-left">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Getting Started:</strong>
                <ul className="list-disc ml-4 mt-2 space-y-1">
                  <li><strong>IMAP/SMTP (Recommended):</strong> Connect directly using your email provider's server settings. Works immediately with no backend setup required.</li>
                  <li><strong>OAuth (Recommended):</strong> Connect via Google or Microsoft OAuth for seamless email integration.</li>
                </ul>
              </AlertDescription>
            </Alert>
            
            <Button onClick={() => setIsSettingsOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Email Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Folders Sidebar */}
          <div className={`lg:col-span-2 ${selectedEmail ? 'hidden lg:block' : ''}`}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Folders</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0"
                    onClick={() => setShowFoldersSidebar(!showFoldersSidebar)}
                  >
                    <Folders className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-2">
                <div className="space-y-1">
                  {/* System Folders */}
                  {folders.map((folder) => {
                    const Icon = folder.icon;
                    const isActive = currentFolder === folder.id || 
                      (currentFolder === 'important' && folder.id === 'important') ||
                      (currentFolder === 'flagged' && folder.id === 'flagged');
                    
                    return (
                      <button
                        key={folder.id}
                        onClick={() => {
                          if (folder.id === 'flagged' || folder.id === 'important') {
                            setCurrentFolder(folder.id as any);
                          } else {
                            setCurrentFolder(folder.id as Email['folder']);
                          }
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-foreground hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{folder.label}</span>
                        </div>
                        {folder.count > 0 && (
                          <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">
                            {folder.count}
                          </Badge>
                        )}
                      </button>
                    );
                  })}

                  {/* Custom Folders */}
                  {customFolders.length > 0 && (
                    <>
                      <div className="border-t pt-2 mt-2">
                        <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase">Custom</div>
                      </div>
                      {customFolders.map((folder) => {
                        const isActive = currentFolder === folder.id;
                        const folderCount = emails.filter(e => e.folder === folder.id && e.accountId === selectedAccount).length;
                        
                        return (
                          <div key={folder.id} className="flex items-center gap-1 group">
                            <button
                              onClick={() => setCurrentFolder(folder.id)}
                              className={`flex-1 flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                                isActive
                                  ? 'bg-blue-50 text-blue-700 font-medium'
                                  : 'text-foreground hover:bg-muted'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div 
                                  className="h-3 w-3 rounded-full" 
                                  style={{ backgroundColor: folder.color || '#3b82f6' }}
                                />
                                <span className="truncate">{folder.name}</span>
                              </div>
                              {folderCount > 0 && (
                                <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">
                                  {folderCount}
                                </Badge>
                              )}
                            </button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDeleteFolder(folder.id, folder.name)}
                            >
                              <Trash2 className="h-3 w-3 text-red-600" />
                            </Button>
                          </div>
                        );
                      })}
                    </>
                  )}

                  {/* Add Folder Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start px-3 py-2 text-sm text-muted-foreground hover:text-foreground mt-2"
                    onClick={() => setIsFolderDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Folder
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Email List */}
          <div className={`lg:col-span-4 ${selectedEmail ? 'hidden lg:block' : ''}`}>
            <Card>
              <CardHeader>
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search emails by subject, from, to, or content..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 text-sm"
                    />
                  </div>
                  {currentFolder === 'trash' && filteredEmails.length > 0 && canDelete('email', user.role) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      onClick={handleEmptyTrash}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Empty Trash ({filteredEmails.length})
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border max-h-[600px] lg:max-h-[600px] overflow-y-auto">
                  {filteredEmails.map((email) => (
                    <button
                      key={email.id}
                      onClick={() => {
                        setSelectedEmail(email);
                        if (!email.read) {
                          handleMarkAsRead(email.id, true);
                        }
                      }}
                      onContextMenu={(e) => handleContextMenu(e, email)}
                      className={`w-full text-left p-3 sm:p-4 hover:bg-muted transition-colors ${
                        selectedEmail?.id === email.id ? 'bg-blue-50' : ''
                      } ${!email.read ? 'bg-blue-50/30' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className={`text-xs sm:text-sm truncate flex-1 ${!email.read ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                          {email.folder === 'sent' ? `To: ${email.to}` : email.from}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {email.flagged && <Flag className="h-3 w-3 text-red-500 fill-red-500" />}
                          {email.starred && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                          {email.hasAttachments && <Paperclip className="h-3 w-3 text-muted-foreground" />}
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(email.date)}
                          </span>
                        </div>
                      </div>
                      <p className={`text-xs sm:text-sm mb-1 truncate ${!email.read ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                        {email.subject || '(No subject)'}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{getEmailPreview(email.body)}</p>
                      {email.linkedTo && (
                        <Badge variant="secondary" className="mt-2 text-xs">
                          <Link2 className="h-3 w-3 mr-1" />
                          <span className="truncate">{email.linkedTo}</span>
                        </Badge>
                      )}
                    </button>
                  ))}
                  {filteredEmails.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      <Mail className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm">No emails found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Email Detail */}
          <div className={`lg:col-span-6 ${!selectedEmail ? 'hidden lg:block' : ''}`}>
            {selectedEmail ? (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Back button for mobile */}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="lg:hidden mb-2 -ml-2"
                        onClick={() => setSelectedEmail(null)}
                      >
                        ← Back to list
                      </Button>
                      <h2 className="text-lg sm:text-xl text-foreground mb-2 break-words">{selectedEmail.subject}</h2>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                        <span className="truncate">From: {selectedEmail.from}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="truncate">To: {selectedEmail.to}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(selectedEmail.date).toLocaleString()}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleToggleStar(selectedEmail.id)}>
                          <Star className="h-4 w-4 mr-2" />
                          {selectedEmail.starred ? 'Unstar' : 'Star'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleArchive(selectedEmail.id)}>
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                        {canDelete('email', user.role) && (
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(selectedEmail.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                        )}
                        {canDelete('email', user.role) && (
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handlePermanentDelete(selectedEmail.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Permanently Delete
                        </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    {selectedEmail.body.includes('<') && selectedEmail.body.includes('>') ? (
                      // Render HTML emails in an iframe for isolation
                      <iframe
                        srcDoc={selectedEmail.body}
                        className="w-full min-h-[400px] border-0 bg-background"
                        sandbox="allow-same-origin"
                        title="Email content"
                      />
                    ) : (
                      // Render plain text emails
                      <p className="text-foreground whitespace-pre-wrap">{selectedEmail.body}</p>
                    )}
                  </div>
                  {selectedEmail.linkedTo && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-blue-900">
                        <Link2 className="h-4 w-4" />
                        <span>Linked to: {selectedEmail.linkedTo}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-6">
                    {canAdd('email', user.role) && (
                    <Button
                      onClick={() => {
                        setComposeEmail({
                          to: selectedEmail.from,
                          subject: `Re: ${selectedEmail.subject}`,
                          body: '',
                          linkTo: selectedEmail.linkedTo || '',
                        });
                        setIsComposeOpen(true);
                      }}
                      className="text-xs sm:text-sm"
                    >
                      <Send className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Reply</span>
                    </Button>
                    )}
                    <Button variant="outline" className="text-xs sm:text-sm">
                      <Send className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Forward</span>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="text-xs sm:text-sm">
                          <FolderOpen className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Move to Folder</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto">
                        <DropdownMenuItem onClick={() => handleMoveToFolder(selectedEmail.id, 'inbox')}>
                          <Inbox className="h-4 w-4 mr-2" />
                          Inbox
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleMoveToFolder(selectedEmail.id, 'archive')}>
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleMoveToFolder(selectedEmail.id, 'drafts')}>
                          <FileText className="h-4 w-4 mr-2" />
                          Drafts
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleMoveToFolder(selectedEmail.id, 'spam')}>
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Spam
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleMoveToFolder(selectedEmail.id, 'trash')}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Trash
                        </DropdownMenuItem>
                        {customFolders.length > 0 && (
                          <>
                            <div className="border-t my-1" />
                            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Custom Folders</div>
                            {customFolders.map((folder) => (
                              <DropdownMenuItem key={folder.id} onClick={() => handleMoveToFolder(selectedEmail.id, folder.id)}>
                                <div 
                                  className="h-3 w-3 rounded-full mr-2" 
                                  style={{ backgroundColor: folder.color || '#3b82f6' }}
                                />
                                {folder.name}
                              </DropdownMenuItem>
                            ))}
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button 
                      variant="outline" 
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs sm:text-sm"
                      onClick={() => {
                        if (selectedEmail.folder === 'trash') {
                          handlePermanentDelete(selectedEmail.id);
                        } else {
                          handleDelete(selectedEmail.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">
                        {selectedEmail.folder === 'trash' ? 'Delete Forever' : 'Delete'}
                      </span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-24 pb-24 text-center">
                  <Mail className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Select an email to view</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Compose Dialog */}
      <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-background">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Compose Email</DialogTitle>
            <DialogDescription className="text-sm">
              Send a new email from your connected account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="to" className="text-sm">To</Label>
              <Input
                id="to"
                value={composeEmail.to}
                onChange={(e) => setComposeEmail({ ...composeEmail, to: e.target.value })}
                placeholder="recipient@example.com"
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-sm">Subject</Label>
              <Input
                id="subject"
                value={composeEmail.subject}
                onChange={(e) => setComposeEmail({ ...composeEmail, subject: e.target.value })}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body" className="text-sm">Message</Label>
              <Textarea
                id="body"
                value={composeEmail.body}
                onChange={(e) => setComposeEmail({ ...composeEmail, body: e.target.value })}
                rows={6}
                className="text-sm min-h-[120px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkTo" className="text-sm">Link to CRM Record (optional)</Label>
              <Input
                id="linkTo"
                value={composeEmail.linkTo}
                onChange={(e) => setComposeEmail({ ...composeEmail, linkTo: e.target.value })}
                placeholder="e.g., Contact: John Smith"
                className="text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="text-xs">
                <Paperclip className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Attach File</span>
              </Button>
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSendEmail} className="flex-1 text-sm">
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
              <Button variant="outline" onClick={() => setIsComposeOpen(false)} className="text-sm">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Account Setup Dialog */}
      <EmailAccountSetup
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          setEditingAccount(null);
        }}
        onAccountAdded={handleAccountAdded}
        editingAccount={editingAccount}
      />

      {/* Create Folder Dialog */}
      <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-background">
          <DialogHeader>
            <DialogTitle>Create Custom Folder</DialogTitle>
            <DialogDescription>
              Create a new folder to organize your emails
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="folderName">Folder Name</Label>
              <Input
                id="folderName"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g., Clients, Projects, Personal"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateFolder();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="folderColor">Folder Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="folderColor"
                  type="color"
                  value={newFolderColor}
                  onChange={(e) => setNewFolderColor(e.target.value)}
                  className="h-10 w-20"
                />
                <span className="text-sm text-muted-foreground">Choose a color to identify this folder</span>
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleCreateFolder} className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                Create Folder
              </Button>
              <Button variant="outline" onClick={() => {
                setIsFolderDialogOpen(false);
                setNewFolderName('');
                setNewFolderColor('#3b82f6');
              }}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-background border border-border rounded-lg shadow-lg py-1 z-50 min-w-[200px]"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center gap-2"
            onClick={() => {
              handleMarkAsRead(contextMenu.email.id, !contextMenu.email.read);
              setContextMenu(null);
            }}
          >
            {contextMenu.email.read ? (
              <>
                <Mail className="h-4 w-4" />
                Mark as Unread
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Mark as Read
              </>
            )}
          </button>
          
          <button
            className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center gap-2"
            onClick={() => {
              handleToggleStar(contextMenu.email.id);
              setContextMenu(null);
            }}
          >
            <Star className="h-4 w-4" />
            {contextMenu.email.starred ? 'Unstar' : 'Star'}
          </button>

          <button
            className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center gap-2"
            onClick={() => {
              handleToggleFlag(contextMenu.email.id);
              setContextMenu(null);
            }}
          >
            <Flag className="h-4 w-4" />
            {contextMenu.email.flagged ? 'Remove Flag' : 'Flag'}
          </button>

          <div className="border-t border-border my-1" />

          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Move to</div>
          
          <button
            className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center gap-2"
            onClick={() => {
              handleMoveToFolder(contextMenu.email.id, 'inbox');
              setContextMenu(null);
            }}
          >
            <Inbox className="h-4 w-4" />
            Inbox
          </button>

          <button
            className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center gap-2"
            onClick={() => {
              handleMoveToFolder(contextMenu.email.id, 'archive');
              setContextMenu(null);
            }}
          >
            <Archive className="h-4 w-4" />
            Archive
          </button>

          <button
            className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center gap-2"
            onClick={() => {
              handleMoveToFolder(contextMenu.email.id, 'drafts');
              setContextMenu(null);
            }}
          >
            <FileText className="h-4 w-4" />
            Drafts
          </button>

          <button
            className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center gap-2"
            onClick={() => {
              handleMoveToFolder(contextMenu.email.id, 'spam');
              setContextMenu(null);
            }}
          >
            <AlertCircle className="h-4 w-4" />
            Spam
          </button>

          <button
            className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center gap-2"
            onClick={() => {
              handleMoveToFolder(contextMenu.email.id, 'trash');
              setContextMenu(null);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Trash
          </button>

          {/* Custom Folders in Context Menu */}
          {customFolders.length > 0 && (
            <>
              <div className="border-t border-border my-1" />
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Custom Folders</div>
              {customFolders.map((folder) => (
                <button
                  key={folder.id}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center gap-2"
                  onClick={() => {
                    handleMoveToFolder(contextMenu.email.id, folder.id);
                    setContextMenu(null);
                  }}
                >
                  <div 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: folder.color || '#3b82f6' }}
                  />
                  {folder.name}
                </button>
              ))}
            </>
          )}

          <div className="border-t border-border my-1" />

          <button
            className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
            onClick={() => {
              if (contextMenu.email.folder === 'trash') {
                handlePermanentDelete(contextMenu.email.id);
              } else {
                handleDelete(contextMenu.email.id);
              }
              setContextMenu(null);
            }}
          >
            <Trash2 className="h-4 w-4" />
            {contextMenu.email.folder === 'trash' ? 'Delete Permanently' : 'Delete'}
          </button>
        </div>
      )}
    </div>
    </PermissionGate>
  );
}