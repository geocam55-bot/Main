import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { CreditCard, Plus, Pencil, Shield, Loader2 } from 'lucide-react';
import type { PaymentMethod } from '../../utils/subscription-client';

interface PaymentMethodCardProps {
  paymentMethod: PaymentMethod | null;
  isAdmin: boolean;
  actionLoading: boolean;
  onUpdate: (pm: Partial<PaymentMethod>) => Promise<void>;
}

const CARD_BRANDS: { value: string; label: string }[] = [
  { value: 'Visa', label: 'Visa' },
  { value: 'Mastercard', label: 'Mastercard' },
  { value: 'American Express', label: 'American Express' },
  { value: 'Discover', label: 'Discover' },
];

const CARD_ICONS: Record<string, string> = {
  Visa: 'V',
  Mastercard: 'M',
  'American Express': 'A',
  Discover: 'D',
};

export function PaymentMethodCard({ paymentMethod, isAdmin, actionLoading, onUpdate }: PaymentMethodCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [brand, setBrand] = useState('Visa');
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('12');
  const [expYear, setExpYear] = useState('2028');
  const [cvc, setCvc] = useState('');
  const [nameOnCard, setNameOnCard] = useState('');

  const handleSave = async () => {
    const last4 = cardNumber.replace(/\s/g, '').slice(-4) || '4242';
    await onUpdate({
      brand,
      last4,
      exp_month: parseInt(expMonth),
      exp_year: parseInt(expYear),
    });
    setEditOpen(false);
    setCardNumber('');
    setCvc('');
  };

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              Payment Method
            </CardTitle>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
              >
                {paymentMethod ? (
                  <>
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Update
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Card
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {paymentMethod ? (
            <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-gradient-to-r from-slate-50 to-white">
              {/* Card visual */}
              <div className="w-16 h-10 rounded-md bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                {CARD_ICONS[paymentMethod.brand] || 'C'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {paymentMethod.brand} ending in {paymentMethod.last4}
                  </p>
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    Default
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Expires {paymentMethod.exp_month.toString().padStart(2, '0')}/{paymentMethod.exp_year}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <CreditCard className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">No payment method on file</p>
              {isAdmin && (
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Payment Method
                </Button>
              )}
            </div>
          )}

          {/* Security notice */}
          <div className="flex items-center gap-2 mt-4 p-3 rounded-lg bg-muted border border-border">
            <Shield className="h-4 w-4 text-green-600 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Demo Mode</span> — No real payment information is stored or processed.
              Card details are simulated for demonstration purposes only.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{paymentMethod ? 'Update' : 'Add'} Payment Method</DialogTitle>
            <DialogDescription>
              Enter card details below. This is a demo — no real charges will be made.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Name on Card</Label>
              <Input
                placeholder="John Smith"
                value={nameOnCard}
                onChange={(e) => setNameOnCard(e.target.value)}
              />
            </div>

            <div>
              <Label>Card Number</Label>
              <Input
                placeholder="4242 4242 4242 4242"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                maxLength={19}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Exp. Month</Label>
                <Select value={expMonth} onValueChange={setExpMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {String(i + 1).padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Exp. Year</Label>
                <Select value={expYear} onValueChange={setExpYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => (
                      <SelectItem key={2026 + i} value={String(2026 + i)}>
                        {2026 + i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>CVC</Label>
                <Input
                  placeholder="123"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                />
              </div>
            </div>

            <div>
              <Label>Card Brand</Label>
              <Select value={brand} onValueChange={setBrand}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARD_BRANDS.map((b) => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={actionLoading}>
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Saving...
                </>
              ) : (
                'Save Card'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
