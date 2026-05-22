import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  MessageSquare,
  Lock,
  Send,
  Loader2,
  RefreshCw,
  Users,
  CheckCircle2,
  Plus,
  FileText,
  Search,
  Smile,
  ChevronLeft,
  Paperclip,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '../utils/supabase/client';
import { playNotificationSound } from '../utils/notifications';
import {
  addPortalInternalNote,
  createInternalChat,
  getCrmPortalMessages,
  getInternalChats,
  getPortalUsers,
  replyToPortalMessage,
  uploadPortalAttachment,
  sendInternalChatMessage,
  updatePortalThreadStatus,
} from '../utils/portal-client';
import { tasksAPI, usersAPI } from '../utils/api';
import type { User as CrmUser } from '../App';
import { MessagingModuleHelp } from './MessagingModuleHelp';

interface MessagingHubProps {
  user: CrmUser;
}

export function MessagingHub({ user }: MessagingHubProps) {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [portalUsers, setPortalUsers] = useState<any[]>([]);
  const [staffUsers, setStaffUsers] = useState<any[]>([]);
  const [internalChats, setInternalChats] = useState<any[]>([]);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedConversationType, setSelectedConversationType] = useState<'customer' | 'internal'>('internal');
  // Refs that always hold the LATEST values so loadData and the polling interval
  // (which has a stale closure due to empty deps []) can read them correctly.
  const selectedMessageIdRef = useRef<string | null>(null);
  const selectedChatIdRef = useRef<string | null>(null);
  const selectedConversationTypeRef = useRef<'customer' | 'internal'>('internal');
  selectedMessageIdRef.current = selectedMessageId;
  selectedChatIdRef.current = selectedChatId;
  selectedConversationTypeRef.current = selectedConversationType;
  // Stable ref so the polling interval always invokes the freshest loadData.
  const loadDataRef = useRef<() => Promise<void>>(async () => {});
  // Track previous messages to detect new arrivals
  const prevMessagesRef = useRef<any[]>([]);
  const prevChatsRef = useRef<any[]>([]);
  const notifiedMessageIdsRef = useRef<Set<string>>(new Set());
  const notifiedChatIdsRef = useRef<Set<string>>(new Set());
  const [replyText, setReplyText] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<any[]>([]);
  const [internalNoteText, setInternalNoteText] = useState('');
  const [internalChatMessage, setInternalChatMessage] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [chatSearch, setChatSearch] = useState('');
  const [newChatTitle, setNewChatTitle] = useState('');
  const [newChatMessage, setNewChatMessage] = useState('');
  const [newChatMembers, setNewChatMembers] = useState<string[]>([]);
  const [pendingDirectTarget, setPendingDirectTarget] = useState<any>(null);
  const [pendingMessage, setPendingMessage] = useState('');
  const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar');
  const [showOnlySlaAlerts, setShowOnlySlaAlerts] = useState(false);

  const selectedMessage = useMemo(
    () => messages.find((message) => message.id === selectedMessageId) || null,
    [messages, selectedMessageId]
  );

  const selectedChat = useMemo(
    () => internalChats.find((chat) => chat.id === selectedChatId) || null,
    [internalChats, selectedChatId]
  );

  const getAccessToken = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');
    return session.access_token;
  };

  const syncCurrentUserPresence = async () => {
    try {
      const supabase = createClient();
      const { data: { user: sessionUser } } = await supabase.auth.getUser();
      if (!sessionUser?.id) return;

      await (supabase as any)
        .from('profiles')
        .update({
          last_login: new Date().toISOString(),
          status: 'active',
        })
        .eq('id', sessionUser.id);
    } catch {
      // Presence sync is best-effort only
    }
  };

  // Helper to show browser notification if available and page not focused
  const showBrowserNotification = (title: string, options?: NotificationOptions) => {
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/favicon.ico',
        ...options,
      });
    }
  };

  const loadData = async (
    currentSelectedMessageId: string | null = selectedMessageIdRef.current,
    currentSelectedChatId: string | null = selectedChatIdRef.current,
  ) => {
    setLoading(true);
    try {
      const accessToken = await getAccessToken();
      const [messagesData, usersData, internalData, staffData] = await Promise.all([
        getCrmPortalMessages(accessToken).catch(() => ({ messages: [] })),
        getPortalUsers(accessToken).catch(() => ({ portalUsers: [] })),
        getInternalChats(accessToken).catch(() => ({ chats: [] })),
        usersAPI.getAll().catch(() => []),
      ]);

      const nextMessages = messagesData.messages || [];
      const nextUsers = usersData.portalUsers || [];
      const nextChats = internalData.chats || [];
      const nextStaff = Array.isArray((staffData as any)?.users)
        ? (staffData as any).users
        : Array.isArray(staffData)
          ? staffData
          : [];
      const selectedMessageExistsInNext = currentSelectedMessageId
        ? nextMessages.some((message: any) => message.id === currentSelectedMessageId)
        : false;
      const preservedSelectedMessage =
        currentSelectedMessageId && !selectedMessageExistsInNext
          ? messages.find((message: any) => message.id === currentSelectedMessageId) ?? null
          : null;

      setMessages(
        preservedSelectedMessage
          ? [
              preservedSelectedMessage,
              ...nextMessages.filter((message: any) => message.id !== currentSelectedMessageId),
            ]
          : nextMessages
      );
      setPortalUsers(nextUsers);
      setStaffUsers(nextStaff);
      // Use updater form so we can preserve any optimistically-added chat (e.g., just created)
      // that hasn't appeared in the API response yet.
      setInternalChats((prevChats) => {
        const mergedChats = nextChats.map((nextChat: any) => {
          const prevChat = prevChats.find((chat: any) => chat.id === nextChat.id);
          if (!prevChat) return nextChat;

          const prevMessages = Array.isArray(prevChat.messages) ? prevChat.messages : [];
          const nextMessages = Array.isArray(nextChat.messages) ? nextChat.messages : [];

          // If the server response is briefly stale after a send, keep the richer local thread.
          if (currentSelectedChatId === nextChat.id && prevMessages.length > nextMessages.length) {
            return {
              ...nextChat,
              messages: prevMessages,
              updatedAt: prevChat.updatedAt || nextChat.updatedAt,
            };
          }

          return nextChat;
        });

        const preserved =
          currentSelectedChatId && !nextChats.some((c: any) => c.id === currentSelectedChatId)
            ? prevChats.find((c: any) => c.id === currentSelectedChatId) ?? null
            : null;
        return preserved ? [preserved, ...mergedChats] : mergedChats;
      });

      if (!currentSelectedMessageId && nextMessages.length > 0) {
        setSelectedMessageId(nextMessages[0].id);
      } else if (currentSelectedMessageId && !selectedMessageExistsInNext && !preservedSelectedMessage) {
        setSelectedMessageId(nextMessages[0]?.id || null);
      }

      // Only auto-select an internal chat if the user is not already viewing a customer thread.
      // This prevents a customer reply from flipping the view to internal chats.
      if (!currentSelectedChatId && !currentSelectedMessageId && nextChats.length > 0) {
        setSelectedChatId(nextChats[0].id);
        setSelectedConversationType('internal');
      }
      // If the selected chat isn't in the API response, the updater above preserves it
      // so we intentionally skip the old reset-to-null logic here.

      if (nextChats.length === 0 && nextMessages.length > 0) {
        setSelectedConversationType('customer');
      }

      // ── Notification Logic ──
      // Check for new customer messages
      let shouldPlaySound = false;
      const newMessages = nextMessages.filter(
        (msg: any) => !prevMessagesRef.current.find((p: any) => p.id === msg.id)
      );

      newMessages.forEach((msg: any) => {
        if (!notifiedMessageIdsRef.current.has(msg.id)) {
          const contactName = msg.contactName || msg.senderEmail || 'Customer';
          const subject = msg.subject || msg.body?.substring(0, 50) || '(no subject)';
          const notificationText = `📩 New message from ${contactName}`;
          
          toast.info(`${notificationText}: "${subject}"`, {
            duration: 5000,
          });
          shouldPlaySound = true;
          showBrowserNotification(notificationText, {
            body: subject,
            tag: `message-${msg.id}`,
          });
          notifiedMessageIdsRef.current.add(msg.id);
        }
      });

      // Check for new replies on existing messages
      nextMessages.forEach((msg: any) => {
        const prevMsg = prevMessagesRef.current.find((p: any) => p.id === msg.id);
        if (prevMsg && msg.replies?.length > (prevMsg.replies?.length || 0)) {
          const newReplyCount = msg.replies.length - (prevMsg.replies?.length || 0);
          if (!notifiedMessageIdsRef.current.has(`reply-${msg.id}`)) {
            const contactName = msg.contactName || msg.senderEmail || 'Customer';
            const notificationText = `💬 ${newReplyCount} new ${newReplyCount === 1 ? 'reply' : 'replies'} from ${contactName}`;
            
            toast.info(notificationText, { duration: 4000 });
            shouldPlaySound = true;
            showBrowserNotification('New Message Reply', {
              body: notificationText,
              tag: `reply-${msg.id}`,
            });
            notifiedMessageIdsRef.current.add(`reply-${msg.id}`);
          }
        }
      });

      // Check for new internal chat messages
      const newChats = nextChats.filter(
        (chat: any) => !prevChatsRef.current.find((p: any) => p.id === chat.id)
      );

      newChats.forEach((chat: any) => {
        if (!notifiedChatIdsRef.current.has(chat.id)) {
          const notificationText = `💭 New chat: ${chat.title}`;
          
          toast.info(notificationText, { duration: 4000 });
          shouldPlaySound = true;
          showBrowserNotification('New Chat', {
            body: chat.title,
            tag: `chat-${chat.id}`,
          });
          notifiedChatIdsRef.current.add(chat.id);
        }
      });

      // Check for new messages in existing chats
      nextChats.forEach((chat: any) => {
        const prevChat = prevChatsRef.current.find((p: any) => p.id === chat.id);
        if (prevChat && chat.messages?.length > (prevChat.messages?.length || 0)) {
          const newMsgCount = chat.messages.length - (prevChat.messages?.length || 0);
          if (!notifiedChatIdsRef.current.has(`msg-${chat.id}`)) {
            const lastMessage = chat.messages[chat.messages.length - 1];
            const senderName = lastMessage?.senderName || 'Team member';
            const notificationText = `💬 ${newMsgCount} new ${newMsgCount === 1 ? 'message' : 'messages'} in ${chat.title}`;
            
            toast.info(`${notificationText} from ${senderName}`, { duration: 4000 });
            shouldPlaySound = true;
            showBrowserNotification(chat.title, {
              body: `${senderName}: ${lastMessage?.body?.substring(0, 50) || '(no message)'}`,
              tag: `msg-${chat.id}`,
            });
            notifiedChatIdsRef.current.add(`msg-${chat.id}`);
          }
        }
      });

      if (shouldPlaySound) {
        void playNotificationSound();
      }

      // Update refs for next cycle
      prevMessagesRef.current = nextMessages;
      prevChatsRef.current = nextChats;
    } catch (err: any) {
      toast.error(err.message || 'Failed to load messaging hub');
    } finally {
      setLoading(false);
    }
  };

  // Keep loadDataRef pointing to the latest loadData on every render
  // so the polling interval (with empty deps) never calls a stale copy.
  loadDataRef.current = loadData;

  useEffect(() => {
    const refreshPresence = async () => {
      await syncCurrentUserPresence();
      await loadDataRef.current();
    };

    refreshPresence();
    const interval = window.setInterval(refreshPresence, 30000);

    // Request notification permission for browser notifications
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => window.clearInterval(interval);
  }, []);

  const formatDate = (date?: string) => {
    if (!date) return '';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatTimeAgo = (date?: string) => {
    if (!date) return '';
    const then = new Date(date).getTime();
    const now = Date.now();
    const mins = Math.floor((now - then) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const isRecentlyActive = (date?: string, minutes = 15) => {
    if (!date) return false;
    const timestamp = new Date(date).getTime();
    if (Number.isNaN(timestamp)) return false;
    return Date.now() - timestamp <= minutes * 60 * 1000;
  };

  const formatMinutesAsWait = (totalMinutes: number) => {
    if (totalMinutes < 60) return `${totalMinutes}m waiting`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours < 24) return minutes > 0 ? `${hours}h ${minutes}m waiting` : `${hours}h waiting`;
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return remHours > 0 ? `${days}d ${remHours}h waiting` : `${days}d waiting`;
  };

  const getCustomerSlaState = (message: any) => {
    if (!message || message.status === 'resolved') {
      return { waitingForTeam: false, level: 'none', minutes: 0, label: '' as string };
    }

    const timeline = [
      { from: message.from, createdAt: message.createdAt },
      ...((message.replies || []).map((reply: any) => ({ from: reply.from, createdAt: reply.createdAt }))),
    ]
      .filter((item: any) => !!item.createdAt)
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (timeline.length === 0) {
      return { waitingForTeam: false, level: 'none', minutes: 0, label: '' as string };
    }

    const latest = timeline[timeline.length - 1];
    const waitingForTeam = latest.from === 'customer';
    if (!waitingForTeam) {
      return { waitingForTeam: false, level: 'none', minutes: 0, label: '' as string };
    }

    const lastCustomerTimestamp = new Date(latest.createdAt).getTime();
    if (Number.isNaN(lastCustomerTimestamp)) {
      return { waitingForTeam: false, level: 'none', minutes: 0, label: '' as string };
    }

    const waitingMinutes = Math.max(0, Math.floor((Date.now() - lastCustomerTimestamp) / 60000));
    const level = waitingMinutes >= 240 ? 'critical' : waitingMinutes >= 60 ? 'warning' : 'normal';

    return {
      waitingForTeam: true,
      level,
      minutes: waitingMinutes,
      label: formatMinutesAsWait(waitingMinutes),
    };
  };

  const getAvatarFallback = (name?: string, email?: string) => {
    const source = (name || email || 'User').trim();
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  };

  const getTargetKey = (target: any) => `${target.kind}:${target.id || target.email || target.name}`;

  const getDirectStaffContextLabel = (targetUserId: string) => {
    return `direct:staff:${[user.id, targetUserId].sort().join('|')}`;
  };

  const isMatchingDirectTarget = (chat: any, target: any) => {
    const contextType = String(chat?.contextType || '');
    const contextLabel = String(chat?.contextLabel || '');
    const participants = Array.isArray(chat?.participants) ? chat.participants : [];
    const targetKey = getTargetKey(target);

    if (!contextType.startsWith('direct')) return false;

    // Primary match path: canonical direct context labels.
    if (contextLabel === targetKey) return true;

    // Legacy direct staff chats used a normalized user-pair context label.
    if (target.kind === 'staff' && target.id) {
      if (contextLabel === getDirectStaffContextLabel(target.id)) return true;
    }

    // Fallback: match on participant identity, never on display name.
    const hasCurrentUser = participants.some((participant: any) => participant?.id === user.id);
    if (!hasCurrentUser) return false;

    const hasTargetId = target.id
      ? participants.some((participant: any) => participant?.id === target.id)
      : false;

    const hasTargetEmail = target.email
      ? participants.some((participant: any) => participant?.email === target.email)
      : false;

    return hasTargetId || hasTargetEmail;
  };

  const getInternalChatTitle = (chat: any) => {
    if (!chat) return 'Chat';
    const isDirectChat = (chat.chatType === 'direct') || (chat.contextType || '').startsWith('direct');
    if (!isDirectChat) return chat.title || 'Team chat';

    const participants = Array.isArray(chat.participants) ? chat.participants : [];
    const counterpart = participants.find((participant: any) => {
      if (!participant) return false;
      if (participant.id && participant.id !== user.id) return true;
      if (participant.email && user.email && participant.email !== user.email) return true;
      return false;
    });

    return counterpart?.name || counterpart?.email || chat.title || 'Direct message';
  };

  const handleSendReply = async () => {
    if (!selectedMessage || (!replyText.trim() && replyAttachments.length === 0)) return;
    setSending(true);
    try {
      const accessToken = await getAccessToken();
      await replyToPortalMessage(selectedMessage.id, selectedMessage.contactId, replyText.trim(), accessToken, replyAttachments);
      toast.success('Customer reply sent');
      setReplyText('');
      setReplyAttachments([]);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleReplyAttachmentPick = async (file: File | null) => {
    if (!file || !selectedMessage) return;
    try {
      setSending(true);
      const accessToken = await getAccessToken();
      const result = await uploadPortalAttachment(file, { contactId: selectedMessage.contactId }, accessToken);
      if (result?.attachment) {
        setReplyAttachments((prev) => [...prev, result.attachment]);
        toast.success('Attachment added');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload attachment');
    } finally {
      setSending(false);
    }
  };

  const handleAddInternalNote = async () => {
    if (!selectedMessage || !internalNoteText.trim()) return;
    setSending(true);
    try {
      const accessToken = await getAccessToken();
      await addPortalInternalNote(selectedMessage.id, selectedMessage.contactId, internalNoteText.trim(), accessToken);
      toast.success('Internal note added');
      setInternalNoteText('');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save internal note');
    } finally {
      setSending(false);
    }
  };

  const handleToggleResolved = async () => {
    if (!selectedMessage) return;
    setSending(true);
    try {
      const accessToken = await getAccessToken();
      const nextStatus = selectedMessage.status === 'resolved' ? 'open' : 'resolved';
      await updatePortalThreadStatus(selectedMessage.id, selectedMessage.contactId, nextStatus, accessToken);
      toast.success(nextStatus === 'resolved' ? 'Conversation marked resolved' : 'Conversation reopened');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update conversation status');
    } finally {
      setSending(false);
    }
  };

  const handleCreateFollowUpTask = async () => {
    if (!selectedMessage) return;
    try {
      await tasksAPI.create({
        title: `Follow up: ${selectedMessage.subject}`,
        description: `Customer conversation follow-up for ${selectedMessage.contactName || selectedMessage.contactEmail || 'customer'}\n\n${selectedMessage.body}`,
        status: 'pending',
        priority: 'medium',
        assigned_to: user.id,
      });
      toast.success('Follow-up task created');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create task');
    }
  };

  const handleCreateEscalationTask = async () => {
    if (!selectedMessage || !selectedCustomerSla?.waitingForTeam) return;

    const customerLabel = selectedMessage.contactName || selectedMessage.contactEmail || 'customer';
    const dueAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const managerFallback = staffUsers.find((staff: any) => {
      const role = String(staff?.role || '').toLowerCase();
      return staff?.id && staff.id !== user.id && ['manager', 'director', 'admin', 'super_admin'].includes(role);
    });
    const assigneeId = selectedCustomerSla.level === 'critical'
      ? (managerFallback?.id || user.id)
      : user.id;
    const assignmentNote = assigneeId === user.id
      ? 'Assigned to current user.'
      : `Assigned to escalation owner: ${managerFallback?.name || managerFallback?.email || 'manager'}.`;

    try {
      await tasksAPI.create({
        title: `SLA escalation: ${selectedMessage.subject || 'Customer conversation'}`,
        description: `Customer ${customerLabel} is waiting for a response (${selectedCustomerSla.label}).\n${assignmentNote}\n\nSubject: ${selectedMessage.subject || 'No subject'}\nMessage: ${selectedMessage.body || ''}`,
        status: 'pending',
        priority: selectedCustomerSla.level === 'critical' ? 'high' : 'medium',
        assigned_to: assigneeId,
        due_date: dueAt,
      });
      toast.success('Escalation task created');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create escalation task');
    }
  };

  const handleCreateInternalChat = async () => {
    const selectedMembers = [...staffUsers, ...activePortalUsers]
      .map((member: any) => {
        const isPortal = activePortalUsers.some((portalUser: any) => (portalUser.contactId || portalUser.email) === (member.contactId || member.email));
        return {
          id: member.contactId || member.id || member.email,
          name: member.name || member.email || 'Member',
          email: member.email || '',
          kind: (isPortal ? 'portal' : 'staff') as 'portal' | 'staff',
        };
      })
      .filter((member: any) => newChatMembers.includes(`${member.kind}:${member.id}`));

    const derivedChatType = selectedMembers.length > 1 ? 'group' : selectedMembers.length === 1 ? 'direct' : 'general';
    const derivedTitle = newChatTitle.trim()
      || (derivedChatType === 'direct'
        ? selectedMembers[0]?.name
        : derivedChatType === 'group'
          ? `${selectedMembers[0]?.name || 'Group'} + ${selectedMembers.length - 1}`
          : 'New Team Chat');

    if (!derivedTitle) {
      toast.error('Please enter a chat title or choose a person');
      return;
    }

    const derivedContextType = derivedChatType === 'group'
      ? 'group'
      : derivedChatType === 'direct'
        ? `direct-${selectedMembers[0]?.kind || 'staff'}`
        : 'general';

    const derivedContextLabel = derivedChatType === 'group'
      ? selectedMembers.map((member: any) => member.name).join(', ')
      : derivedChatType === 'direct'
        ? `${selectedMembers[0]?.kind || 'staff'}:${selectedMembers[0]?.id || selectedMembers[0]?.email || derivedTitle}`
        : '';

    setSending(true);
    try {
      const accessToken = await getAccessToken();
      const result = await createInternalChat(
        {
          title: derivedTitle,
          contextType: derivedContextType,
          contextLabel: derivedContextLabel,
          initialMessage: newChatMessage.trim(),
          chatType: derivedChatType,
          participants: selectedMembers,
        },
        accessToken
      );
      toast.success(derivedChatType === 'group' ? 'Saved group created' : 'Chat created');
      setShowNewChat(false);
      setNewChatTitle('');
      setNewChatMessage('');
      setNewChatMembers([]);
      await loadData();
      if (result?.chat?.id) {
        setSelectedChatId(result.chat.id);
        setSelectedConversationType('internal');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create internal chat');
    } finally {
      setSending(false);
    }
  };

  const handleStartDirectChat = (target: any) => {
    if (target.kind === 'portal') {
      const existingCustomerConversation = messages.find((message: any) => (
        (target.id && message.contactId && message.contactId === target.id)
        || (target.email && (message.contactEmail === target.email || message.senderEmail === target.email))
      ));

      if (existingCustomerConversation?.id) {
        setSelectedMessageId(existingCustomerConversation.id);
        setSelectedConversationType('customer');
        setPendingDirectTarget(null);
        toast.info('Opened customer conversation. Use this thread to message portal users.');
      } else {
        toast.error('Portal users receive messages through customer conversations. Ask them to message first or invite portal access.');
      }
      return;
    }

    const existingChat = internalChats.find((chat: any) => isMatchingDirectTarget(chat, target));

    if (existingChat?.id) {
      setSelectedChatId(existingChat.id);
      setSelectedConversationType('internal');
      setPendingDirectTarget(null);
      return;
    }

    // Show compose area instantly — no API call until first message is sent
    setSelectedConversationType('internal');
    setPendingDirectTarget(target);
    setPendingMessage('');
    setSelectedChatId(null);
    setSelectedMessageId(null);
  };

  const handleSendToPendingTarget = async () => {
    if (!pendingDirectTarget || !pendingMessage.trim()) return;
    const target = pendingDirectTarget;
    const firstMessage = pendingMessage.trim();
    const nowIso = new Date().toISOString();
    const tempChatId = `temp-chat-${Date.now()}`;
    const tempMessageId = `temp-msg-${Date.now()}`;

    const optimisticChat = {
      id: tempChatId,
      title: target.name,
      contextType: `direct-${target.kind}`,
      contextLabel: target.kind === 'staff' && target.id ? getDirectStaffContextLabel(target.id) : getTargetKey(target),
      chatType: 'direct',
      participants: [
        { id: user.id, name: (user as any).name || (user as any).email || 'You', email: (user as any).email || '', kind: 'staff' },
        { id: target.id, name: target.name, email: target.email, kind: target.kind },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
      messages: [{
        id: tempMessageId,
        senderId: user.id,
        senderName: (user as any).name || (user as any).email || 'You',
        body: firstMessage,
        createdAt: nowIso,
      }],
    };

    // Render the new direct thread instantly so the first message bubble is visible.
    setInternalChats((prevChats) => [optimisticChat, ...prevChats]);
    setSelectedChatId(tempChatId);
    setSelectedConversationType('internal');
    setPendingDirectTarget(null);
    setPendingMessage('');

    setSending(true);
    try {
      const accessToken = await getAccessToken();
      const result = await createInternalChat(
        {
          title: target.name,
          contextType: `direct-${target.kind}`,
          contextLabel: target.kind === 'staff' && target.id ? getDirectStaffContextLabel(target.id) : getTargetKey(target),
          chatType: 'direct',
          participants: [
            { id: user.id, name: (user as any).name || (user as any).email || 'You', email: (user as any).email || '', kind: 'staff' },
            { id: target.id, name: target.name, email: target.email, kind: target.kind },
          ],
          initialMessage: firstMessage,
        },
        accessToken
      );

      if (result?.chat?.id) {
        setInternalChats((prevChats) =>
          prevChats.map((chat) => (chat.id === tempChatId ? result.chat : chat))
        );
        setSelectedChatId(result.chat.id);
        setSelectedConversationType('internal');
      } else {
        await loadData(undefined, tempChatId);
      }
    } catch (err: any) {
      setInternalChats((prevChats) => prevChats.filter((chat) => chat.id !== tempChatId));
      setSelectedChatId(null);
      setPendingDirectTarget(target);
      setPendingMessage(firstMessage);
      toast.error(err.message || 'Failed to start chat');
    } finally {
      setSending(false);
    }
  };

  const handleSendInternalChatMessage = async () => {
    if (!selectedChat || !internalChatMessage.trim()) return;

    if ((selectedChat.contextType || '').startsWith('direct-portal')) {
      toast.error('Portal users do not receive internal chats. Use the customer conversation thread instead.');
      return;
    }

    const messageText = internalChatMessage.trim();
    const tempMessageId = `temp-msg-${Date.now()}`;
    const nowIso = new Date().toISOString();

    // Optimistic append so send feels instant even if API round-trip is slow.
    setInternalChatMessage('');
    setInternalChats((prevChats) =>
      prevChats.map((chat) => {
        if (chat.id !== selectedChat.id) return chat;
        const existing = Array.isArray(chat.messages) ? chat.messages : [];
        return {
          ...chat,
          updatedAt: nowIso,
          messages: [
            ...existing,
            {
              id: tempMessageId,
              senderId: user.id,
              senderName: (user as any).name || (user as any).email || 'You',
              body: messageText,
              createdAt: nowIso,
            },
          ],
        };
      })
    );

    setSending(true);
    try {
      const accessToken = await getAccessToken();
      const result = await sendInternalChatMessage(selectedChat.id, messageText, accessToken);
      toast.success('Internal message sent');
      
      if (result.chat) {
        setInternalChats((prevChats) =>
          prevChats.map((chat) => (chat.id === selectedChat.id ? result.chat : chat))
        );
      }
    } catch (err: any) {
      setInternalChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat.id !== selectedChat.id) return chat;
          return {
            ...chat,
            messages: (chat.messages || []).filter((message: any) => message.id !== tempMessageId),
          };
        })
      );
      setInternalChatMessage(messageText);
      toast.error(err.message || 'Failed to send internal chat message');
    } finally {
      setSending(false);
    }
  };

  const customerTimeline = selectedMessage
    ? [
        {
          from: selectedMessage.from,
          body: selectedMessage.body,
          attachments: selectedMessage.attachments || [],
          createdAt: selectedMessage.createdAt,
          senderName: selectedMessage.contactName || selectedMessage.senderEmail || 'Customer',
        },
        ...(selectedMessage.replies || []),
      ]
    : [];

  const unreadCustomerCount = messages.filter((message) => !message.read || message.customerUnread).length;
  const unreadInternalCount = internalChats.filter((chat: any) => {
    const lastMessage = Array.isArray(chat.messages) && chat.messages.length > 0
      ? chat.messages[chat.messages.length - 1]
      : null;
    if (!lastMessage) return false;
    // Heuristic: if the latest message was sent by someone else, surface as unread.
    return !!lastMessage.senderId && lastMessage.senderId !== user.id;
  }).length;
  const unreadTotalCount = unreadCustomerCount + unreadInternalCount;
  const activePortalUsers = portalUsers.filter((portalUser: any) => portalUser.enabled !== false);
  const onlineStaffUsers = staffUsers.filter((staff: any) => {
    if (!staff?.id) return false;
    const lastSeen = staff.last_login || staff.lastLogin;
    if (staff.id === user.id) return true;
    return isRecentlyActive(lastSeen, 30);
  });
  const onlinePortalNow = activePortalUsers.filter((portalUser: any) =>
    portalUser.online || isRecentlyActive(portalUser.lastActiveAt || portalUser.lastLogin, 30)
  );
  const selectedPortalUser = selectedMessage
    ? activePortalUsers.find((portalUser: any) => {
        return (
          (portalUser.contactId && portalUser.contactId === selectedMessage.contactId) ||
          (portalUser.email && portalUser.email === (selectedMessage.contactEmail || selectedMessage.senderEmail))
        );
      })
    : null;

  const effectiveSelectedConversationType =
    selectedConversationType === 'customer'
      ? (selectedMessage ? 'customer' : selectedChat ? 'internal' : 'customer')
      : (selectedChat ? 'internal' : selectedMessage ? 'customer' : 'internal');

  const selectedConversation = effectiveSelectedConversationType === 'customer' ? selectedMessage : selectedChat;

  const customerSlaById = useMemo(() => {
    const byId: Record<string, any> = {};
    messages.forEach((message: any) => {
      byId[message.id] = getCustomerSlaState(message);
    });
    return byId;
  }, [messages]);

  const escalatedCustomerCount = useMemo(() => {
    return messages.filter((message: any) => {
      const state = customerSlaById[message.id];
      return state?.waitingForTeam && (state?.level === 'warning' || state?.level === 'critical');
    }).length;
  }, [messages, customerSlaById]);

  const selectedCustomerSla = selectedMessage ? customerSlaById[selectedMessage.id] : null;

  const chatTargets = useMemo(() => {
    const staffTargets = staffUsers
      .filter((staff: any) => staff?.id && staff.id !== user.id)
      .map((staff: any) => ({
        id: staff.id,
        name: staff.name || staff.email || 'Staff',
        email: staff.email || '',
        subtitle: staff.role ? `${staff.role.replace(/_/g, ' ')}` : 'CRM Staff',
        kind: 'staff' as const,
        avatar_url: staff.avatar_url,
        online: isRecentlyActive(staff.last_login || staff.lastLogin, 30),
      }));

    const allTargets = [...staffTargets];
    const query = chatSearch.trim().toLowerCase();

    return allTargets.filter((target) => {
      if (!query) return true;
      return `${target.name} ${target.email} ${target.subtitle}`.toLowerCase().includes(query);
    }).sort((a, b) => {
      if (a.online !== b.online) return a.online ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [staffUsers, chatSearch, user.id]);

  const filteredInternalChats = useMemo(() => {
    const query = chatSearch.trim().toLowerCase();
    if (!query) return internalChats;
    return internalChats.filter((chat: any) => {
      return `${chat.title} ${chat.contextLabel || ''} ${chat.chatType || ''}`.toLowerCase().includes(query);
    });
  }, [internalChats, chatSearch]);

  const unifiedChats = useMemo(() => {
    const customerItems = messages.map((message: any) => {
      const latestReply = message.replies?.length ? message.replies[message.replies.length - 1] : null;
      const slaState = customerSlaById[message.id] || { waitingForTeam: false, level: 'none', label: '' };
      const portalUser = activePortalUsers.find((portal: any) => {
        return (
          (portal.contactId && portal.contactId === message.contactId) ||
          (portal.email && portal.email === (message.contactEmail || message.senderEmail))
        );
      });

      return {
        kind: 'customer' as const,
        id: message.id,
        title: message.contactName || message.contactEmail || 'Customer',
        subtitle: message.subject || 'Customer chat',
        preview: latestReply ? `${latestReply.senderName || 'Team'}: ${latestReply.body}` : message.body,
        updatedAt: latestReply?.createdAt || message.createdAt,
        unread: !!message.customerUnread,
        online: !!(portalUser?.online || isRecentlyActive(portalUser?.lastActiveAt || portalUser?.lastLogin, 30)),
        escalationLevel: slaState.level,
        escalationLabel: slaState.label,
        badge: message.status === 'resolved'
          ? 'Resolved'
          : slaState.level === 'critical'
            ? 'Urgent'
            : slaState.level === 'warning'
              ? 'SLA'
              : 'Customer',
      };
    });

    const internalItems = internalChats.map((chat: any) => {
      const lastMessage = chat.messages?.length ? chat.messages[chat.messages.length - 1] : null;
      const isGroupChat = chat.chatType === 'group' || chat.contextType === 'group';
      const isDirectChat = (chat.chatType === 'direct') || (chat.contextType || '').startsWith('direct');
      const derivedTitle = getInternalChatTitle(chat);

      return {
        kind: 'internal' as const,
        id: chat.id,
        title: derivedTitle,
        subtitle: isGroupChat ? 'Saved group' : isDirectChat ? 'Direct message' : 'Team chat',
        preview: lastMessage?.body || chat.contextLabel || 'No messages yet',
        updatedAt: chat.updatedAt || chat.createdAt,
        unread: false,
        online: false,
        badge: isGroupChat ? 'Group' : isDirectChat ? 'DM' : 'Team',
      };
    });

    const urgencyScore = (item: any) => {
      if (item.kind !== 'customer') return 0;
      if (item.escalationLevel === 'critical') return 2;
      if (item.escalationLevel === 'warning') return 1;
      return 0;
    };

    return [...internalItems, ...customerItems].sort((a, b) => {
      const urgencyDiff = urgencyScore(b) - urgencyScore(a);
      if (urgencyDiff !== 0) return urgencyDiff;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [internalChats, messages, activePortalUsers, customerSlaById]);

  const visibleUnifiedChats = useMemo(() => {
    if (!showOnlySlaAlerts) return unifiedChats;

    return unifiedChats.filter((chat: any) => {
      return chat.kind === 'customer' && (chat.escalationLevel === 'warning' || chat.escalationLevel === 'critical');
    });
  }, [unifiedChats, showOnlySlaAlerts]);

  return (
    <div className="flex h-[calc(100vh-80px)] min-h-0 overflow-hidden bg-slate-100 shadow-sm md:rounded-[32px] md:mx-4 md:mb-4">

      {/* ── LEFT SIDEBAR ── */}
      <div className={`relative flex w-full md:w-[300px] shrink-0 flex-col border-r border-slate-200 bg-white ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}>

        {/* Sidebar header */}
        <div className="flex items-center justify-between border-b-2 border-slate-200 bg-white px-5 py-5">
          <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
          <div className="flex items-center gap-2">
            <MessagingModuleHelp
              userId={user.id}
              customerConversations={messages.length}
              internalConversations={internalChats.length}
              unreadCount={unreadTotalCount}
              onRefresh={loadData}
              onOpenNewChat={() => {
                setChatSearch('');
                setShowOnlySlaAlerts(false);
                setShowNewChat(true);
              }}
              onOpenSearchExample={(query) => {
                setShowOnlySlaAlerts(false);
                setChatSearch(query);
              }}
              onClearSearchAndFilters={() => {
                setChatSearch('');
                setShowOnlySlaAlerts(false);
              }}
              onShowSlaAlerts={() => {
                setShowOnlySlaAlerts(true);
                setSelectedConversationType('customer');
              }}
              onShowAllConversations={() => setShowOnlySlaAlerts(false)}
            />
            <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full"
              onClick={loadData}
              disabled={loading}
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full"
              onClick={() => { setChatSearch(''); setShowNewChat(true); }}
              title="New chat or group"
            >
              <Plus className="h-4 w-4" />
            </Button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
              placeholder="Search chats or people..."
              className="rounded-full border-2 border-slate-200 bg-white pl-11 py-2 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-200"
            />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="outline" className="text-[11px]">{unreadTotalCount} unread</Badge>
            <Badge
              variant="outline"
              onClick={() => setShowOnlySlaAlerts((prev) => !prev)}
              role="button"
              className={`text-[11px] ${escalatedCustomerCount > 0 ? 'border-amber-300 bg-amber-50 text-amber-700' : ''}`}
            >
              {showOnlySlaAlerts ? 'Showing SLA alerts' : `${escalatedCustomerCount} SLA alerts`}
            </Badge>
          </div>
        </div>

        {/* Conversation + People list */}
        <div className="flex-1 overflow-y-auto pb-14">

          {/* Loading skeleton */}
          {loading && visibleUnifiedChats.length === 0 && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Recent chats */}
          {visibleUnifiedChats.map((conv) => {
            const isSelected =
              conv.kind === effectiveSelectedConversationType &&
              (conv.kind === 'customer' ? selectedMessageId === conv.id : selectedChatId === conv.id);

            return (
              <button
                key={`${conv.kind}-${conv.id}`}
                onClick={() => {
                  if (conv.kind === 'customer') {
                    setSelectedMessageId(conv.id);
                    setSelectedConversationType('customer');
                  } else {
                    setSelectedChatId(conv.id);
                    setSelectedConversationType('internal');
                  }
                  setMobileView('chat');
                }}
                className={`mx-2 flex w-full items-center gap-3 rounded-3xl px-3 py-2.5 text-left transition-all ${
                  isSelected ? 'bg-blue-500 text-white shadow-md' : 'bg-slate-50 text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="relative shrink-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={conv.avatar_url || undefined} alt={conv.title} />
                    <AvatarFallback>{getAvatarFallback(conv.title, conv.subtitle)}</AvatarFallback>
                  </Avatar>
                  {conv.online && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <p className={`truncate text-sm font-semibold ${isSelected ? 'text-white' : 'text-slate-900'}`}>{conv.title}</p>
                    {conv.badge && (
                      <Badge
                        variant="outline"
                        className={`shrink-0 px-1.5 py-0 text-[10px] ${
                          isSelected
                            ? 'border-white/30 bg-white/10 text-white'
                            : conv.badge === 'Urgent'
                              ? 'border-red-300 bg-red-50 text-red-700'
                              : conv.badge === 'SLA'
                                ? 'border-amber-300 bg-amber-50 text-amber-700'
                                : ''
                        }`}
                      >
                        {conv.badge}
                      </Badge>
                    )}
                    <p className={`shrink-0 text-[11px] ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>{formatTimeAgo(conv.updatedAt)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <p className={`flex-1 truncate text-xs ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                      {conv.escalationLabel || conv.preview || 'Send a message'}
                    </p>
                    {conv.unread && <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500'}`} />}
                  </div>
                </div>
              </button>
            );
          })}

          {/* Divider between chats and people */}
          {visibleUnifiedChats.length > 0 && chatTargets.length > 0 && !showOnlySlaAlerts && (
            <div className="mx-3 my-1 border-t" />
          )}

          {/* People section */}
          {chatTargets.length > 0 && !showOnlySlaAlerts && (
            <>
              <div className="px-4 pb-2 pt-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">People</p>
                  <p className="text-[11px] text-slate-500">{chatTargets.length} available</p>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">Tap a person to start a direct message.</p>
              </div>
              {chatTargets.map((target) => (
                <button
                  key={getTargetKey(target)}
                  onClick={() => {
                    handleStartDirectChat(target);
                    setMobileView('chat');
                  }}
                  className="mx-2 mb-1 flex w-full items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left transition-all hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-sm"
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={target.avatar_url || undefined} alt={target.name} />
                      <AvatarFallback className="text-xs">{getAvatarFallback(target.name, target.email)}</AvatarFallback>
                    </Avatar>
                    {target.online && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-slate-900">{target.name}</p>
                      <Badge variant="outline" className="h-5 rounded-full px-1.5 text-[10px]">
                        {target.kind === 'staff' ? 'Team' : 'Portal'}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-slate-600">{target.subtitle || (target.online ? 'Online now' : 'Available to chat')}</p>
                  </div>
                  <p className={`shrink-0 text-[11px] font-medium ${target.online ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {target.online ? 'Online' : 'Offline'}
                  </p>
                </button>
              ))}
            </>
          )}

          {!loading && chatSearch.trim() && visibleUnifiedChats.length === 0 && chatTargets.length === 0 && !showOnlySlaAlerts && (
            <div className="flex flex-col items-center justify-center gap-2 py-10 px-4 text-center">
              <Search className="h-7 w-7 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No chats or people match "{chatSearch.trim()}".</p>
            </div>
          )}

          {/* Empty state */}
          {!loading && visibleUnifiedChats.length === 0 && chatTargets.length === 0 && !showOnlySlaAlerts && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 px-4 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No conversations yet.</p>
            </div>
          )}
          {!loading && visibleUnifiedChats.length === 0 && showOnlySlaAlerts && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 px-4 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No customer conversations currently breaching SLA.</p>
            </div>
          )}
        </div>

        {/* New Group button — pinned at bottom of left pane */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-100 bg-gradient-to-t from-white to-slate-50 px-3 py-3">
          <Button
            className="w-full gap-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-md"
            onClick={() => { setNewChatMembers([]); setNewChatTitle(''); setNewChatMessage(''); setShowNewChat(true); }}
          >
            <Users className="h-4 w-4" />
            New Group
          </Button>
        </div>
      </div>

      {/* ── RIGHT CHAT AREA ── */}
      <div className={`min-w-0 flex-1 flex-col bg-gradient-to-br from-slate-100 via-blue-50/50 to-indigo-100/40 p-2 sm:p-3 md:p-3 ${mobileView === 'sidebar' ? 'hidden md:flex' : 'flex'}`}>

        {/* Pending new DM — person selected but no existing chat */}
        {pendingDirectTarget && !selectedConversation ? (
          <>
            <div className="flex shrink-0 items-center gap-3 border-b bg-white px-4 py-3">
              <Button
                size="icon"
                variant="ghost"
                className="md:hidden h-8 w-8 shrink-0 rounded-full"
                onClick={() => setMobileView('sidebar')}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="relative">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={pendingDirectTarget.avatar_url || undefined} alt={pendingDirectTarget.name} />
                  <AvatarFallback className="text-sm">{getAvatarFallback(pendingDirectTarget.name, pendingDirectTarget.email)}</AvatarFallback>
                </Avatar>
                {pendingDirectTarget.online && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-base font-semibold text-slate-900">{pendingDirectTarget.name}</p>
                  {pendingDirectTarget.online && (
                    <span className="shrink-0 text-xs text-emerald-600 font-medium">Online</span>
                  )}
                </div>
                <p className="text-sm text-slate-500">
                  {pendingDirectTarget.online ? 'Active now' : pendingDirectTarget.subtitle}
                </p>
              </div>
            </div>
            <div className="flex-1 bg-muted/10" />
            <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-4">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400/20">
                    <input
                      type="text"
                      placeholder={`Message ${pendingDirectTarget.name}...`}
                      value={pendingMessage}
                      onChange={(e) => setPendingMessage(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendToPendingTarget();
                        }
                      }}
                      className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Smile className="h-5 w-5 text-slate-400 hover:text-slate-600 cursor-pointer" />
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleSendToPendingTarget}
                  disabled={sending || !pendingMessage.trim()}
                  size="sm"
                  className="shrink-0 h-11 w-11 rounded-full bg-blue-500 hover:bg-blue-600 p-0"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </>
        ) : !selectedConversation ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
            <div className="max-w-md rounded-[32px] border border-slate-200 bg-white p-10 shadow-sm">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <MessageSquare className="h-8 w-8" />
              </div>
              <p className="text-xl font-semibold text-slate-900">Your Messages</p>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Select a person or group from the left to start chatting. Once you choose a conversation, the new messenger-style chat view will appear here.
              </p>
              <div className="mt-6 rounded-3xl bg-slate-50 p-4 text-left text-sm text-slate-500">
                <p className="font-medium text-slate-900">Try selecting one of these:</p>
                <ul className="mt-2 list-disc space-y-2 pl-4">
                  <li>Contact a customer</li>
                  <li>Start a direct team message</li>
                  <li>Create a new group chat</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 shadow-[0_20px_60px_-25px_rgba(30,58,138,0.35)] backdrop-blur-sm">
            {/* Chat header */}
            <div className="flex shrink-0 items-center gap-3 border-b border-slate-200/70 bg-gradient-to-r from-white via-blue-50/50 to-indigo-50/60 px-4 py-4 shadow-sm">
              <Button
                size="icon"
                variant="ghost"
                className="md:hidden h-8 w-8 shrink-0 rounded-full"
                onClick={() => setMobileView('sidebar')}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="relative">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="text-sm">
                    {effectiveSelectedConversationType === 'customer' && selectedMessage
                      ? getAvatarFallback(selectedMessage.contactName, selectedMessage.contactEmail)
                      : selectedChat
                        ? getAvatarFallback(selectedChat.title)
                        : '?'}
                  </AvatarFallback>
                </Avatar>
                {effectiveSelectedConversationType === 'customer' && selectedPortalUser?.online && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-base font-semibold text-slate-900">
                    {effectiveSelectedConversationType === 'customer' && selectedMessage
                      ? selectedMessage.contactName || selectedMessage.contactEmail || 'Customer'
                      : getInternalChatTitle(selectedChat) || ''}
                  </p>
                  {effectiveSelectedConversationType === 'customer' && selectedCustomerSla?.waitingForTeam && (
                    <Badge
                      className={`border-0 text-[11px] ${selectedCustomerSla.level === 'critical' ? 'bg-red-100 text-red-700' : selectedCustomerSla.level === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}
                    >
                      {selectedCustomerSla.label}
                    </Badge>
                  )}
                  {effectiveSelectedConversationType === 'customer' && selectedPortalUser?.online && (
                    <span className="shrink-0 text-xs text-emerald-600 font-medium">Online</span>
                  )}
                </div>
                <p className="text-sm text-slate-500">
                  {effectiveSelectedConversationType === 'customer' && selectedPortalUser?.online
                    ? 'Active now'
                    : effectiveSelectedConversationType === 'customer' && selectedMessage
                      ? `Last active ${formatTimeAgo(selectedPortalUser?.lastLogin || selectedMessage.createdAt)}`
                      : selectedChat
                        ? selectedChat.chatType === 'group' || selectedChat.contextType === 'group'
                          ? `${selectedChat.participants?.length || 0} members`
                          : (selectedChat.contextType || '').startsWith('direct')
                            ? 'Direct message'
                            : 'Team chat'
                        : ''}
                </p>
              </div>
              {/* Customer message actions */}
              {effectiveSelectedConversationType === 'customer' && selectedMessage && (
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCreateFollowUpTask}
                    className="gap-1.5 rounded-full text-xs px-2 sm:px-3"
                    title="Create follow-up task"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Task</span>
                  </Button>
                  {selectedCustomerSla?.waitingForTeam && (selectedCustomerSla.level === 'warning' || selectedCustomerSla.level === 'critical') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCreateEscalationTask}
                      className={`gap-1.5 rounded-full text-xs px-2 sm:px-3 ${selectedCustomerSla.level === 'critical' ? 'border-red-300 text-red-700 hover:bg-red-50' : 'border-amber-300 text-amber-700 hover:bg-amber-50'}`}
                      title="Create SLA escalation task"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Escalate</span>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={selectedMessage.status === 'resolved' ? 'default' : 'outline'}
                    onClick={handleToggleResolved}
                    disabled={sending}
                    className="gap-1.5 rounded-full text-xs px-2 sm:px-3"
                    title={selectedMessage.status === 'resolved' ? 'Resolved' : 'Resolve'}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{selectedMessage.status === 'resolved' ? 'Resolved' : 'Resolve'}</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Message bubbles */}
            <div className="chat-scroll flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(191,219,254,0.25),_rgba(255,255,255,0.92)_40%),linear-gradient(to_bottom,_#f8fafc,_#ffffff)] px-4 py-6 space-y-4">
              {effectiveSelectedConversationType === 'customer' && selectedMessage ? (
                customerTimeline.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-12">No messages yet.</p>
                ) : (
                  customerTimeline.map((post: any, index: number) => {
                    const isCustomer = post.from === 'customer';
                    return (
                      <div key={`${post.createdAt}-${index}`} className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}>
                        <div
                          className={`max-w-[75%] rounded-[24px] px-4 py-3 shadow-md ${
                            isCustomer
                              ? 'rounded-tl-sm rounded-tr-3xl rounded-br-3xl rounded-bl-3xl border border-slate-200 bg-white text-slate-900'
                              : 'rounded-tr-sm rounded-tl-3xl rounded-br-3xl rounded-bl-3xl bg-blue-500 text-white'
                          }`}
                        >
                          <p className={`mb-0.5 text-[11px] font-medium ${isCustomer ? 'text-muted-foreground' : 'text-blue-200'}`}>
                            {isCustomer ? post.senderName || 'Customer' : post.senderName || 'Team'}
                          </p>
                          <p className="whitespace-pre-wrap text-sm leading-5">{post.body}</p>
                          {!!post.attachments?.length && (
                            <div className="mt-2 space-y-1.5">
                              {post.attachments.map((attachment: any, attachmentIdx: number) => (
                                <a
                                  key={`${attachment.filePath || attachment.name}-${attachmentIdx}`}
                                  href={attachment.url || '#'}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${isCustomer ? 'border-slate-200/40 text-blue-100 hover:bg-blue-400/30' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                                >
                                  <Paperclip className="h-3.5 w-3.5" />
                                  <span className="truncate">{attachment.fileName || attachment.name || 'Attachment'}</span>
                                </a>
                              ))}
                            </div>
                          )}
                          <p className={`mt-1 text-right text-[11px] ${isCustomer ? 'text-muted-foreground' : 'text-blue-200'}`}>
                            {formatDate(post.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )
              ) : selectedChat ? (
                (selectedChat.messages || []).length === 0 ? (
                  <div className="mx-auto my-12 max-w-sm rounded-2xl border border-slate-200 bg-white px-6 py-5 text-center shadow-sm">
                    <p className="text-sm font-semibold text-slate-900">No messages yet</p>
                    <p className="mt-1 text-sm text-slate-500">Start the conversation with a quick hello.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 rounded-full"
                      onClick={() => setInternalChatMessage(`Hi ${getInternalChatTitle(selectedChat)}, `)}
                    >
                      Write a quick hello
                    </Button>
                  </div>
                ) : (
                  (selectedChat.messages || []).map((message: any) => {
                    const ownMessage = message.senderId === user.id;
                    return (
                      <div key={message.id} className={`flex ${ownMessage ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] rounded-[24px] px-4 py-3 shadow-md ${
                            ownMessage
                              ? 'rounded-tr-sm rounded-tl-3xl rounded-br-3xl rounded-bl-3xl bg-blue-500 text-white'
                              : 'rounded-tl-sm rounded-tr-3xl rounded-br-3xl rounded-bl-3xl border border-slate-200 bg-white text-slate-900'
                          }`}
                        >
                          <p className={`mb-0.5 text-[11px] font-medium ${
                            ownMessage ? 'text-slate-300' : 'text-slate-500'
                          }`}>
                            {message.senderName || 'Staff'}
                          </p>
                          <p className="whitespace-pre-wrap text-sm leading-5">{message.body}</p>
                          <p className={`mt-1 text-right text-[11px] ${
                            ownMessage ? 'text-slate-300' : 'text-slate-400'
                          }`}>
                            {formatDate(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )
              ) : null}
            </div>

            {/* Composer */}
            <div className="shrink-0 border-t border-slate-200/80 bg-gradient-to-t from-white via-slate-50/90 to-blue-50/70 px-3 sm:px-4 py-3 sm:py-4 shadow-[0_-10px_30px_-20px_rgba(30,58,138,0.45)]">
              {effectiveSelectedConversationType === 'customer' && selectedMessage ? (
                <>
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <div className="relative rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400/20">
                        <input
                          type="text"
                          placeholder="Message..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendReply();
                            }
                          }}
                          className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Smile className="h-5 w-5 text-slate-400 hover:text-slate-600 cursor-pointer" />
                        </div>
                      </div>
                      {replyAttachments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {replyAttachments.map((attachment: any, idx: number) => (
                            <span key={`${attachment.filePath || attachment.name}-${idx}`} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
                              <Paperclip className="h-3 w-3" />
                              <span className="max-w-[180px] truncate">{attachment.fileName || attachment.name || 'Attachment'}</span>
                              <button
                                type="button"
                                onClick={() => setReplyAttachments((prev) => prev.filter((_: any, i: number) => i !== idx))}
                                className="text-slate-400 hover:text-slate-700"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0">
                      <label className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
                        <Paperclip className="h-4 w-4" />
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            void handleReplyAttachmentPick(file);
                            e.currentTarget.value = '';
                          }}
                        />
                      </label>
                    </div>
                    <Button
                      onClick={handleSendReply}
                      disabled={sending || (!replyText.trim() && replyAttachments.length === 0)}
                      size="sm"
                      className="shrink-0 h-11 w-11 rounded-full bg-blue-500 hover:bg-blue-600 p-0"
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                  {/* Private notes — collapsible */}
                  <details className="mt-2.5 group">
                    <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                      <Lock className="h-3.5 w-3.5" />
                      Private notes ({(selectedMessage.internalNotes || []).length})
                    </summary>
                    <div className="mt-2 space-y-2 rounded-xl bg-amber-50 p-2">
                      {(selectedMessage.internalNotes || []).length === 0 ? (
                        <p className="text-xs text-muted-foreground p-1">No notes yet.</p>
                      ) : (
                        (selectedMessage.internalNotes || []).map((note: any) => (
                          <div key={note.id || `${note.createdAt}-${note.body}`} className="rounded-lg border bg-background p-2">
                            <p className="text-xs font-semibold text-foreground">{note.senderName || 'Staff'}</p>
                            <p className="mt-0.5 text-xs text-foreground">{note.body}</p>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">{formatDate(note.createdAt)}</p>
                          </div>
                        ))
                      )}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add a private note..."
                          value={internalNoteText}
                          onChange={(e) => setInternalNoteText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleAddInternalNote(); }}
                          className="flex-1 rounded-full border bg-background px-3 py-1.5 text-xs outline-none focus:border-blue-400"
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={handleAddInternalNote}
                          disabled={sending || !internalNoteText.trim()}
                          className="rounded-full text-xs"
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  </details>
                </>
              ) : selectedChat ? (
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <div className="relative rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400/20">
                      <input
                        type="text"
                        placeholder="Message..."
                        value={internalChatMessage}
                        onChange={(e) => setInternalChatMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendInternalChatMessage();
                          }
                        }}
                        className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Smile className="h-5 w-5 text-slate-400 hover:text-slate-600 cursor-pointer" />
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={handleSendInternalChatMessage}
                    disabled={sending || !internalChatMessage.trim()}
                    size="sm"
                    className="shrink-0 h-11 w-11 rounded-full bg-blue-500 hover:bg-blue-600 p-0"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* ── NEW CHAT / GROUP DIALOG ── */}
      <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              New Group
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Group Name</label>
              <Input
                value={newChatTitle}
                onChange={(e) => setNewChatTitle(e.target.value)}
                placeholder="Ex: Install Team, Pricing Strategy"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium text-foreground">Choose People</label>
                <Badge variant="outline">{newChatMembers.length} selected</Badge>
              </div>
              <div className="max-h-[260px] space-y-1.5 overflow-y-auto rounded-2xl border p-2">
                {chatTargets.length === 0 ? (
                  <p className="p-2 text-sm text-muted-foreground">No people available right now.</p>
                ) : (
                  chatTargets.map((target) => {
                    const targetKey = getTargetKey(target);
                    const selected = newChatMembers.includes(targetKey);
                    return (
                      <button
                        key={targetKey}
                        type="button"
                        onClick={() =>
                          setNewChatMembers((prev) =>
                            prev.includes(targetKey)
                              ? prev.filter((v) => v !== targetKey)
                              : [...prev, targetKey]
                          )
                        }
                        className={`flex w-full items-center gap-3 rounded-[18px] border px-3 py-2 text-left transition-colors ${
                          selected ? 'border-blue-300 bg-blue-50' : 'hover:bg-muted/60'
                        }`}
                      >
                        <div className="relative">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={target.avatar_url || undefined} alt={target.name} />
                            <AvatarFallback>{getAvatarFallback(target.name, target.email)}</AvatarFallback>
                          </Avatar>
                          {target.online && (
                            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{target.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{target.subtitle}</p>
                        </div>
                        <Badge
                          className={
                            selected
                              ? 'border-0 bg-blue-600 text-white'
                              : 'border-0 bg-slate-200 text-slate-700'
                          }
                        >
                          {selected ? 'Added' : target.kind === 'portal' ? 'Portal' : 'Staff'}
                        </Badge>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Opening Message (optional)</label>
              <Textarea
                rows={3}
                value={newChatMessage}
                onChange={(e) => setNewChatMessage(e.target.value)}
                placeholder="Start the conversation…"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => { setShowNewChat(false); setNewChatMembers([]); }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateInternalChat}
                disabled={sending}
                className="gap-2 rounded-full px-5"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {newChatMembers.length > 1 ? 'Save Group' : 'Create Chat'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
