import React, { useState, useEffect } from 'react';
import { FileText, User, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { quotesAPI, settingsAPI } from '../utils/api';
import { getGlobalTaxRate, getGlobalTaxRate2, getDefaultQuoteTerms, getPriceTierLabel, getActivePriceLevels, priceLevelToTier } from '../lib/global-settings';
import type { User as AppUser } from '../App';
import { CustomerSelector } from './project-wizard/CustomerSelector';

interface ProjectQuoteGeneratorProps {
  user: AppUser;
  projectType: 'deck' | 'garage' | 'shed' | 'roof' | 'kitchen' | 'interior';
  materials: any[];
  totalCost: number;
  projectData: any;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  price_level: string;
}

export function ProjectQuoteGenerator({ 
  user, 
  projectType, 
  materials, 
  totalCost,
  projectData 
}: ProjectQuoteGeneratorProps) {
  const getDefaultManualMode = () => materials.length === 0 || totalCost <= 0;

  const [isOpen, setIsOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Contact | null>(null);
  const [quoteTitle, setQuoteTitle] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [customerPriceLevel, setCustomerPriceLevel] = useState<string>(getPriceTierLabel(1));
  const [useManualAmount, setUseManualAmount] = useState(getDefaultManualMode);
  const [manualAmount, setManualAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [createAsDeal, setCreateAsDeal] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Organization tax settings
  const [orgTaxRate, setOrgTaxRate] = useState<number>(0);
  const [orgTaxRate2, setOrgTaxRate2] = useState<number>(0);

  // 🔍 DEBUG: Log materials when they change
  useEffect(() => {
    // Materials received - tracked for debugging
  }, [materials]);

  // Load organization settings on mount
  useEffect(() => {
    loadOrganizationSettings();
  }, [user.organizationId]);

  useEffect(() => {
    if (selectedCustomer) {
      const priceLevel = selectedCustomer.price_level || getPriceTierLabel(1);
      setCustomerPriceLevel(priceLevel);
    } else {
      setCustomerPriceLevel(getPriceTierLabel(1));
    }
  }, [selectedCustomer]);

  const loadOrganizationSettings = async () => {
    try {
      const orgSettings = await settingsAPI.getOrganizationSettings(user.organizationId);
      if (orgSettings) {
        setOrgTaxRate(orgSettings.tax_rate || 0);
        setOrgTaxRate2(orgSettings.tax_rate_2 || 0);
        // Loaded tax rates from org settings
      } else {
        // Fallback to localStorage if no settings in database
        const fallbackRate = getGlobalTaxRate();
        const fallbackRate2 = getGlobalTaxRate2();
        setOrgTaxRate(fallbackRate);
        setOrgTaxRate2(fallbackRate2);
        // Using fallback tax rates
      }
    } catch (error) {
      // Error loading organization settings
      // Fallback to localStorage on error
      const fallbackRate = getGlobalTaxRate();
      const fallbackRate2 = getGlobalTaxRate2();
      setOrgTaxRate(fallbackRate);
      setOrgTaxRate2(fallbackRate2);
    }
  };

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const manualSubtotal = Number.parseFloat(manualAmount);
  const hasValidManualAmount = Number.isFinite(manualSubtotal) && manualSubtotal >= 0;
  const subtotalAmount = useManualAmount
    ? (hasValidManualAmount ? manualSubtotal : 0)
    : totalCost;

  // Get tax rates for display
  const taxRate = orgTaxRate || getGlobalTaxRate();
  const taxRate2 = orgTaxRate2 || getGlobalTaxRate2();
  const taxAmount = (subtotalAmount * taxRate) / 100;
  const taxAmount2 = (subtotalAmount * taxRate2) / 100;
  const quoteTotalWithTax = subtotalAmount + taxAmount + taxAmount2;

  const handleGenerateQuote = async () => {
    if (!selectedCustomer?.id) {
      showAlert('error', 'Please select a customer');
      return;
    }

    if (!quoteTitle.trim()) {
      showAlert('error', 'Please enter a quote title');
      return;
    }

    if (useManualAmount && !hasValidManualAmount) {
      showAlert('error', 'Please enter a valid manual quote amount.');
      return;
    }

    // ✅ VALIDATION: Check if materials are enriched (have SKUs and pricing)
    if (!useManualAmount) {
      const unenrichedMaterials = materials.filter(m => !m.sku || !m.itemId || m.unitPrice === 0 || m.cost === 0);
      if (unenrichedMaterials.length > 0) {
        // Materials not enriched - cannot create quote
        showAlert('error', 'Please wait for pricing to load before creating a quote. If pricing does not appear, check that Project Wizard Defaults are configured in Admin Settings.');
        return;
      }
    }

    try {
      setIsSaving(true);

      // Use either planner material total or a manually entered flat amount
      const quoteAmount = subtotalAmount;

      // Build line items from materials when using inventory pricing.
      const lineItems = useManualAmount
        ? []
        : materials.map((material, index) => ({
            id: `item_${index}`,
            itemId: material.itemId || '', // Inventory item ID - may be empty if not enriched
            itemName: material.name || material.description || material.item || 'Material', // Prioritize inventory name over deck planner description
            sku: material.sku || '', // Use actual SKU from inventory, leave empty if not found
            description: material.description || material.name || material.item || 'Material',
            quantity: material.quantity,
            unit: material.unit || 'ea',
            unitPrice: material.unitPrice || material.costPerUnit || material.price || material.cost || 0,
            cost: material.cost || 0,
            total: material.totalCost || (material.quantity * (material.unitPrice || material.costPerUnit || material.price || material.cost || 0)),
          }));

      // Line items created with SKUs

      // Build enhanced notes with project and pricing information
      const enhancedNotes = [
        `Project Type: ${projectType.charAt(0).toUpperCase() + projectType.slice(1)}`,
        useManualAmount
          ? `Pricing Mode: Manual Quote Amount ($${quoteAmount.toFixed(2)})`
          : 'Pricing Mode: Inventory Line Items',
        quoteNotes ? `\\nAdditional Notes:\\n${quoteNotes}` : ''
      ].filter(Boolean).join('\\n');

      // Get global organization settings
      const defaultTerms = getDefaultQuoteTerms();

      // Calculate subtotal
      const subtotal = quoteAmount;
      
      // Calculate tax amounts
      const discountPercent = 0;
      const discountAmount = 0;
      const afterDiscount = subtotal - discountAmount;
      const total = afterDiscount + taxAmount + taxAmount2;

      // Create quote data
      const quoteData = {
        title: quoteTitle,
        contact_id: selectedCustomer.id,
        contact_name: selectedCustomer.name || selectedCustomer.company || 'Unknown',
        price_tier: priceLevelToTier(customerPriceLevel),
        subtotal: subtotal,
        discount_percent: discountPercent,
        discount_amount: discountAmount,
        tax_percent: taxRate,
        tax_percent_2: taxRate2,
        tax_amount: taxAmount,
        tax_amount_2: taxAmount2,
        total: total,
        status: createAsDeal ? 'draft' : 'draft',
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        notes: enhancedNotes,
        terms: defaultTerms,
        line_items: lineItems,
      };

      // Creating quote

      await quotesAPI.create(quoteData);

      showAlert('success', 'Quote created successfully!');
      
      // Reset form
      setTimeout(() => {
        setIsOpen(false);
        setQuoteTitle('');
        setQuoteNotes('');
        setSelectedCustomer(null);
        setUseManualAmount(getDefaultManualMode());
        setManualAmount('');
      }, 2000);

    } catch (error: any) {
      // Error creating quote
      showAlert('error', error.message || 'Failed to create quote');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="print:hidden flex gap-2 flex-wrap">
        <Button 
          onClick={() => {
            setUseManualAmount(getDefaultManualMode());
            setManualAmount('');
            setIsOpen(true);
          }}
          className="flex items-center gap-2"
          variant="outline"
        >
          <FileText className="w-4 h-4" />
          Create Quote for Contact
        </Button>
        <Button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <FileText className="w-4 h-4" />
          Generate PDF Proposal
        </Button>
      </div>
    );
  }

  return (
    <Card className="print:hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="w-4 h-4" />
          Create Quote from {projectType.charAt(0).toUpperCase() + projectType.slice(1)} Plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alert && (
          <Alert variant={alert.type === 'error' ? 'destructive' : 'default'} className="py-2">
            {alert.type === 'success' ? (
              <Check className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription className="text-sm">{alert.message}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {/* Customer Selection */}
          <div>
            <Label htmlFor="customer" className="flex items-center gap-1.5 text-sm mb-1.5">
              <User className="w-3.5 h-3.5" />
              Customer *
            </Label>
            <CustomerSelector
              organizationId={user.organizationId}
              selectedCustomer={selectedCustomer}
              onCustomerSelect={setSelectedCustomer}
              userId={user.id}
              showLabel={false}
            />
          </div>
          
          {/* Customer Price Level Override */}
          {selectedCustomer && (
            <div>
              <Label htmlFor="priceLevel" className="text-sm mb-1.5 block text-muted-foreground">
                Customer Pricing Tier (Override for Quote)
              </Label>
              <Select value={customerPriceLevel} onValueChange={setCustomerPriceLevel}>
                <SelectTrigger id="priceLevel" className="h-9 w-[200px]">
                  <SelectValue placeholder="Select pricing tier" />
                </SelectTrigger>
                <SelectContent>
                  {getActivePriceLevels().map((label, index) => (
                    <SelectItem key={`tier-${index+1}`} value={label}>
                      Tier {index+1} - {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Quote Title */}
        <div>
          <Label htmlFor="quoteTitle" className="text-sm mb-1.5 block">Quote Title *</Label>
          <Input
            id="quoteTitle"
            value={quoteTitle}
            onChange={(e) => setQuoteTitle(e.target.value)}
            placeholder={`${projectType.charAt(0).toUpperCase() + projectType.slice(1)} Construction Quote`}
            className="h-9"
          />
        </div>

        {/* Pricing Source */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              id="manualAmountMode"
              checked={useManualAmount}
              onChange={(e) => setUseManualAmount(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <Label htmlFor="manualAmountMode" className="text-sm font-normal cursor-pointer">
              Enter subtotal manually (without inventory line items)
            </Label>
          </div>

          {useManualAmount ? (
            <div>
              <Label htmlFor="manualAmount" className="text-sm mb-1.5 block">Subtotal Amount *</Label>
              <Input
                id="manualAmount"
                type="number"
                min="0"
                step="0.01"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                placeholder="4000.00"
                className="h-9"
              />
            </div>
          ) : (
            <div>
              <Label className="text-sm mb-1.5 block">Materials ({materials.length} items)</Label>
              <div className="h-9 flex items-center text-xs text-muted-foreground bg-muted rounded-md px-3 border">
                {materials.length > 0 ? (
                  <span className="truncate">
                    {materials.slice(0, 2).map(m => m.description || m.name || m.item || 'Material').join(', ')}
                    {materials.length > 2 && ` +${materials.length - 2} more`}
                  </span>
                ) : (
                  <span className="text-muted-foreground">No materials</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Price Summary */}
        {selectedCustomer && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground">Subtotal:</span>
              <span className="text-foreground">${subtotalAmount.toFixed(2)}</span>
            </div>
            {taxRate > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Tax ({taxRate}%):</span>
                <span className="text-foreground">${taxAmount.toFixed(2)}</span>
              </div>
            )}
            {taxRate2 > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Tax 2 ({taxRate2}%):</span>
                <span className="text-foreground">${taxAmount2.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-blue-300 pt-2">
              <span className="text-foreground font-medium">Total (incl. tax):</span>
              <span className="text-blue-900 font-semibold">${quoteTotalWithTax.toFixed(2)}</span>
            </div>
            {!useManualAmount && totalCost === 0 && (
              <div className="text-xs text-amber-600 pt-1 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                ⚠️ No pricing set. Configure Item Defaults in Organization Settings or use manual amount mode.
              </div>
            )}
            {useManualAmount && !hasValidManualAmount && (
              <div className="text-xs text-amber-700 pt-1 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                Enter a valid manual subtotal amount to continue.
              </div>
            )}
          </div>
        )}

        {/* Quote Notes */}
        <div>
          <Label htmlFor="quoteNotes" className="text-sm mb-1.5 block">Notes (Optional)</Label>
          <Textarea
            id="quoteNotes"
            value={quoteNotes}
            onChange={(e) => setQuoteNotes(e.target.value)}
            placeholder="Add any additional notes or terms..."
            rows={2}
            className="text-sm resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 py-2">
          <input 
            type="checkbox" 
            id="createAsDeal" 
            checked={createAsDeal} 
            onChange={(e) => setCreateAsDeal(e.target.checked)} 
            className="w-4 h-4 rounded border-border"
          />
          <Label htmlFor="createAsDeal" className="text-sm font-normal cursor-pointer">
            Track as active Deal in Pipeline
          </Label>
        </div>

        <div className="flex gap-2 pt-2">
          <Button 
            onClick={handleGenerateQuote}
            disabled={isSaving || !selectedCustomer || !quoteTitle.trim() || (useManualAmount && !hasValidManualAmount)}
            className="flex-1 h-9"
            size="sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Create Quote
              </>
            )}
          </Button>
          <Button 
            onClick={() => setIsOpen(false)}
            variant="outline"
            disabled={isSaving}
            size="sm"
            className="h-9"
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}