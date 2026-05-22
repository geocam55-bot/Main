import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Badge } from '../ui/badge';
import {
  MessageSquare,
  Plus,
  Send,
  Clock,
  User,
  Users,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Mail,
  Paperclip,
  X,
} from 'lucide-react';
import { sendPortalMessage, markMessageRead, uploadPortalAttachment } from '../../utils/portal-client';
import { toast } from 'sonner';

interface PortalMessagesProps {
  messages: any[];
  onRefresh: () => void;
}

export function PortalMessages({ messages, onRefresh }: PortalMessagesProps) {
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      onRefresh();
    }, 30000);

    return () => window.clearInterval(interval);
  }, [onRefresh]);

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
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleSend = async () => {
    if (!body.trim() && attachments.length === 0) {
      toast.error('Please enter a message');
      return;
    }

    if (!selectedMessage && !subject.trim()) {
      toast.error('Please add a subject for your new conversation');
      return;
    }

    setSending(true);
    try {
      if (selectedMessage) {
        await sendPortalMessage(selectedMessage.subject || 'Portal Chat', body.trim(), selectedMessage.id, undefined, attachments);
        toast.success('Reply sent');
        setSelectedMessage({
          ...selectedMessage,
          status: 'open',
          replies: [
            ...(selectedMessage.replies || []),
            {
              from: 'customer',
              senderName: 'You',
              body: body.trim(),
              attachments,
              createdAt: new Date().toISOString(),
            },
          ],
        });
      } else {
        await sendPortalMessage(subject.trim(), body.trim(), undefined, undefined, attachments);
        toast.success('Message sent!');
        setSubject('');
        setShowNewMessage(false);
      }

      setBody('');
      setAttachments([]);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleAttachmentPick = async (file: File | null, contactId?: string) => {
    if (!file) return;
    try {
      setSending(true);
      const result = await uploadPortalAttachment(file, { contactId });
      if (result?.attachment) {
        setAttachments((prev) => [...prev, result.attachment]);
        toast.success('Attachment added');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload attachment');
    } finally {
      setSending(false);
    }
  };

  const handleSelectMessage = async (msg: any) => {
    setSelectedMessage(msg);
    // Mark as read if there's an unread team reply for the customer
    if (msg.customerUnread) {
      try {
        await markMessageRead(msg.id);
        onRefresh();
      } catch {
        // silently fail
      }
    }
  };

  if (selectedMessage) {
    const allPosts = [
      {
        from: selectedMessage.from,
        body: selectedMessage.body,
        createdAt: selectedMessage.createdAt,
        senderEmail: selectedMessage.senderEmail,
        attachments: selectedMessage.attachments || [],
      },
      ...(selectedMessage.replies || []),
    ];

    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Button variant="ghost" onClick={() => setSelectedMessage(null)} className="gap-2 rounded-full px-3">
          <ArrowLeft className="h-4 w-4" />
          Back to Messages
        </Button>

        <Card className="overflow-hidden border-0 shadow-xl">
          <CardHeader className="border-b bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 pb-3 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="truncate text-lg text-white">{selectedMessage.subject}</CardTitle>
                <p className="text-xs text-blue-100">{formatDate(selectedMessage.createdAt)}</p>
              </div>
              <Badge className={selectedMessage.status === 'resolved' ? 'bg-emerald-500 text-white border-0' : 'bg-white/15 text-white border-0'}>
                {selectedMessage.status === 'resolved' ? 'Resolved' : 'Open'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[60vh] space-y-3 overflow-y-auto bg-gradient-to-b from-slate-50 via-blue-50/40 to-white px-3 py-4 sm:px-4">
              {allPosts.map((post: any, idx: number) => (
                <div
                  key={idx}
                  className={`flex ${post.from === 'customer' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[82%] rounded-[22px] px-3 py-2.5 shadow-sm ${
                      post.from === 'customer'
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'border border-slate-200 bg-white text-slate-900 rounded-bl-md'
                    }`}
                  >
                    {post.from !== 'customer' && post.senderName && (
                      <p className="mb-1 text-[11px] font-semibold text-slate-500">{post.senderName}</p>
                    )}
                    <p className="whitespace-pre-wrap text-sm leading-5">{post.body}</p>
                    {!!post.attachments?.length && (
                      <div className="mt-2 space-y-1">
                        {post.attachments.map((attachment: any, index: number) => (
                          <a
                            key={`${attachment.filePath || attachment.name}-${index}`}
                            href={attachment.url || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${post.from === 'customer' ? 'border-blue-300 text-blue-100 hover:bg-blue-500/20' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                            <span className="truncate">{attachment.fileName || attachment.name || 'Attachment'}</span>
                          </a>
                        ))}
                      </div>
                    )}
                    <p className={`mt-1 text-[11px] ${post.from === 'customer' ? 'text-blue-100' : 'text-slate-500'}`}>
                      {formatDate(post.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t bg-background/95 p-3 backdrop-blur sm:p-4">
              <div className="mb-3">
                <p className="text-sm font-medium text-foreground">Send a follow-up reply</p>
                <p className="text-xs text-muted-foreground">This goes directly to your ProSpaces team thread.</p>
              </div>
              <div className="rounded-[24px] border bg-muted/40 p-2">
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  className="min-h-[88px] border-0 bg-transparent shadow-none focus-visible:ring-0"
                  placeholder="Type your reply..."
                />
                {attachments.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2 px-2">
                    {attachments.map((attachment: any, idx: number) => (
                      <span key={`${attachment.filePath || attachment.name}-${idx}`} className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-1 text-xs text-slate-600">
                        <Paperclip className="h-3 w-3" />
                        <span className="max-w-[180px] truncate">{attachment.fileName || attachment.name || 'Attachment'}</span>
                        <button
                          type="button"
                          onClick={() => setAttachments((prev) => prev.filter((_: any, i: number) => i !== idx))}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex justify-end">
                  <label className="mr-2 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border bg-background text-slate-600 hover:bg-muted">
                    <Paperclip className="h-4 w-4" />
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        void handleAttachmentPick(file, selectedMessage.contactId);
                        e.currentTarget.value = '';
                      }}
                    />
                  </label>
                  <Button onClick={handleSend} disabled={sending || (!body.trim() && attachments.length === 0)} className="gap-2 rounded-full px-4">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send Reply
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Chat with Your Team</h2>
          <p className="mt-1 text-sm text-muted-foreground">A mobile-style conversation view for quick updates and replies.</p>
        </div>
        <Button onClick={() => setShowNewMessage(true)} className="gap-2 rounded-full px-4">
          <Plus className="h-4 w-4" />
          New Message
        </Button>
      </div>

      {messages.length === 0 ? (
        <Card className="overflow-hidden border-0 shadow-xl">
          <CardContent className="py-12 text-center">
            <MessageSquare className="mx-auto mb-3 h-12 w-12 text-slate-300" />
            <h3 className="text-lg font-medium text-foreground">No messages yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Send a message to your service provider to get started.
            </p>
            <Button onClick={() => setShowNewMessage(true)} className="mt-4 gap-2 rounded-full px-4">
              <Plus className="h-4 w-4" />
              Send First Message
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-[28px] border bg-background/95 p-2 shadow-lg backdrop-blur">
          <div className="space-y-1">
            {messages.map((msg: any) => {
              const isUnread = msg.customerUnread === true;
              const latestReply = msg.replies?.length > 0 ? msg.replies[msg.replies.length - 1] : null;
              const previewText = latestReply
                ? `${latestReply.senderName || 'Team'}: ${latestReply.body}`
                : msg.body;

              return (
                <button
                  key={msg.id}
                  type="button"
                  className={`w-full rounded-[22px] px-3 py-3 text-left transition-colors ${isUnread ? 'bg-blue-50' : 'hover:bg-muted/60'}`}
                  onClick={() => handleSelectMessage(msg)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        msg.from === 'customer' ? 'bg-blue-100' : 'bg-purple-100'
                      }`}>
                        {msg.from === 'customer' ? (
                          <User className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Users className="h-4 w-4 text-purple-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`truncate text-sm ${isUnread ? 'font-bold text-foreground' : 'font-medium text-foreground'}`}>
                            {msg.subject}
                          </p>
                          {isUnread && <span className="h-2 w-2 rounded-full bg-blue-500" />}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{previewText}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-[11px] text-muted-foreground">
                        {formatDate(latestReply?.createdAt || msg.createdAt)}
                      </span>
                      {msg.replies?.length > 0 && (
                        <div className="mt-1">
                          <Badge variant="outline" className="text-[10px]">
                            {msg.replies.length + 1}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* New Message Dialog */}
      <Dialog open={showNewMessage} onOpenChange={setShowNewMessage}>
        <DialogContent className="bg-background max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              New Chat
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="msg-subject">Subject</Label>
              <Input
                id="msg-subject"
                placeholder="What is this regarding?"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="msg-body">Message</Label>
              <Textarea
                id="msg-body"
                placeholder="Type your message..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
              />
            </div>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((attachment: any, idx: number) => (
                  <span key={`${attachment.filePath || attachment.name}-${idx}`} className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs text-slate-600">
                    <Paperclip className="h-3 w-3" />
                    <span className="max-w-[180px] truncate">{attachment.fileName || attachment.name || 'Attachment'}</span>
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((_: any, i: number) => i !== idx))}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-full border px-3 py-2 text-xs text-slate-600 hover:bg-muted">
                <Paperclip className="h-3.5 w-3.5" />
                Attach
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    void handleAttachmentPick(file);
                    e.currentTarget.value = '';
                  }}
                />
              </label>
              <Button variant="outline" onClick={() => setShowNewMessage(false)}>
                Cancel
              </Button>
              <Button onClick={handleSend} disabled={sending} className="gap-2">
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}