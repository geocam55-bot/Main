import React, { useState, useEffect } from 'react';
import { RoofConfig, MaterialItem } from '../../types/roof';
import { createClient } from '../../utils/supabase/client';
import { listDesigns, saveDesign as saveDesignApi, deleteDesign as deleteDesignApi } from '../../utils/designs-client';
import { CustomerSelector } from '../project-wizard/CustomerSelector';
import { OpportunitySelector } from '../project-wizard/OpportunitySelector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Save, Trash2, Download, FileText, AlertCircle, User } from 'lucide-react';
import type { User as AppUser } from '../../App';
import type { CustomExportTemplate } from '../../utils/export-engine';
import { exportPlannerDesign } from '../../utils/planner-export';
import { loadPlannerExportTemplates } from '../../utils/planner-export-templates';

interface SavedRoofDesignsProps {
  user: AppUser;
  currentConfig: RoofConfig;
  materials: MaterialItem[];
  totalCost: number;
  onLoadDesign: (config: RoofConfig, info?: { name?: string; description?: string; customerName?: string; customerCompany?: string }) => void;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  price_level: string;
}

export function SavedRoofDesigns({ user, currentConfig, materials, totalCost, onLoadDesign }: SavedRoofDesignsProps) {
  const [savedDesigns, setSavedDesigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [designName, setDesignName] = useState('');
  const [designDescription, setDesignDescription] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');
  const [exportFormat, setExportFormat] = useState<'csv' | 'xml' | 'custom'>('csv');
  const [customTemplateId, setCustomTemplateId] = useState('');
  const [exportTemplates, setExportTemplates] = useState<CustomExportTemplate[]>([]);

  useEffect(() => {
    loadSavedDesigns();
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

  const loadSavedDesigns = async () => {
    try {
      setIsLoading(true);
      const data = await listDesigns('roof');
      setSavedDesigns(data);
    } catch (error) {
      // Error loading saved designs
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDesign = async () => {
    if (!designName.trim()) {
      setSaveError('Please enter a design name');
      return;
    }

    try {
      setIsSaving(true);
      setSaveError('');

      await saveDesignApi('roof', {
        name: designName,
        description: designDescription,
        customer_id: selectedCustomer?.id || null,
        config: currentConfig,
        total_cost: totalCost,
        materials: materials,
        price_tier: selectedCustomer?.price_level || 't1',
      });

      // Reset form and reload designs
      setDesignName('');
      setDesignDescription('');
      setSelectedCustomer(null);
      setSelectedOpportunityId(null);
      setShowSaveDialog(false);
      await loadSavedDesigns();
    } catch (error) {
      // Error saving design
      setSaveError('Failed to save design. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDesign = async (id: string) => {
    if (!confirm('Are you sure you want to delete this design?')) return;

    try {
      await deleteDesignApi('roof', id);
      await loadSavedDesigns();
    } catch (error) {
      // Error deleting design
    }
  };

  const handleLoadDesign = (design: any) => {
    onLoadDesign(design.config, {
      name: design.name,
      description: design.description,
      customerName: design.customer_name,
      customerCompany: design.customer_company,
    });
  };

  const handleExportDesign = (design: any) => {
    const result = exportPlannerDesign(design, 'roof', exportFormat, exportTemplates, customTemplateId);
    if (!result.ok && result.error) {
      setSaveError(result.error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Save Current Design */}
      <div className="bg-background rounded-lg shadow-sm border border-border p-6">
        <h2 className="text-foreground mb-4">Save Current Design</h2>
        
        {!showSaveDialog ? (
          <button
            onClick={() => setShowSaveDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save This Design
          </button>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-foreground text-sm mb-1">
                Design Name *
              </label>
              <input
                type="text"
                value={designName}
                onChange={(e) => setDesignName(e.target.value)}
                placeholder="e.g., Smith Residence Roof"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-foreground text-sm mb-1">
                Description
              </label>
              <textarea
                value={designDescription}
                onChange={(e) => setDesignDescription(e.target.value)}
                placeholder="Add notes about this design..."
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-foreground text-sm mb-1">
                  Customer Name
                </label>
                <CustomerSelector
                  organizationId={user.organizationId}
                  selectedCustomer={selectedCustomer}
                  onCustomerSelect={setSelectedCustomer}
                />
              </div>
              <div>
                <label className="block text-foreground text-sm mb-1">
                  Opportunity
                </label>
                <OpportunitySelector
                  organizationId={user.organizationId}
                  customerId={selectedCustomer?.id || null}
                  selectedOpportunityId={selectedOpportunityId}
                  onOpportunitySelect={setSelectedOpportunityId}
                />
              </div>
            </div>

            {saveError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle className="w-4 h-4" />
                {saveError}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSaveDesign}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Design'}
              </button>
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setSaveError('');
                }}
                className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Saved Designs List */}
      <div className="bg-background rounded-lg shadow-sm border border-border p-6">
        <h2 className="text-foreground mb-4">Saved Designs</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div className="space-y-2">
            <label className="block text-foreground text-sm">Export Format</label>
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
              <label className="block text-foreground text-sm">Template</label>
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

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading saved designs...
          </div>
        ) : savedDesigns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p>No saved designs yet</p>
            <p className="text-sm mt-1">Save your first roof design to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedDesigns.map((design) => (
              <div
                key={design.id}
                className="p-4 border-2 border-border rounded-lg hover:border-orange-400 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {design.name}
                    </h3>
                    {design.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {design.description}
                      </p>
                    )}
                    {design.customer_name && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Customer: {design.customer_name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground space-y-1 mb-3">
                  <div>
                    {design.config.length}' × {design.config.width}' • {design.config.style} roof
                  </div>
                  <div>
                    {design.config.pitch} pitch • {design.config.shingleType}
                  </div>
                  {design.total_cost > 0 && (
                    <div className="font-semibold text-orange-600">
                      Est. Cost: ${design.total_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  )}
                  <div>
                    Saved: {new Date(design.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleLoadDesign(design)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Load
                  </button>
                  <button
                    onClick={() => handleExportDesign(design)}
                    disabled={exportFormat === 'custom' && !customTemplateId}
                    className="flex items-center justify-center gap-2 px-3 py-2 border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors text-sm disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4" />
                    Export
                  </button>
                  <button
                    onClick={() => handleDeleteDesign(design.id)}
                    className="flex items-center justify-center gap-2 px-3 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}