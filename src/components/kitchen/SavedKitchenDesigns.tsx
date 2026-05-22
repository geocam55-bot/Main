import React, { useState, useEffect } from 'react';
import { createClient } from '../../utils/supabase/client';
import { KitchenConfig } from '../../types/kitchen';
import { CustomerSelector } from '../project-wizard/CustomerSelector';
import { OpportunitySelector } from '../project-wizard/OpportunitySelector';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { FileText, Trash2, Download, Save, User } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import type { User as AppUser } from '../../App';
import type { CustomExportTemplate } from '../../utils/export-engine';
import { exportPlannerDesign } from '../../utils/planner-export';
import { loadPlannerExportTemplates } from '../../utils/planner-export-templates';

interface SavedKitchenDesignsProps {
  user: AppUser;
  currentConfig: KitchenConfig;
  materials?: any[];
  totalCost?: number;
  onLoadDesign: (config: KitchenConfig, designInfo?: {
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
  config: KitchenConfig;
  customer_id: string | null;
  customer_name: string | null;
  customer_company: string | null;
  price_tier: string;
  total_cost: number;
  materials: any[];
  created_at: string;
  updated_at: string;
}

export function SavedKitchenDesigns({ 
  user,
  currentConfig, 
  materials = [],
  totalCost = 0,
  onLoadDesign 
}: SavedKitchenDesignsProps) {
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'xml' | 'custom'>('csv');
  const [customTemplateId, setCustomTemplateId] = useState('');
  const [exportTemplates, setExportTemplates] = useState<CustomExportTemplate[]>([]);

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
    
    try {
      // Use kv_store with prefix pattern for kitchen designs
      const prefix = `kitchen_design:${user.organizationId}:`;
      const { data, error } = await createClient()
        .from('kv_store_8405be07')
        .select('key, value')
        .like('key', `${prefix}%`)
        .order('value->created_at', { ascending: false });

      if (error) {
        // Error loading designs
        throw error;
      }

      // Parse the designs from kv store
      const loadedDesigns = (data || []).map(item => ({
        id: item.key.split(':')[2], // Extract ID from key
        ...item.value
      })) as SavedDesign[];

      setDesigns(loadedDesigns);
    } catch (error) {
      // Error loading saved designs
      setSaveMessage('Error loading designs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const saveDesign = async () => {
    if (!saveName.trim()) {
      setSaveMessage('Please enter a name for your design');
      return;
    }

    setIsSaving(true);
    try {
      const designId = crypto.randomUUID();
      const key = `kitchen_design:${user.organizationId}:${designId}`;
      
      const designData = {
        id: designId,
        organization_id: user.organizationId,
        user_id: user.id,
        customer_id: selectedCustomer?.id || null,
        customer_name: selectedCustomer?.name || null,
        customer_company: selectedCustomer?.company || null,
        opportunity_id: selectedOpportunityId,
        name: saveName.trim(),
        description: saveDescription.trim() || null,
        config: currentConfig,
        price_tier: selectedCustomer?.price_level || 't1',
        total_cost: totalCost,
        materials: materials,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await createClient()
        .from('kv_store_8405be07')
        .insert({
          key: key,
          value: designData
        });

      if (error) {
        // Supabase error details
        throw new Error(`Database error: ${error.message}`);
      }

      setSaveName('');
      setSaveDescription('');
      setSelectedCustomer(null);
      setSelectedOpportunityId(null);
      setSaveMessage('Design saved successfully to database!');
      setTimeout(() => setSaveMessage(''), 3000);
      
      await loadDesigns();
    } catch (error: any) {
      // Error saving design
      setSaveMessage(`Error saving design: ${error.message || 'Please check console for details'}`);
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteDesign = async (id: string) => {
    if (!confirm('Are you sure you want to delete this design?')) return;

    try {
      const key = `kitchen_design:${user.organizationId}:${id}`;
      const { error } = await createClient()
        .from('kv_store_8405be07')
        .delete()
        .eq('key', key);

      if (error) throw error;

      await loadDesigns();
    } catch (error) {
      // Error deleting design
      setSaveMessage('Error deleting design. Please try again.');
    }
  };

  const exportDesign = (design: SavedDesign) => {
    const result = exportPlannerDesign(design, 'kitchen', exportFormat, exportTemplates, customTemplateId);
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
              placeholder="e.g., Modern White Kitchen - Johnson Home"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && saveDesign()}
            />
          </div>

          <div>
            <Label htmlFor="saveDescription">Description (Optional)</Label>
            <Textarea
              id="saveDescription"
              placeholder="Add notes about this kitchen design..."
              value={saveDescription}
              onChange={(e) => setSaveDescription(e.target.value)}
              rows={3}
            />
          </div>

          <CustomerSelector
            organizationId={user.organizationId}
            selectedCustomer={selectedCustomer}
            onCustomerSelect={setSelectedCustomer}
          />

          <OpportunitySelector
            organizationId={user.organizationId}
            customerId={selectedCustomer?.id || null}
            selectedOpportunityId={selectedOpportunityId}
            onOpportunitySelect={setSelectedOpportunityId}
          />
          
          {saveMessage && (
            <Alert className={saveMessage.includes('success') ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
              <AlertDescription className={saveMessage.includes('success') ? 'text-green-800' : 'text-yellow-800'}>
                {saveMessage}
              </AlertDescription>
            </Alert>
          )}
          
          <Button 
            onClick={saveDesign} 
            className="w-full"
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Design'}
          </Button>
          
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Designs are saved to your organization's database</p>
            <p>• Current: {currentConfig.roomWidth}' × {currentConfig.roomLength}' - {currentConfig.layoutStyle} layout</p>
            <p>• Cabinets: {currentConfig.cabinets.length}</p>
            {totalCost > 0 && <p>• Estimated Cost: ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>}
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
                  className="border border-border rounded-lg p-4 hover:border-red-300 hover:bg-red-50/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">{design.name}</h3>
                      {design.description && (
                        <p className="text-sm text-muted-foreground mt-1">{design.description}</p>
                      )}
                      <div className="text-sm text-muted-foreground mt-2">
                        {design.config.roomWidth}' × {design.config.roomLength}' • {design.config.layoutStyle} layout • {design.config.cabinets.length} cabinets
                      </div>
                      {design.customer_name && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-foreground">
                          <User className="w-3 h-3" />
                          <span>{design.customer_name}</span>
                          {design.customer_company && (
                            <span className="text-muted-foreground">({design.customer_company})</span>
                          )}
                          <span className="text-red-600 ml-2">
                            {design.price_tier.toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Saved {new Date(design.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="text-red-600">${design.total_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                      onClick={() => deleteDesign(design.id)}
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