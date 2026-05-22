import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import {
  FileText,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  ChevronRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { acceptQuote, rejectQuote } from '../../utils/portal-client';
import { toast } from 'sonner@2.0.3';

interface PortalQuotesProps {
  quotes: any[];
  onRefresh: () => void;
}

export function PortalQuotes({ quotes, onRefresh }: PortalQuotesProps) {
  const [selectedQuote, setSelectedQuote] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState<{ type: 'accept' | 'reject'; quoteId: string } | null>(null);

  // Parse line_items safely — the CRM saves them with JSON.stringify(),
  // so the DB may return a JSON string instead of a native array.
  const parseLineItems = (raw: any): any[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

  const formatDate = (date: string) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleAction = async (type: 'accept' | 'reject', quoteId: string) => {
    setActionLoading(quoteId);
    try {
      if (type === 'accept') {
        await acceptQuote(quoteId);
        toast.success('Quote accepted successfully!');
      } else {
        await rejectQuote(quoteId);
        toast.success('Quote declined');
      }
      setShowConfirmDialog(null);
      setSelectedQuote(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || `Failed to ${type} quote`);
    } finally {
      setActionLoading(null);
    }
  };

  const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    draft: { label: 'Draft', color: 'text-foreground', bgColor: 'bg-muted' },
    sent: { label: 'Pending Review', color: 'text-blue-700', bgColor: 'bg-blue-100' },
    viewed: { label: 'Under Review', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
    accepted: { label: 'Accepted', color: 'text-green-700', bgColor: 'bg-green-100' },
    rejected: { label: 'Declined', color: 'text-red-700', bgColor: 'bg-red-100' },
    expired: { label: 'Expired', color: 'text-amber-700', bgColor: 'bg-amber-100' },
    completed: { label: 'Completed', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  };

  const canAct = (status: string) => ['sent', 'viewed'].includes(status);

  if (selectedQuote) {
    const lineItems = parseLineItems(selectedQuote.line_items);

    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => setSelectedQuote(null)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Quotes
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="text-xl">
                  {selectedQuote.title || selectedQuote.quote_number || 'Quote'}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Quote #{selectedQuote.quote_number || selectedQuote.id?.slice(0, 8)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {(() => {
                  const config = statusConfig[selectedQuote.status] || statusConfig.draft;
                  return (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.color}`}>
                      {config.label}
                    </span>
                  );
                })()}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quote Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">Date Created</p>
                <p className="text-sm font-medium">{formatDate(selectedQuote.created_at)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">Valid Until</p>
                <p className="text-sm font-medium">
                  {selectedQuote.valid_until ? formatDate(selectedQuote.valid_until) : 'N/A'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50">
                <p className="text-xs text-blue-600">Total Amount</p>
                <p className="text-lg font-bold text-blue-700">{formatCurrency(selectedQuote.total)}</p>
              </div>
            </div>

            {/* Line Items */}
            {lineItems.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Line Items</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 font-medium text-muted-foreground">Item</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Qty</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Unit Price</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {lineItems.map((item: any, idx: number) => (
                        <tr key={idx}>
                          <td className="p-3">
                            <p className="font-medium text-foreground">{item.itemName || item.item_name || 'Item'}</p>
                            {(item.description || item.sku) && (
                              <p className="text-xs text-muted-foreground mt-0.5">{item.description || item.sku}</p>
                            )}
                          </td>
                          <td className="p-3 text-right text-muted-foreground">{item.quantity}</td>
                          <td className="p-3 text-right text-muted-foreground">{formatCurrency(item.unitPrice || item.unit_price)}</td>
                          <td className="p-3 text-right font-medium text-foreground">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between px-3">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatCurrency(selectedQuote.subtotal)}</span>
                  </div>
                  {selectedQuote.discount_amount > 0 && (
                    <div className="flex justify-between px-3 text-green-600">
                      <span>Discount</span>
                      <span>-{formatCurrency(selectedQuote.discount_amount)}</span>
                    </div>
                  )}
                  {selectedQuote.tax_amount > 0 && (
                    <div className="flex justify-between px-3">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="font-medium">{formatCurrency(selectedQuote.tax_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between px-3 pt-2 border-t text-base">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="font-bold text-blue-700">{formatCurrency(selectedQuote.total)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Notes / Terms */}
            {selectedQuote.notes && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Notes</h3>
                <p className="text-sm text-muted-foreground bg-muted rounded-lg p-3 whitespace-pre-wrap">
                  {selectedQuote.notes}
                </p>
              </div>
            )}
            {selectedQuote.terms && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Terms & Conditions</h3>
                <p className="text-sm text-muted-foreground bg-muted rounded-lg p-3 whitespace-pre-wrap">
                  {selectedQuote.terms}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            {canAct(selectedQuote.status) && (
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => setShowConfirmDialog({ type: 'accept', quoteId: selectedQuote.id })}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Accept Quote
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => setShowConfirmDialog({ type: 'reject', quoteId: selectedQuote.id })}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Decline
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Confirm Dialog */}
        <Dialog open={!!showConfirmDialog} onOpenChange={() => setShowConfirmDialog(null)}>
          <DialogContent className="bg-background max-w-md">
            <DialogHeader>
              <DialogTitle>
                {showConfirmDialog?.type === 'accept' ? 'Accept Quote?' : 'Decline Quote?'}
              </DialogTitle>
              <DialogDescription>
                {showConfirmDialog?.type === 'accept'
                  ? 'By accepting this quote, you agree to the terms and pricing outlined above. The service provider will be notified.'
                  : 'Are you sure you want to decline this quote? You can contact your service provider for revisions.'}
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowConfirmDialog(null)}
              >
                Cancel
              </Button>
              <Button
                className={`flex-1 ${showConfirmDialog?.type === 'accept' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                onClick={() => showConfirmDialog && handleAction(showConfirmDialog.type, showConfirmDialog.quoteId)}
                disabled={!!actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : showConfirmDialog?.type === 'accept' ? (
                  'Confirm Accept'
                ) : (
                  'Confirm Decline'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Your Quotes & Proposals</h2>
        <p className="text-muted-foreground text-sm mt-1">Review and respond to quotes from your service provider</p>
      </div>

      {quotes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-foreground">No quotes yet</h3>
            <p className="text-sm text-muted-foreground mt-1">When your service provider sends you a quote, it will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {quotes.map((quote: any) => {
            const config = statusConfig[quote.status] || statusConfig.draft;
            return (
              <Card
                key={quote.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedQuote(quote)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {quote.title || quote.quote_number || 'Quote'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            #{quote.quote_number || quote.id?.slice(0, 8)} &middot; {formatDate(quote.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">{formatCurrency(quote.total)}</p>
                        <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                      </div>
                      {canAct(quote.status) && (
                        <Badge className="bg-amber-100 text-amber-700 text-xs shrink-0">
                          Action Required
                        </Badge>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}