import React, { useState, useEffect } from 'react';
import { listDesigns, saveDesign, deleteDesign as deleteDesignApi, createDeal as createDealAPI } from '../../utils/designs-client';
import { DeckConfig } from '../../types/deck';
import { CustomerSelector } from '../project-wizard/CustomerSelector';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { FileText, Trash2, Download, Save, User, FileCheck, Handshake, DollarSign } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { Checkbox } from '../ui/checkbox';
import type { User as AppUser } from '../../App';
import type { CustomExportTemplate } from '../../utils/export-engine';
import { exportPlannerDesign } from '../../utils/planner-export';
import { loadPlannerExportTemplates } from '../../utils/planner-export-templates';

interface SavedDeckDesignsProps {
  user: AppUser;
  currentConfig: DeckConfig;
  materials: any[];
  totalCost: number;
  onLoadDesign: (config: DeckConfig, designInfo?: {
    name?: string;
    description?: string;
    customerName?: string;
    customerCompany?: string;
  }) => void;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  price_level: string;
}

interface SavedDesign {
  id: string;
  name: string;
  description: string;
  config: DeckConfig;
  customer_id: string | null;
  customer_name: string | null;
  customer_company: string | null;
  deal_id: string | null;
  deal_title: string | null;
  price_tier: string;
  total_cost: number;
  materials: any[];
  created_at: string;
  updated_at: string;
}

export function SavedDeckDesigns({ 
  user,
  currentConfig, 
  materials,
  totalCost,
  onLoadDesign 
}: SavedDeckDesignsProps) {
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [createDeal, setCreateDeal] = useState(false);
  const [dealTitle, setDealTitle] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [dealDescription, setDealDescription] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'xml' | 'custom'>('csv');
  const [customTemplateId, setCustomTemplateId] = useState('');
  const [exportTemplates, setExportTemplates] = useState<CustomExportTemplate[]>([]);

  // Auto-populate deal title when design name changes
  useEffect(() => {
    if (saveName.trim() && selectedCustomer) {
      setDealTitle(`Deck Project - ${saveName.trim()}`);
    }
  }, [saveName, selectedCustomer]);

  // Auto-populate deal value when total cost changes
  useEffect(() => {
    if (totalCost > 0) {
      setDealValue(totalCost.toFixed(2));
    }
  }, [totalCost]);

  useEffect(() => {
    // Only load if we have a valid organization ID
    if (user.organizationId) {
      loadDesigns();
    } else {
      // Skipping load - organizationId is undefined
    }
  }, [user.organizationId]);

  useEffect(() => {
    let cancelled = false;

    const loadExportTemplates = async () => {
      try {
        const templates = await loadPlannerExportTemplates(user.organizationId);
        if (!cancelled) {
          setExportTemplates(templates);
          if (templates.length > 0) {
            setCustomTemplateId((current) => current || templates[0].id);
          }
        }
      } catch {
        if (!cancelled) {
          setExportTemplates([]);
        }
      }
    };

    if (user.organizationId) {
      loadExportTemplates();
    }

    return () => {
      cancelled = true;
    };
  }, [user.organizationId]);

  const loadDesigns = async () => {
    // Guard against undefined organizationId
    if (!user.organizationId) {
      // Cannot load designs - organizationId is undefined
      setSaveMessage('Unable to load designs. Please refresh the page.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setSaveMessage(''); // Clear any previous messages
    // Loading designs for organization
    
    try {
      const data = await listDesigns('deck');
      // Loaded designs
      setDesigns(data as SavedDesign[]);
    } catch (error) {
      // Error loading saved designs
      setSaveMessage('Error loading designs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDesign = async () => {
    if (!saveName.trim()) {
      setSaveMessage('Please enter a name for your design');
      return;
    }

    if (createDeal && !selectedCustomer) {
      setSaveMessage('Please select a customer to create a deal');
      return;
    }

    if (createDeal && !dealTitle.trim()) {
      setSaveMessage('Please enter a deal title');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Save the design via server API (bypasses RLS)
      const savedDesign = await saveDesign('deck', {
        customer_id: selectedCustomer?.id || null,
        name: saveName.trim(),
        description: saveDescription.trim() || null,
        config: currentConfig,
        price_tier: selectedCustomer?.price_level || 't1',
        total_cost: totalCost,
        materials: materials,
      });

      // Design saved via server successfully
      
      let successParts: string[] = ['Design saved'];

      // 2. Create deal (opportunity) if requested
      if (createDeal && selectedCustomer) {
        try {
          const dealData = await createDealAPI({
            customer_id: selectedCustomer.id,
            title: dealTitle.trim(),
            description: dealDescription.trim() || `${currentConfig.width}' x ${currentConfig.length}' ${currentConfig.shape} deck design`,
            value: parseFloat(dealValue) || totalCost || 0,
            status: 'open',
          });

          // Deal created successfully
          successParts.push('deal created');
        } catch (dealErr: any) {
          // Error creating deal
          setSaveMessage(`Design saved, but error creating deal: ${dealErr.message}`);
          setTimeout(() => setSaveMessage(''), 5000);
        }
      }

      // Set final success message
      if (!saveMessage || saveMessage.includes('success') || !saveMessage.includes('error')) {
        const finalMsg = successParts.join(', ') + ' successfully!';
        setSaveMessage(finalMsg.charAt(0).toUpperCase() + finalMsg.slice(1));
        setTimeout(() => setSaveMessage(''), 3000);
      }

      // 3. Reset form
      setSaveName('');
      setSaveDescription('');
      setSelectedCustomer(null);
      setCreateDeal(false);
      setDealTitle('');
      setDealValue('');
      setDealDescription('');
      
      await loadDesigns();
    } catch (error: any) {
      // Error saving design
      setSaveMessage(`Error saving design: ${error.message || 'Please check console for details'}`);
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDesign = async (id: string) => {
    if (!confirm('Are you sure you want to delete this design?')) return;

    try {
      await deleteDesignApi('deck', id);
      await loadDesigns();
    } catch (error) {
      // Error deleting design
      setSaveMessage('Error deleting design. Please try again.');
    }
  };

  const exportDesign = (design: SavedDesign) => {
    const result = exportPlannerDesign(design, 'deck', exportFormat, exportTemplates, customTemplateId);
    if (!result.ok && result.error) {
      setSaveMessage(result.error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Save Current Design */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Save className="w-4 h-4" />
            Save Current Design
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="saveName">Design Name *</Label>
            <Input
              id="saveName"
              placeholder="e.g., Johnson Residence - 14x18 Deck"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSaveDesign()}
            />
          </div>

          <div>
            <Label htmlFor="saveDescription">Description (Optional)</Label>
            <Textarea
              id="saveDescription"
              placeholder="Add notes about this design..."
              value={saveDescription}
              onChange={(e) => setSaveDescription(e.target.value)}
              rows={3}
            />
          </div>

          <CustomerSelector
            organizationId={user.organizationId}
            selectedCustomer={selectedCustomer}
            onCustomerSelect={setSelectedCustomer}
            userId={user.id}
          />
          
          {/* Option to create deal */}
          {selectedCustomer && (
            <div className="space-y-3">
              <div className="flex items-start space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Checkbox
                  id="createDeal"
                  checked={createDeal}
                  onCheckedChange={(checked) => setCreateDeal(checked as boolean)}
                />
                <div className="flex-1">
                  <Label 
                    htmlFor="createDeal" 
                    className="text-sm cursor-pointer text-blue-900"
                  >
                    <div className="flex items-center gap-2">
                      <Handshake className="w-4 h-4" />
                      <span className="font-medium">Also create a deal for {selectedCustomer.name}</span>
                    </div>
                  </Label>
                  <p className="text-xs text-blue-700 mt-1">
                    Creates an open deal (opportunity) linked to this customer that you can track in the pipeline
                  </p>
                </div>
              </div>

              {/* Deal details form - shown when createDeal is checked */}
              {createDeal && (
                <div className="ml-6 p-3 bg-blue-50/50 border border-blue-100 rounded-lg space-y-3">
                  <div>
                    <Label htmlFor="dealTitle" className="text-xs text-blue-800">Deal Title *</Label>
                    <Input
                      id="dealTitle"
                      placeholder="e.g., Deck Project - Smith Residence"
                      value={dealTitle}
                      onChange={(e) => setDealTitle(e.target.value)}
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="dealValue" className="text-xs text-blue-800">
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          Estimated Value
                        </span>
                      </Label>
                      <Input
                        id="dealValue"
                        type="number"
                        placeholder="0.00"
                        value={dealValue}
                        onChange={(e) => setDealValue(e.target.value)}
                        className="mt-1 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-blue-800">Status</Label>
                      <div className="mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm text-muted-foreground">
                        Open
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="dealDescription" className="text-xs text-blue-800">Deal Notes (Optional)</Label>
                    <Textarea
                      id="dealDescription"
                      placeholder="Additional deal notes..."
                      value={dealDescription}
                      onChange={(e) => setDealDescription(e.target.value)}
                      rows={2}
                      className="mt-1 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          
          {saveMessage && (
            <Alert className={saveMessage.includes('success') ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
              <AlertDescription className={saveMessage.includes('success') ? 'text-foreground' : 'text-foreground'}>
                {saveMessage}
              </AlertDescription>
            </Alert>
          )}
          
          <Button 
            onClick={handleSaveDesign} 
            className="w-full"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Save className="w-4 h-4 mr-2 animate-spin" />
                {createDeal ? 'Saving Design & Creating Deal...' : 'Saving Design...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {createDeal ? 'Save Design & Create Deal' : 'Save Design'}
              </>
            )}
          </Button>
          
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Designs are saved to your organization's database</p>
            <p>• Current: {currentConfig.width}' × {currentConfig.length}' {currentConfig.shape} deck</p>
            <p>• Estimated Cost: ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </CardContent>
      </Card>

      {/* Saved Designs List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4" />
            Saved Designs ({designs.length})
          </CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="space-y-2">
              <Label>Export Format</Label>
              <Select value={exportFormat} onValueChange={(value: 'csv' | 'xml' | 'custom') => setExportFormat(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select export format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="xml">XML</SelectItem>
                  <SelectItem value="custom">Custom Template</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {exportFormat === 'custom' && (
              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={customTemplateId} onValueChange={setCustomTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select custom template" />
                  </SelectTrigger>
                  <SelectContent>
                    {exportTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading designs...
            </div>
          ) : designs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No saved designs yet</p>
              <p className="text-sm mt-1">Save your first design above to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {designs.map((design) => (
                <div
                  key={design.id}
                  className="border border-border rounded-lg p-4 hover:border-purple-300 hover:bg-purple-50/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">{design.name}</h3>
                      {design.description && (
                        <p className="text-sm text-muted-foreground mt-1">{design.description}</p>
                      )}
                      <div className="text-sm text-muted-foreground mt-2">
                        {design.config.width}' × {design.config.length}' • {design.config.shape} shape
                        {design.config.hasStairs && ' • w/Stairs'}
                      </div>
                      {design.customer_name && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-foreground">
                          <User className="w-3 h-3" />
                          <span>{design.customer_name}</span>
                          {design.customer_company && (
                            <span className="text-muted-foreground">({design.customer_company})</span>
                          )}
                          <span className="text-foreground ml-2">
                            {design.price_tier.toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Saved {new Date(design.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="text-foreground">${design.total_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => onLoadDesign(design.config, {
                        name: design.name,
                        description: design.description,
                        customerName: design.customer_name,
                        customerCompany: design.customer_company,
                      })}
                    >
                      Load Design
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exportDesign(design)}
                      disabled={exportFormat === 'custom' && !customTemplateId}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => handleDeleteDesign(design.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}