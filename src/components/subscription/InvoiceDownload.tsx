import { formatCurrency, formatDate, type BillingEvent, type PlanId } from '../../utils/subscription-client';
import { FREE_ACCOUNT_BILLING_SUPPORT_EMAIL } from '../../config/scoped-email';

const PLAN_NAMES: Record<PlanId, string> = {
  starter: 'Standard User',
  professional: 'Professional',
  enterprise: 'Enterprise',
};

/**
 * Generate a printable HTML invoice and open in a new window for PDF download.
 */
export function downloadInvoice(event: BillingEvent, orgName = 'Your Organization') {
  const planName = event.plan_id ? PLAN_NAMES[event.plan_id] || event.plan_id : 'N/A';
  const invoiceNum = event.invoice_number || 'DRAFT';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${invoiceNum}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .logo { font-size: 24px; font-weight: 700; color: #2563eb; }
    .logo span { color: #64748b; font-weight: 400; font-size: 14px; display: block; margin-top: 4px; }
    .invoice-meta { text-align: right; }
    .invoice-meta h2 { font-size: 28px; color: #1e293b; margin-bottom: 8px; }
    .invoice-meta p { font-size: 13px; color: #64748b; line-height: 1.6; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 32px; padding: 20px; background: #f8fafc; border-radius: 8px; }
    .party h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 6px; }
    .party p { font-size: 14px; color: #334155; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; padding: 10px 12px; border-bottom: 2px solid #e2e8f0; }
    thead th:last-child { text-align: right; }
    tbody td { padding: 14px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #334155; }
    tbody td:last-child { text-align: right; font-weight: 600; }
    .totals { display: flex; justify-content: flex-end; margin-bottom: 40px; }
    .totals-table { width: 280px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #64748b; }
    .totals-row.total { border-top: 2px solid #e2e8f0; padding-top: 12px; margin-top: 4px; font-size: 18px; font-weight: 700; color: #1e293b; }
    .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .status.paid { background: #dcfce7; color: #16a34a; }
    .status.failed { background: #fee2e2; color: #dc2626; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
    .demo-banner { background: #fef3c7; border: 1px solid #fbbf24; color: #92400e; padding: 10px 16px; border-radius: 6px; text-align: center; font-size: 13px; margin-bottom: 24px; }
    @media print {
      body { padding: 20px; }
      .demo-banner { display: none; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="demo-banner">
    This is a demonstration invoice. No real payment was processed.
  </div>

  <div class="header">
    <div class="logo">
      ProSpaces CRM
      <span>Subscription Invoice</span>
    </div>
    <div class="invoice-meta">
      <h2>INVOICE</h2>
      <p>
        <strong>${invoiceNum}</strong><br />
        Date: ${formatDate(event.created_at)}<br />
        Status: <span class="status ${event.status === 'succeeded' ? 'paid' : 'failed'}">
          ${event.status === 'succeeded' ? 'PAID' : event.status.toUpperCase()}
        </span>
      </p>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h4>From</h4>
      <p>
        ProSpaces Inc.<br />
        123 Business Ave, Suite 100<br />
        Austin, TX 78701<br />
        ${FREE_ACCOUNT_BILLING_SUPPORT_EMAIL}
      </p>
    </div>
    <div class="party" style="text-align: right;">
      <h4>Bill To</h4>
      <p>
        ${orgName}<br />
        Customer Account
      </p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Plan</th>
        <th style="text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${event.description}</td>
        <td>${planName}</td>
        <td>${formatCurrency(event.amount, event.currency)}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-table">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>${formatCurrency(event.amount, event.currency)}</span>
      </div>
      <div class="totals-row">
        <span>Tax</span>
        <span>$0.00</span>
      </div>
      <div class="totals-row total">
        <span>Total</span>
        <span>${formatCurrency(event.amount, event.currency)}</span>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>Thank you for your business!</p>
    <p style="margin-top: 6px;">ProSpaces CRM &mdash; www.prospacescrm.com</p>
  </div>

  <div class="no-print" style="text-align: center; margin-top: 24px;">
    <button onclick="window.print()" style="
      background: #2563eb; color: white; border: none; padding: 10px 24px;
      border-radius: 6px; font-size: 14px; cursor: pointer; font-weight: 500;
    ">
      Print / Save as PDF
    </button>
  </div>
</body>
</html>
  `.trim();

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.onload = () => URL.revokeObjectURL(url);
  }
}
