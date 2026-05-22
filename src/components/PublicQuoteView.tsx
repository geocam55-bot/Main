import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle, Printer, Download, Mail, CheckCircle2 } from 'lucide-react';
import { publicAnonKey } from '../utils/supabase/info';
import { buildServerFunctionUrl } from '../utils/server-function-url';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { toast } from 'sonner@2.0.3';
import logo3d from 'figma:asset/09aa6b9a364cd19b8e73e23401db6a6a0b182a0e.png';

interface PublicQuoteViewProps {
  // No props needed, reads from URL
}

export function PublicQuoteView() {
  const [loading, setLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [orgSettings, setOrgSettings] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id');
      const orgId = params.get('orgId');
      const type = params.get('type') || 'quote';

      if (!id || !orgId) {
        setError('Invalid link: Missing ID or Organization ID');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(buildServerFunctionUrl(`/public/view?id=${encodeURIComponent(id)}&orgId=${encodeURIComponent(orgId)}&type=${encodeURIComponent(type)}`), {
            headers: {
                'Authorization': `Bearer ${publicAnonKey}`
            }
        });
        
        let result;
        try {
            result = await response.json();
        } catch (e) {
            throw new Error(`Failed to load ${type}: ${response.statusText}`);
        }
        
        if (!response.ok || result.error) {
            throw new Error(result.error || `Failed to load ${type}: ${response.statusText}`);
        }
        
        setData(result.data);
        if (result.orgSettings) {
            setOrgSettings(result.orgSettings);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
        <p className="text-muted-foreground">Loading document...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto bg-red-100 p-3 rounded-full w-fit mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-red-700">Unable to View Document</CardTitle>
            <CardDescription>
              {error || 'The document you are looking for could not be found.'}
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
             <Button variant="outline" onClick={() => window.location.reload()}>Try Again</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id');
      const orgId = params.get('orgId');
      const type = params.get('type') || 'quote';
      const campaignId = params.get('campaignId');

      const response = await fetch(buildServerFunctionUrl('/public/accept'), {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id, orgId, type, campaignId })
      });
      
      let result;
      try {
          result = await response.json();
      } catch (e) {
          throw new Error(`Failed to accept ${type}: ${response.statusText}`);
      }
      
      if (!response.ok || result.error) {
          throw new Error(result.error || `Failed to accept ${type}: ${response.statusText}`);
      }
      
      setData({ ...data, status: 'accepted' });
      toast.success('Quote accepted successfully!');
      setShowThankYou(true);
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while accepting.');
    } finally {
      setIsAccepting(false);
    }
  };

  if (showThankYou) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4 print:bg-background print:p-0">
        <Card className="w-full max-w-md shadow-lg border-t-4 border-t-green-500 text-center py-8">
          <CardHeader className="pb-4">
            <div className="mx-auto bg-green-100 p-4 rounded-full w-fit mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-foreground mb-2">Thank You!</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Your acceptance has been confirmed and our team has been notified.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p>We're thrilled to move forward with your project. You will receive a follow-up email shortly with the next steps.</p>
          </CardContent>
          <CardFooter className="justify-center pt-6">
            <Button onClick={() => setShowThankYou(false)} variant="outline">
              Review Quote Document
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Determine title based on type
  const quoteNumber = data.quoteNumber || data.quote_number;
  const title = quoteNumber ? `Quote #${quoteNumber}` : (data.title || 'Document');
  
  // Parse line items if they are a string
  let lineItems = data.lineItems || data.line_items || data.items;
  if (typeof lineItems === 'string') {
    try {
        lineItems = JSON.parse(lineItems);
    } catch (e) {
        lineItems = [];
    }
  }

  // Handle both quote and bid column names
  const contactName = data.contactName || data.contact_name || data.clientName || data.client_name || 'Valued Customer';
  const contactEmail = data.contactEmail || data.contact_email;
  const validUntil = data.validUntil || data.valid_until;
  const totalAmount = data.total ?? data.amount ?? 0;
  const subtotalAmount = data.subtotal ?? totalAmount;
  const taxAmount = data.taxAmount ?? data.tax_amount ?? 0;
  const discountAmount = data.discountAmount ?? data.discount_amount ?? 0;
  const organizationName = orgSettings?.organization_name || data.organizationName || data.organization_name || 'ProSpaces';
  const orgLogoUrl = orgSettings?.logo_url || logo3d;
  const projectName = data.projectName || data.project_name;

  return (
    <div className="min-h-screen bg-muted py-8 px-4 sm:px-6 lg:px-8 print:bg-background print:p-0">
      <div className="max-w-4xl mx-auto print:max-w-none">
        
        {/* Actions Bar - Hidden on Print */}
        <div className="mb-6 flex justify-between items-center print:hidden">
          <div className="flex items-center gap-3">
             {orgSettings?.logo_url ? (
               <img src={orgSettings.logo_url} alt={`${organizationName} Logo`} className="h-8 w-8 rounded-lg object-contain" />
             ) : (
               <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 font-bold">
                 {organizationName.charAt(0)}
               </div>
             )}
             <span className="font-bold text-foreground">{organizationName}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button onClick={() => window.print()}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>

        <Card className="shadow-lg border-t-4 border-t-purple-600 print:shadow-none print:border-0">
          <CardHeader className="bg-muted border-b print:bg-background print:border-b-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    {orgSettings?.logo_url ? (
                      <img src={orgSettings.logo_url} alt="Company Logo" className="h-16 w-16 object-contain rounded-xl bg-background" />
                    ) : (
                      <div className="h-16 w-16 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-2xl">
                        {organizationName.charAt(0)}
                      </div>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Issued: {new Date(data.created_at || data.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Total Amount</div>
                    <div className="text-3xl font-bold text-purple-600">{formatCurrency(totalAmount)}</div>
                    <div className="text-xs text-muted-foreground mt-1">{data.status === 'accepted' ? 'Paid / Accepted' : 'Valid until ' + new Date(validUntil).toLocaleDateString()}</div>
                </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Header / Meta Info */}
            <div className="grid grid-cols-2 gap-8 p-8 print:p-6">
                <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Bill To</h3>
                    <div className="font-semibold text-lg text-foreground">{contactName}</div>
                    <div className="text-muted-foreground">{contactEmail}</div>
                </div>
                <div className="text-right">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Payable To</h3>
                    <div className="font-semibold text-lg text-foreground">{organizationName}</div>
                    <div className="text-muted-foreground">{orgSettings?.address || 'ProSpaces CRM Platform'}</div>
                </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-muted border-y border-border print:bg-muted">
                            <th className="py-3 px-6 font-semibold text-foreground text-sm uppercase tracking-wider">Item</th>
                            <th className="py-3 px-6 font-semibold text-foreground text-sm uppercase tracking-wider">Description</th>
                            <th className="py-3 px-6 font-semibold text-foreground text-center text-sm uppercase tracking-wider">Qty</th>
                            <th className="py-3 px-6 font-semibold text-foreground text-right text-sm uppercase tracking-wider">Price</th>
                            <th className="py-3 px-6 font-semibold text-foreground text-right text-sm uppercase tracking-wider">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {lineItems?.map((item: any, index: number) => (
                            <tr key={index} className="hover:bg-muted/50 print:break-inside-avoid">
                                <td className="py-4 px-6 font-medium text-foreground">{item.itemName || item.title || item.item_name || item.sku || item.itemId || 'Item'}</td>
                                <td className="py-4 px-6 text-muted-foreground text-sm">{item.description}</td>
                                <td className="py-4 px-6 text-center text-muted-foreground">{item.quantity || 1}</td>
                                <td className="py-4 px-6 text-right font-mono text-muted-foreground">
                                    {formatCurrency(item.unitPrice || item.price || item.unit_price)}
                                </td>
                                <td className="py-4 px-6 text-right font-mono font-medium text-foreground">
                                    {formatCurrency(item.total || ((item.quantity || 1) * (item.unitPrice || item.price || item.unit_price)))}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals */}
            <div className="p-6 bg-muted/50 border-t border-border print:bg-transparent">
                <div className="flex flex-col gap-2 ml-auto max-w-xs">
                    <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(subtotalAmount)}</span>
                    </div>
                    {taxAmount > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                            <span>Tax:</span>
                            <span>{formatCurrency(taxAmount)}</span>
                        </div>
                    )}
                     {discountAmount > 0 && (
                        <div className="flex justify-between text-green-600">
                            <span>Discount:</span>
                            <span>-{formatCurrency(discountAmount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-bold text-xl text-foreground border-t-2 border-border pt-3 mt-2">
                        <span>Total:</span>
                        <span>{formatCurrency(totalAmount)}</span>
                    </div>
                </div>
            </div>
            
            {/* Notes */}
            {data.notes && (
                <div className="p-6 border-t border-border print:break-inside-avoid">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Notes</h3>
                    <p className="text-foreground text-sm whitespace-pre-wrap bg-yellow-50 p-4 rounded-lg border border-yellow-100 print:border-0 print:bg-transparent print:p-0">
                        {data.notes}
                    </p>
                </div>
            )}
            
             {/* Terms */}
            {(data.terms || true) && (
                <div className="p-6 border-t border-border bg-muted print:bg-background print:border-t-2">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Terms & Conditions</h3>
                    <p className="text-muted-foreground text-xs whitespace-pre-wrap leading-relaxed">
                        {data.terms || "Payment is due within 30 days. Please include the quote number on your check. Thank you for your business!"}
                    </p>
                </div>
            )}
          </CardContent>
          
          {data.status !== 'accepted' && (
            <CardFooter className="bg-muted border-t p-6 flex justify-end print:hidden">
                <Button 
                    className="bg-green-600 hover:bg-green-700 text-white font-medium px-8 py-2 h-auto text-lg"
                    onClick={handleAccept}
                    disabled={isAccepting}
                >
                    {isAccepting ? (
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    ) : (
                        <CheckCircle2 className="h-5 w-5 mr-2" />
                    )}
                    Accept Quote
                </Button>
            </CardFooter>
          )}
        </Card>
        
        <div className="mt-8 text-center text-muted-foreground text-xs print:hidden">
            &copy; {new Date().getFullYear()} {organizationName}. Powered by ProSpaces CRM.
        </div>
      </div>
    </div>
  );
}