import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import {
  MessageSquare,
  User,
  Send,
  Loader2,
  ArrowLeft,
  RefreshCw,
  Inbox,
  Clock,
  CheckCircle2,
  Building2,
  Mail,
  Users,
  Globe,
} from 'lucide-react';
import { getCrmPortalMessages, replyToPortalMessage, getPortalUsers } from '../../utils/portal-client';
import { createClient } from '../../utils/supabase/client';
import { toast } from 'sonner@2.0.3';
import type { User as CrmUser } from '../../App';

interface PortalMessagesAdminProps {
  user: CrmUser;
}

export function PortalMessagesAdmin({ user }: PortalMessagesAdminProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [portalUsers, setPortalUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'messages' | 'users'>('messages');

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const [messagesData, usersData] = await Promise.all([
        getCrmPortalMessages(session.access_token).catch((_err: any) => {
          return { messages: [] };
        }),
        getPortalUsers(session.access_token).catch((_err: any) => {
          return { portalUsers: [] };
        }),
      ]);

      setMessages(messagesData.messages || []);
      setPortalUsers(usersData.portalUsers || []);
    } catch (err: any) {
      // Load data error – non-critical
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedMessage) {
      toast.error('Please enter a reply');
      return;
    }

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Not authenticated');
        return;
      }

      await replyToPortalMessage(
        selectedMessage.id,
        selectedMessage.contactId,
        replyText.trim(),
        session.access_token
      );
      toast.success('Reply sent!');
      setReplyText('');
      
      // Update Customer Portal campaign stats
      try {
        const { campaignsAPI } = await import('../../utils/api');
        const campaignsData = await campaignsAPI.getAll();
        const campaigns = campaignsData.campaigns || [];
        const portalCampaigns = campaigns.filter((c: any) => c.type === 'portal');
        
        if (portalCampaigns.length > 0) {
          const targetCampaign = portalCampaigns[0];
          await campaignsAPI.update(targetCampaign.id, {
            sent_count: (targetCampaign.sent_count || targetCampaign.sent || 0) + 1,
            audience_count: Math.max((targetCampaign.audience_count || targetCampaign.audience || 0), (targetCampaign.sent_count || targetCampaign.sent || 0) + 1)
          });
        } else {
          await campaignsAPI.create({
            name: 'Direct Portal Messages',
            type: 'portal',
            status: 'active',
            audience_segment: 'all',
            channel: 'Customer Portal',
            sent_count: 1,
            audience_count: 1,
            start_date: new Date().toISOString()
          });
        }
      } catch (err) {
        // Failed to update marketing campaign stats – non-critical
      }

      // Refresh messages to get updated reply
      loadData();
      // Update the selected message locally
      const updatedMsg = {
        ...selectedMessage,
        read: true,
        replies: [
          ...(selectedMessage.replies || []),
          {
            from: 'team',
            senderName: user.full_name || user.email,
            body: replyText.trim(),
            createdAt: new Date().toISOString(),
          },
        ],
      };
      setSelectedMessage(updatedMsg);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (date: string) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return d.toLocaleDateString('en-US', { weekday: 'short' });
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const unreadCount = messages.filter((m) => !m.read && m.from === 'customer').length;
  const activePortalUsers = portalUsers.filter((u: any) => u.enabled);

  // ── Selected message detail view ──
  if (selectedMessage) {
    const allPosts = [
      {
        from: selectedMessage.from,
        body: selectedMessage.body,
        createdAt: selectedMessage.createdAt,
        senderName: selectedMessage.contactName || selectedMessage.senderEmail || 'Customer',
      },
      ...(selectedMessage.replies || []),
    ];

    return (
      <div className="space-y-6 p-6">
        <Button variant="ghost" onClick={() => setSelectedMessage(null)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Messages
        </Button>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{selectedMessage.subject}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {selectedMessage.contactName}
                    {selectedMessage.contactCompany && ` - ${selectedMessage.contactCompany}`}
                  </span>
                </div>
              </div>
              <Badge
                className={
                  selectedMessage.read
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-blue-100 text-blue-700'
                }
              >
                {selectedMessage.read ? 'Read' : 'Unread'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Thread */}
            <div className="space-y-4 mb-6">
              {allPosts.map((post: any, idx: number) => (
                <div
                  key={idx}
                  className={`flex ${post.from === 'customer' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-3 ${
                      post.from === 'customer'
                        ? 'bg-muted text-foreground rounded-bl-md'
                        : 'bg-blue-600 text-white rounded-br-md'
                    }`}
                  >
                    <p className={`text-xs font-medium mb-1 ${
                      post.from === 'customer' ? 'text-muted-foreground' : 'text-blue-200'
                    }`}>
                      {post.from === 'customer'
                        ? (post.senderName || 'Customer')
                        : (post.senderName || 'You')}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{post.body}</p>
                    <p className={`text-xs mt-1 ${
                      post.from === 'customer' ? 'text-muted-foreground' : 'text-blue-200'
                    }`}>
                      {formatDate(post.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply input */}
            <div className="border-t pt-4">
              <Textarea
                placeholder="Type your reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={3}
                className="mb-3"
              />
              <div className="flex justify-end">
                <Button onClick={handleReply} disabled={sending || !replyText.trim()} className="gap-2">
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send Reply
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main view ──
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-600" />
            Customer Portal Admin
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage portal messages and users
          </p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('messages')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'messages'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          Messages
          {unreadCount > 0 && (
            <span className="h-5 min-w-[20px] rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center px-1">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'users'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="h-4 w-4" />
          Portal Users
          <span className="text-xs text-muted-foreground">({activePortalUsers.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : activeTab === 'messages' ? (
        /* ── Messages Tab ── */
        messages.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Inbox className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-foreground">No portal messages</h3>
              <p className="text-sm text-muted-foreground mt-1">
                When customers send messages through the portal, they will appear here.
                <br />
                Enable portal access for a contact from their detail page.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {messages.map((msg: any) => {
              const isUnread = !msg.read && msg.from === 'customer';
              const latestReply = msg.replies?.length > 0 ? msg.replies[msg.replies.length - 1] : null;
              const previewText = latestReply
                ? `${latestReply.from === 'team' ? 'You' : msg.contactName}: ${latestReply.body}`
                : msg.body;
              const latestDate = latestReply?.createdAt || msg.createdAt;

              return (
                <Card
                  key={msg.id}
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    isUnread ? 'border-l-4 border-l-blue-500 bg-blue-50/50' : ''
                  }`}
                  onClick={() => setSelectedMessage(msg)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                          isUnread ? 'bg-blue-100' : 'bg-muted'
                        }`}>
                          <User className={`h-4 w-4 ${isUnread ? 'text-blue-600' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm truncate ${
                              isUnread ? 'font-bold text-foreground' : 'font-medium text-foreground'
                            }`}>
                              {msg.subject}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {msg.contactName}
                            {msg.contactCompany && ` - ${msg.contactCompany}`}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{previewText}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isUnread && (
                          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                        )}
                        {msg.replies?.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {msg.replies.length + 1}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(latestDate)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : (
        /* ── Portal Users Tab ── */
        portalUsers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-foreground">No portal users</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Enable portal access for contacts from their detail page.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {portalUsers.map((pu: any, idx: number) => (
              <Card key={idx}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center ${
                        pu.enabled ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        <User className={`h-4 w-4 ${pu.enabled ? 'text-green-600' : 'text-red-500'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{pu.email || 'Portal User'}</p>
                        <p className="text-xs text-muted-foreground">
                          {pu.enabled ? 'Active' : 'Revoked'}
                          {pu.enabledAt && ` \u00b7 Since ${formatDate(pu.enabledAt)}`}
                        </p>
                      </div>
                    </div>
                    <Badge className={pu.enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {pu.enabled ? 'Active' : 'Revoked'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}