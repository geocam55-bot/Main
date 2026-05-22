import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '../utils/supabase/client';
import { emailAPI } from '../utils/api';
import { buildServerFunctionUrl } from '../utils/server-function-url';
import { getServerHeaders } from '../utils/server-headers';

interface EmailQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: any; // Using any for now to be flexible with Quote/Bid types
  orgSettings?: any;
  onSuccess: () => void;
}

export function EmailQuoteDialog({ open, onOpenChange, quote, orgSettings, onSuccess }: EmailQuoteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (open && quote) {
      loadAccounts();
      
      const orgName = orgSettings?.organization_name || quote.organizationName || 'Us';
      
      // Pre-fill form
      setTo(quote.contactEmail || '');
      setSubject(`Quote #${quote.quoteNumber} from ${orgName}`);
      setBody(`Dear ${quote.contactName},\n\nYour quote #${quote.quoteNumber} is ready for review.\n\nTo view your complete quote, including pricing and details, please click the link below.\n\nBest regards,\n${orgName}`);
    }
  }, [open, quote, orgSettings]);

  const generateQuoteHtml = (quote: any) => {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
    };

    const logoHtml = orgSettings?.logo_url 
      ? `<div style="text-align: center; margin-bottom: 20px;"><img src="${orgSettings.logo_url}" alt="Logo" style="max-height: 60px; object-fit: contain;" /></div>`
      : '';

    // Simplified HTML that only shows basic info, forcing user to click link for details
    return `
      ${logoHtml}
      <div style="margin-top: 20px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; font-family: sans-serif; max-width: 600px;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-bottom: 1px solid #ddd;">
          <h2 style="margin: 0; color: #333;">Quote #${quote.quoteNumber || quote.title}</h2>
          <p style="margin: 10px 0 0; color: #666; font-size: 14px;">Date: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div style="padding: 30px 20px; text-align: center; background-color: #fff;">
          <p style="font-size: 16px; line-height: 1.5; color: #555; margin-bottom: 0;">
            This quote includes <strong>${quote.lineItems?.length || 0} item(s)</strong>.
            <br/>
            Total Value: <strong>${formatCurrency(quote.total)}</strong>
          </p>
        </div>
      </div>
    `;
  };

  const loadAccounts = async () => {
    try {
      const { accounts } = await emailAPI.getAccounts();
      setAccounts(accounts);
      if (accounts.length > 0) {
        // Use persisted selection from localStorage, fall back to first account
        const persisted = localStorage.getItem('prospaces_selected_email_account') || '';
        const match = accounts.find((a: any) => a.id === persisted);
        setSelectedAccount(match ? match.id : accounts[0].id);
      }
    } catch (error) {
      // Failed to load email accounts - toast shown below
      toast.error('Failed to load email accounts');
    }
  };

  const handleSend = async () => {
    if (!selectedAccount) {
      toast.error('Please select an email account');
      return;
    }

    if (!to) {
      toast.error('Please enter a recipient email');
      return;
    }

    setLoading(true);

    try {
      const account = accounts.find(a => a.id === selectedAccount);
      if (!account) throw new Error('Account not found');

      // Construct HTML body with quote details
      const quoteHtml = generateQuoteHtml(quote);

      // Resolve Campaign ID before building the link to enable accurate conversion tracking
      let campaignIdToUse = (quote as any).campaignId;
      try {
        if (!campaignIdToUse) {
          const { campaignsAPI } = await import('../utils/api');
          const campaignsData = await campaignsAPI.getAll();
          const campaigns = campaignsData.campaigns || [];
          const emailCampaigns = campaigns.filter((c: any) => c.type === 'email');
          
          if (emailCampaigns.length > 0) {
            campaignIdToUse = emailCampaigns[0].id;
          } else {
            const res = await campaignsAPI.create({
              name: 'Direct Email Quotes',
              type: 'email',
              status: 'active',
              audience_segment: 'all',
              channel: 'Email',
              sent_count: 0,
              audience_count: 0,
              start_date: new Date().toISOString()
            });
            campaignIdToUse = res.campaign.id;
          }
        }
      } catch (err) {
        // Failed to resolve campaign ID – non-critical, continue
      }

      // Tracking Setup
      const appUrl = window.location.origin;
      const orgId = quote.organization_id || quote.organizationId || account.organization_id;
      const quoteId = quote.id;
      
      // 1. View Online Link (for Click tracking)
      // We route through the frontend to handle auth headers securely
      // Use query parameters instead of path parameters to avoid 404s on static host
      // Use _source tag from Bids.tsx loadData to determine table, fallback to quote
      const type = quote._source === 'bids' ? 'bid' : 'quote';
      const campaignIdParam = campaignIdToUse ? `&campaignId=${campaignIdToUse}` : '';
      const targetUrl = `${appUrl}/?view=public-quote&id=${quoteId}&orgId=${orgId}&type=${type}${campaignIdParam}`;
      const encodedTargetUrl = encodeURIComponent(targetUrl);
      const trackingLinkUrl = `${appUrl}/?view=redirect&url=${encodedTargetUrl}&id=${quoteId}&orgId=${orgId}&type=${type}${campaignIdParam}`;
      
      // 2. Tracking Pixel (Disabled for now as it requires auth headers which email clients can't send)
      // const baseUrl = buildServerFunctionUrl();
      // const trackingPixelUrl = `${baseUrl}/track/open?id=${quoteId}&orgId=${orgId}&type=quote`;
      // const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none; visibility:hidden;" alt="" />`;
      
      const viewOnlineLink = `
        <div style="margin-top: 30px; text-align: center;">
            <a href="${trackingLinkUrl}" style="background-color: #2563eb; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-family: Arial, sans-serif; display: inline-block; font-size: 16px; line-height: 1; mso-padding-alt: 0; text-align: center;">
              <!--[if mso]><i style="mso-font-width:150%;mso-text-raise:22pt">&nbsp;</i><![endif]-->
              <span style="color: #ffffff !important; text-decoration: none;">View Quote Online</span>
              <!--[if mso]><i style="mso-font-width:150%">&nbsp;</i><![endif]-->
            </a>
        </div>
      `;

      const fullHtmlBody = `
        <div style="font-family: Arial, sans-serif;">
          <div style="white-space: pre-wrap;">${body.replace(/\n/g, '<br/>')}</div>
          ${quoteHtml}
          ${viewOnlineLink}
        </div>
      `;

      // Use consolidated server send endpoint
      const sendPayload = {
        accountId: selectedAccount,
        to: to.trim(),
        subject: subject.trim(),
        body: fullHtmlBody,
      };

      const supabase = createClient();

      const sendEmailRequest = async (tokenOverride?: string) => {
        const headers = await getServerHeaders(
          tokenOverride ? { 'X-User-Token': tokenOverride } : undefined,
        );
        const response = await fetch(buildServerFunctionUrl('/email-send'), {
          method: 'POST',
          headers,
          body: JSON.stringify(sendPayload),
        });

        const data = await response.json().catch(() => ({
          error: response.statusText || `Send failed with status ${response.status}`,
        }));

        return { response, data };
      };

      const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      let activeUserToken = session?.access_token;

      let { response: sendRes, data: sendData } = await sendEmailRequest(activeUserToken);
      const rawSendError = String(sendData?.error || '');
      const shouldRetryAuth = !sendRes.ok && (
        sendRes.status === 401
        || /invalid.*token|envalid.*token|user token|missing auth token|unauthorized/i.test(rawSendError)
      );

      if (shouldRetryAuth) {
        const refreshResult = await supabase.auth.refreshSession().catch(() => ({ data: { session: null } }));
        activeUserToken = refreshResult?.data?.session?.access_token || activeUserToken;
        ({ response: sendRes, data: sendData } = await sendEmailRequest(activeUserToken));
      }

      if (!sendRes.ok || !sendData.success) {
        throw new Error(sendData.error || `Send failed with status ${sendRes.status}`);
      }

      toast.success('Email sent successfully');

      // The consolidated server endpoint already records the sent email.
      // Avoid a second client-side insert here, which can surface stale-session
      // `invalid token` errors even after the email was successfully sent.
      
      // Also update campaign to track this in Marketing Channel stats
      if (campaignIdToUse) {
        try {
          const { campaignsAPI } = await import('../utils/api');
          const campaignsData = await campaignsAPI.getAll();
          const targetCampaign = campaignsData.campaigns?.find((c: any) => c.id === campaignIdToUse);
          if (targetCampaign) {
            await campaignsAPI.update(targetCampaign.id, {
              sent_count: (targetCampaign.sent_count || targetCampaign.sent || 0) + 1,
              audience_count: Math.max((targetCampaign.audience_count || targetCampaign.audience || 0), (targetCampaign.sent_count || targetCampaign.sent || 0) + 1)
            });
          }
        } catch (err) {
          // Failed to update marketing campaign stats – non-critical
        }
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      const rawMessage = error?.message || 'Unknown error';
      const friendlyMessage = /invalid.*token|envalid.*token|user token|missing auth token|unauthorized/i.test(rawMessage)
        ? 'Your sign-in session expired. Please refresh the page or sign in again, then retry sending the email.'
        : /invalid[_\s-]?grant|invalid credentials|token expired|expired token/i.test(rawMessage)
          ? 'Your email account connection has expired. Please reconnect it in the Email section and try again.'
          : rawMessage;
      toast.error(`Failed to send email: ${friendlyMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col bg-background">
        <DialogHeader>
          <DialogTitle>Email Quote</DialogTitle>
          <DialogDescription>
            Send this quote to the customer.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 overflow-y-auto px-1">
          <div className="grid gap-2">
            <Label htmlFor="account">From Account</Label>
            {accounts.length === 0 ? (
                <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                    No email accounts connected. Please connect an account in the Email tab first.
                </div>
            ) : (
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                    <SelectValue placeholder="Select an account" />
                </SelectTrigger>
                <SelectContent>
                    {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                        {acc.email} ({acc.provider})
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="customer@example.com"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Quote Subject"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Enter your message..."
              rows={5}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={loading || accounts.length === 0}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Quote
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}