import React, { useState, useEffect } from 'react';
import { RoofConfigurator } from '../roof/RoofConfigurator';
import { RoofCanvas } from '../roof/RoofCanvas';
import { Roof3DRenderer } from '../roof/Roof3DRenderer';
import { RoofMaterialsList } from '../roof/RoofMaterialsList';
import { RoofTemplates } from '../roof/RoofTemplates';
import { SavedRoofDesigns } from '../roof/SavedRoofDesigns';
import { DiagnosticPanel } from '../DiagnosticPanel';
import { PrintableRoofDesign } from '../project-wizard/PrintableRoofDesign';
import { PlannerDefaults } from '../PlannerDefaults';
import { ProjectQuoteGenerator } from '../ProjectQuoteGenerator';
import { SavedProjectDesigns } from '../SavedProjectDesigns';
import { calculateMaterials } from '../../utils/roofCalculations';
import { enrichMaterialsWithT1Pricing } from '../../utils/enrichMaterialsWithPricing';
import { getUserDefaults, extractConversionFactors, getOrgConversionFactors, extractOrgConversionFactors } from '../../utils/project-wizard-defaults-client';
import { RoofConfig } from '../../types/roof';
import { Ruler, Package, Printer, FileText, Box, Layers, Triangle, Settings, PanelLeftOpen, PanelLeftClose, LayoutTemplate } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner@2.0.3';
import type { User } from '../../App';
import { PermissionGate } from '../PermissionGate';
import { PlannerWorkflowHelp } from './PlannerWorkflowHelp';
import { PlannerExportDialog } from './PlannerExportDialog';

interface RoofPlannerProps {
  user: User;
}

export function RoofPlanner({ user }: RoofPlannerProps) {
  const [config, setConfig] = useState<RoofConfig>({
    length: 40,
    width: 30,
    style: 'gable',
    pitch: '6/12',
    eaveOverhang: 1.5,
    rakeOverhang: 1.5,
    shingleType: 'architectural',
    underlaymentType: 'synthetic',
    hasValleys: false,
    valleyCount: 0,
    hasSkylight: false,
    skylightCount: 0,
    hasChimney: false,
    chimneyCount: 0,
    hasDormers: false,
    dormers: [],
    wasteFactor: 0.10,
    unit: 'feet',
  });

  const [activeTab, setActiveTab] = useState<'design' | 'materials' | 'templates' | 'saved' | 'defaults'>('design');
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [enrichedMaterials, setEnrichedMaterials] = useState<any[]>([]);
  const [totalT1Price, setTotalT1Price] = useState<number>(0);
  const [defaultsVersion, setDefaultsVersion] = useState(0);
  const [loadedDesignInfo, setLoadedDesignInfo] = useState<{
    name?: string;
    description?: string;
    customerName?: string;
    customerCompany?: string;
  }>({});

  const materials = calculateMaterials(config);

  // Flatten materials for quote generator
  const flatMaterials = [
    ...materials.roofDeck,
    ...materials.underlayment,
    ...materials.shingles,
    ...materials.ridgeAndHip,
    ...materials.flashing,
    ...materials.ventilation,
    ...materials.hardware,
  ];

  // Enrich materials with T1 pricing whenever config changes
  useEffect(() => {
    const enrichMaterials = async () => {
      if (user.organizationId && flatMaterials.length > 0) {
        let cfMap: Record<string, number> = {};
        try {
          // Start with org-level CFs as baseline
          const orgCFs = await getOrgConversionFactors(user.organizationId);
          cfMap = extractOrgConversionFactors(orgCFs, 'roof', config.shingleType);

          // Overlay user-level CFs (user overrides take priority per-category)
          const userDefs = await getUserDefaults(user.id, user.organizationId);
          const userCFMap = extractConversionFactors(userDefs, 'roof', config.shingleType);
          cfMap = { ...cfMap, ...userCFMap };
        } catch (err) {
          // Could not load conversion factors
        }

        const { materials: enriched, totalT1Price: total } = await enrichMaterialsWithT1Pricing(
          flatMaterials,
          user.organizationId,
          'roof',
          config.shingleType,
          cfMap,
          user.id
        );
        setEnrichedMaterials(enriched);
        setTotalT1Price(total);
      }
    };
    enrichMaterials();
  }, [config, user.organizationId, defaultsVersion]);

  // Create enriched materials structure for display
  const getEnrichedMaterialsStructure = () => {
    if (enrichedMaterials.length === 0) {
      return materials;
    }

    // Create a map of enriched materials by description for quick lookup
    const enrichedMap = new Map();
    enrichedMaterials.forEach(item => {
      enrichedMap.set(item.description, item);
    });

    // Merge pricing data into original structure
    return {
      roofDeck: materials.roofDeck.map(item => enrichedMap.get(item.description) || item),
      underlayment: materials.underlayment.map(item => enrichedMap.get(item.description) || item),
      shingles: materials.shingles.map(item => enrichedMap.get(item.description) || item),
      ridgeAndHip: materials.ridgeAndHip.map(item => enrichedMap.get(item.description) || item),
      flashing: materials.flashing.map(item => enrichedMap.get(item.description) || item),
      ventilation: materials.ventilation.map(item => enrichedMap.get(item.description) || item),
      hardware: materials.hardware.map(item => enrichedMap.get(item.description) || item),
    };
  };

  const handleLoadTemplate = (templateConfig: RoofConfig) => {
    setConfig(templateConfig);
    setLoadedDesignInfo({}); // Clear loaded design info when loading a template
    setActiveTab('design');
  };

  const handleLoadDesign = (loadedConfig: RoofConfig, designInfo?: {
    name?: string;
    description?: string;
    customerName?: string;
    customerCompany?: string;
  }) => {
    setConfig(loadedConfig);
    setLoadedDesignInfo(designInfo || {});
    setActiveTab('design');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <PermissionGate user={user} module="project-wizards" action="view">
    <div>
      {/* Sub-navigation */}
      <div className="bg-muted border-b border-border print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <nav className="flex flex-wrap gap-4 sm:gap-8">
              <button
                onClick={() => setActiveTab('design')}
                className={`flex items-center gap-2 py-3 sm:py-4 border-b-2 transition-colors text-sm sm:text-base ${
                  activeTab === 'design'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Ruler className="w-4 h-4" />
                Design
              </button>
              <button
                onClick={() => setActiveTab('materials')}
                className={`flex items-center gap-2 py-3 sm:py-4 border-b-2 transition-colors text-sm sm:text-base ${
                  activeTab === 'materials'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Package className="w-4 h-4" />
                Materials
              </button>
              <button
                onClick={() => setActiveTab('templates')}
                className={`flex items-center gap-2 py-3 sm:py-4 border-b-2 transition-colors text-sm sm:text-base ${
                  activeTab === 'templates'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutTemplate className="w-4 h-4" />
                Templates
              </button>
              <button
                onClick={() => setActiveTab('saved')}
                className={`flex items-center gap-2 py-3 sm:py-4 border-b-2 transition-colors text-sm sm:text-base ${
                  activeTab === 'saved'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileText className="w-4 h-4" />
                Saved Designs
              </button>
              <button
                onClick={() => setActiveTab('defaults')}
                className={`flex items-center gap-2 py-3 sm:py-4 border-b-2 transition-colors text-sm sm:text-base ${
                  activeTab === 'defaults'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Settings className="w-4 h-4" />
                Defaults
              </button>
            </nav>
            <div className="flex items-center gap-2">
              <PlannerWorkflowHelp
                plannerType="roof"
                userId={user.id}
                onOpenDesign={() => setActiveTab('design')}
                onOpenMaterials={() => setActiveTab('materials')}
                onOpenTemplates={() => setActiveTab('templates')}
                onOpenSaved={() => setActiveTab('saved')}
                onOpenDefaults={() => setActiveTab('defaults')}
                onSwitch2D={() => setViewMode('2d')}
                onSwitch3D={() => setViewMode('3d')}
                onPrint={handlePrint}
              />
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm sm:text-base"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print Plan</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={`mx-auto px-4 sm:px-6 lg:px-8 py-8 ${isSidebarOpen ? 'max-w-7xl' : 'max-w-[1600px] transition-all duration-300'}`}>
        {activeTab === 'design' && (
          <div className="flex flex-col lg:flex-row gap-6">
            {isSidebarOpen && (
              <div className="w-full lg:w-1/3 shrink-0 space-y-6 print:hidden lg:h-[calc(100vh-200px)] flex flex-col lg:pr-4">
                <RoofConfigurator config={config} onChange={setConfig} />
              </div>
            )}

            <div className={`w-full ${isSidebarOpen ? 'lg:w-2/3' : ''} space-y-6 print:hidden`}>
              <div className="bg-background rounded-lg shadow-sm border border-border p-4 sm:p-6 print:p-0 print:border-none print:shadow-none">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4 print:hidden">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                      className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors print:hidden"
                      title={isSidebarOpen ? "Collapse configurator" : "Expand configurator"}
                    >
                      {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
                    </button>
                    <h2 className="text-lg font-semibold text-foreground">Roof Plan & Elevation</h2>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewMode('2d')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm ${
                        viewMode === '2d'
                          ? 'bg-red-600 text-white'
                          : 'bg-muted text-foreground hover:bg-muted'
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                      2D
                    </button>
                    <button
                      onClick={() => setViewMode('3d')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm ${
                        viewMode === '3d'
                          ? 'bg-red-600 text-white'
                          : 'bg-muted text-foreground hover:bg-muted'
                      }`}
                    >
                      <Box className="w-4 h-4" />
                      3D
                    </button>
                  </div>
                </div>
                <div>
                  {viewMode === '2d' ? (
                    <RoofCanvas config={config} onChange={setConfig} />
                  ) : (
                    <div className="h-[600px] w-full">
                      <Roof3DRenderer config={config} />
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-background rounded-lg shadow-sm border border-border p-6 print:shadow-none print:border-2 print:border-black print:break-before-page">
                <h2 className="text-foreground mb-4">Materials Summary</h2>
                <RoofMaterialsList materials={materials} compact />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'materials' && (
          <div className="space-y-6">
            <div className="bg-background rounded-lg shadow-sm border border-border p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                {enrichedMaterials.length > 0 && totalT1Price > 0 ? (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex-1 w-full sm:w-auto">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-orange-700">Total Estimated Cost (Tier 1 Pricing)</p>
                        <p className="text-xs text-orange-600 mt-1">Based on your organization's default pricing</p>
                      </div>
                      <p className="text-2xl font-semibold text-orange-900">${totalT1Price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                ) : <div className="flex-1"></div>}
                
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <PlannerExportDialog
                    organizationId={user.organizationId || user.organization_id || ''}
                    projectType="roof"
                    materials={enrichedMaterials.length > 0 ? enrichedMaterials : flatMaterials}
                    totalCost={totalT1Price}
                    defaultDesignName="roof-design"
                  />
                  <ProjectQuoteGenerator 
                    user={user}
                    projectType="roof"
                    materials={enrichedMaterials.length > 0 ? enrichedMaterials : flatMaterials}
                    totalCost={totalT1Price}
                    projectData={config}
                  />
                </div>
              </div>

              <div className="mt-8 border-t pt-8">
                <SavedProjectDesigns
                  user={user}
                  projectType="roof"
                  currentConfig={config}
                  materials={enrichedMaterials.length > 0 ? enrichedMaterials : flatMaterials}
                  totalCost={totalT1Price}
                  onLoadDesign={(savedConfig) => setConfig(savedConfig)}
                />
              </div>

              <RoofMaterialsList 
                materials={getEnrichedMaterialsStructure()} 
                compact={false} 
              />
            </div>
            
            <DiagnosticPanel 
              organizationId={user.organizationId || user.organization_id || ''}
              plannerType="roof"
              materialType={config.shingleType}
            />
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <RoofTemplates onLoadTemplate={handleLoadTemplate} currentConfig={config} />
          </div>
        )}

        {activeTab === 'saved' && (
          <SavedRoofDesigns 
            user={user}
            currentConfig={config}
            materials={enrichedMaterials.length > 0 ? enrichedMaterials : flatMaterials}
            totalCost={totalT1Price > 0 ? totalT1Price : 0}
            onLoadDesign={handleLoadDesign} 
          />
        )}

        {activeTab === 'defaults' && (
          <PlannerDefaults 
            organizationId={user.organizationId || user.organization_id || ''}
            userId={user.id}
            plannerType="roof"
            onDefaultsSaved={() => setDefaultsVersion(v => v + 1)}
          />
        )}
      </div>

      {/* Printable Design View */}
      <PrintableRoofDesign
        config={config}
        materials={getEnrichedMaterialsStructure()}
        totalCost={totalT1Price}
        designName={loadedDesignInfo.name}
        description={loadedDesignInfo.description}
        customerName={loadedDesignInfo.customerName}
        customerCompany={loadedDesignInfo.customerCompany}
      />
    </div>
    </PermissionGate>
  );
}