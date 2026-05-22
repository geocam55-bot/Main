import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Receipt,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpCircle,
  CreditCard,
  Gift,
  MinusCircle,
  RotateCcw,
  FileText,
} from 'lucide-react';
import { formatCurrency, formatDate, type BillingEvent } from '../../utils/subscription-client';
import { downloadInvoice } from './InvoiceDownload';
import { FREE_ACCOUNT_BILLING_SUPPORT_EMAIL } from '../../config/scoped-email';

interface BillingHistoryProps {
  events: BillingEvent[];
  supportEmail?: string;
}

const EVENT_META: Record<string, { icon: typeof Receipt; color: string; bg: string }> = {
  payment: { icon: CreditCard, color: 'text-green-600', bg: 'bg-green-50' },
  refund: { icon: RotateCcw, color: 'text-amber-600', bg: 'bg-amber-50' },
  credit: { icon: Gift, color: 'text-blue-600', bg: 'bg-blue-50' },
  plan_change: { icon: ArrowUpCircle, color: 'text-purple-600', bg: 'bg-purple-50' },
  subscription_created: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
  subscription_canceled: { icon: MinusCircle, color: 'text-red-600', bg: 'bg-red-50' },
  trial_started: { icon: Gift, color: 'text-blue-600', bg: 'bg-blue-50' },
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  succeeded: { label: 'Paid', className: 'bg-green-100 text-green-700' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-700' },
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700' },
  refunded: { label: 'Refunded', className: 'bg-muted text-foreground' },
};

export function BillingHistory({ events, supportEmail }: BillingHistoryProps) {
  const resolvedSupportEmail = supportEmail || FREE_ACCOUNT_BILLING_SUPPORT_EMAIL;

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <Receipt className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No Billing History</h3>
          <p className="text-sm text-muted-foreground">Transactions will appear here once you subscribe to a plan.</p>
          <p className="text-xs text-muted-foreground mt-6">
            Billing support: <a className="underline" href={`mailto:${resolvedSupportEmail}`}>{resolvedSupportEmail}</a>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5 text-muted-foreground" />
            Billing History
          </CardTitle>
          <Badge variant="secondary">{events.length} transaction{events.length !== 1 ? 's' : ''}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Desktop table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => {
                const meta = EVENT_META[event.type] || EVENT_META.payment;
                const statusInfo = STATUS_BADGE[event.status] || STATUS_BADGE.pending;
                const Icon = meta.icon;

                return (
                  <TableRow key={event.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(event.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-md ${meta.bg}`}>
                          <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                        </div>
                        <span className="text-sm text-foreground">{event.description}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">
                      {event.invoice_number || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${statusInfo.className}`}>
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {event.amount > 0 ? (
                        <span className={event.type === 'refund' ? 'text-amber-600' : 'text-foreground'}>
                          {event.type === 'refund' ? '-' : ''}{formatCurrency(event.amount, event.currency)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">$0.00</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {event.invoice_number && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          title="Download invoice"
                          onClick={() => downloadInvoice(event)}
                        >
                          <Download className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {events.map((event) => {
            const meta = EVENT_META[event.type] || EVENT_META.payment;
            const statusInfo = STATUS_BADGE[event.status] || STATUS_BADGE.pending;
            const Icon = meta.icon;

            return (
              <div
                key={event.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/50"
              >
                <div className={`p-2 rounded-lg ${meta.bg} mt-0.5`}>
                  <Icon className={`h-4 w-4 ${meta.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground leading-snug">{event.description}</p>
                    <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                      {event.amount > 0 ? formatCurrency(event.amount, event.currency) : '$0.00'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-muted-foreground">{formatDate(event.created_at)}</span>
                    {event.invoice_number && (
                      <span className="text-xs text-muted-foreground font-mono">{event.invoice_number}</span>
                    )}
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusInfo.className}`}>
                      {statusInfo.label}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            Billing support: <a className="underline" href={`mailto:${resolvedSupportEmail}`}>{resolvedSupportEmail}</a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}