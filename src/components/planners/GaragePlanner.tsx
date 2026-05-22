import React, { useState, useEffect } from 'react';
import { GarageConfigurator } from '../garage/GarageConfigurator';
import { GarageCanvas } from '../garage/GarageCanvas';
import { Garage3DRenderer } from '../garage/Garage3DRenderer';
import { GarageMaterialsList } from '../garage/GarageMaterialsList';
import { GarageTemplates } from '../garage/GarageTemplates';
import { SavedGarageDesigns } from '../garage/SavedGarageDesigns';
import { PrintableGarageDesign } from '../project-wizard/PrintableGarageDesign';
import { PlannerDefaults } from '../PlannerDefaults';
import { ProjectQuoteGenerator } from '../ProjectQuoteGenerator';
import { SavedProjectDesigns } from '../SavedProjectDesigns';
import { calculateMaterials } from '../../utils/garageCalculations';
import { enrichMaterialsWithT1Pricing } from '../../utils/enrichMaterialsWithPricing';
import { getUserDefaults, extractConversionFactors, getOrgConversionFactors, extractOrgConversionFactors } from '../../utils/project-wizard-defaults-client';
import { GarageConfig } from '../../types/garage';
import { Ruler, Package, Printer, FileText, Box, Layers, Warehouse, Settings, LayoutTemplate, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner@2.0.3';
import type { User } from '../../App';
import { PermissionGate } from '../PermissionGate';
import { PlannerWorkflowHelp } from './PlannerWorkflowHelp';
import { PlannerExportDialog } from './PlannerExportDialog';

interface GaragePlannerProps {
  user: User;
}

export function GaragePlanner({ user }: GaragePlannerProps) {
  const [config, setConfig] = useState<GarageConfig>({
    width: 20,
    length: 20,
    height: 9,
    bays: 2,
    roofStyle: 'gable',
    roofPitch: 6,
    wallFraming: '2x4',
    doors: [
      {
        id: '1',
        type: 'overhead',
        width: 9,
        height: 7,
        position: 'front',
        offsetFromLeft: 1,
      },
      {
        id: '2',
        type: 'overhead',
        width: 9,
        height: 7,
        position: 'front',
        offsetFromLeft: 10,
      },
    ],
    windows: [
      {
        id: '1',
        width: 3,
        height: 2,
        position: 'left',
        offsetFromLeft: 8,
        offsetFromFloor: 5,
      },
      {
        id: '2',
        width: 3,
        height: 2,
        position: 'right',
        offsetFromLeft: 8,
        offsetFromFloor: 5,
      },
    ],
    hasWalkDoor: true,
    walkDoorPosition: 'side',
    sidingType: 'vinyl',
    roofingMaterial: 'asphalt-shingle',
    hasAtticTrusses: false,
    isInsulated: true,
    hasElectrical: true,
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

  const pricingMaterialType = config.sidingType === 'metal'
    ? 'aluminum'
    : (config.sidingType === 'vinyl' || config.sidingType === 'wood' || config.sidingType === 'fiber-cement')
      ? config.sidingType
      : undefined;

  const materials = calculateMaterials(config);

  // Flatten materials for quote generator
  const flatMaterials = [
    ...materials.foundation,
    ...materials.framing,
    ...materials.roofing,
    ...materials.siding,
    ...materials.doors,
    ...materials.windows,
    ...(materials.insulation || []),
    ...(materials.electrical || []),
  ];

  // Auto-sync garage doors with bay count
  useEffect(() => {
    const expectedDoorCount = config.bays;
    const currentDoorCount = config.doors.length;
    
    if (currentDoorCount !== expectedDoorCount) {
      const newDoors = [];
      const doorWidth = config.bays === 1 ? 9 : config.bays === 2 ? 9 : 9;
      const doorHeight = 7;
      const spacing = config.width / config.bays;
      
      for (let i = 0; i < config.bays; i++) {
        newDoors.push({
          id: `${i + 1}`,
          type: 'overhead' as const,
          width: doorWidth,
          height: doorHeight,
          position: 'front' as const,
          offsetFromLeft: i * spacing + (spacing - doorWidth) / 2,
        });
      }
      
      setConfig(prev => ({ ...prev, doors: newDoors }));
    }
  }, [config.bays, config.width]);

  // Enrich materials with T1 pricing whenever config changes
  useEffect(() => {
    const enrichMaterials = async () => {
      if (user.organizationId && flatMaterials.length > 0) {
        let cfMap: Record<string, number> = {};
        try {
          // Start with org-level CFs as baseline
          const orgCFs = await getOrgConversionFactors(user.organizationId);
          cfMap = extractOrgConversionFactors(orgCFs, 'garage', pricingMaterialType);

          // Overlay user-level CFs (user overrides take priority per-category)
          const userDefs = await getUserDefaults(user.id, user.organizationId);
          const userCFMap = extractConversionFactors(userDefs, 'garage', pricingMaterialType);
          cfMap = { ...cfMap, ...userCFMap };
        } catch (err) {
          // Could not load conversion factors
        }

        const { materials: enriched, totalT1Price: total } = await enrichMaterialsWithT1Pricing(
          flatMaterials,
          user.organizationId,
          'garage',
          pricingMaterialType,
          cfMap,
          user.id
        );
        setEnrichedMaterials(enriched);
        setTotalT1Price(total);
      }
    };
    enrichMaterials();
  }, [config, user.organizationId, defaultsVersion, pricingMaterialType, user.id]);

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
      foundation: materials.foundation.map(item => enrichedMap.get(item.description) || item),
      framing: materials.framing.map(item => enrichedMap.get(item.description) || item),
      roofing: materials.roofing.map(item => enrichedMap.get(item.description) || item),
      siding: materials.siding.map(item => enrichedMap.get(item.description) || item),
      doors: materials.doors.map(item => enrichedMap.get(item.description) || item),
      windows: materials.windows.map(item => enrichedMap.get(item.description) || item),
      insulation: (materials.insulation || []).map(item => enrichedMap.get(item.description) || item),
      electrical: (materials.electrical || []).map(item => enrichedMap.get(item.description) || item),
    };
  };

  const handleLoadTemplate = (templateConfig: GarageConfig) => {
    setConfig(templateConfig);
    setLoadedDesignInfo({}); // Clear loaded design info when loading a template
    setActiveTab('design');
  };

  const handleLoadDesign = (loadedConfig: GarageConfig, designInfo?: {
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
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Ruler className="w-4 h-4" />
                Design
              </button>
              <button
                onClick={() => setActiveTab('templates')}
                className={`flex items-center gap-2 py-3 sm:py-4 border-b-2 transition-colors text-sm sm:text-base ${
                  activeTab === 'templates'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutTemplate className="w-4 h-4" />
                Templates
              </button>
              <button
                onClick={() => setActiveTab('materials')}
                className={`flex items-center gap-2 py-3 sm:py-4 border-b-2 transition-colors text-sm sm:text-base ${
                  activeTab === 'materials'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Package className="w-4 h-4" />
                Materials
              </button>
              <button
                onClick={() => setActiveTab('saved')}
                className={`flex items-center gap-2 py-3 sm:py-4 border-b-2 transition-colors text-sm sm:text-base ${
                  activeTab === 'saved'
                    ? 'border-blue-600 text-blue-600'
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
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Settings className="w-4 h-4" />
                Defaults
              </button>
            </nav>
            <div className="flex items-center gap-2">
              <PlannerWorkflowHelp
                plannerType="garage"
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
        {activeTab === 'templates' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <GarageTemplates onLoadTemplate={handleLoadTemplate} currentConfig={config} />
          </div>
        )}

        {activeTab === 'design' && (
          <div className="flex flex-col lg:flex-row gap-6 lg:items-start">
            {isSidebarOpen && (
              <div className="w-full lg:w-1/3 shrink-0 space-y-6 print:hidden lg:h-[calc(100vh-200px)] lg:overflow-y-auto lg:pr-4">
                <GarageConfigurator config={config} onChange={setConfig} />
              </div>
            )}

            <div className="flex-1 min-w-0 space-y-6 print:hidden lg:sticky lg:top-24">
              <div className="bg-background rounded-lg shadow-sm border border-border p-6 print:shadow-none print:border-2 print:border-black">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                      className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors print:hidden"
                      title={isSidebarOpen ? "Collapse configurator" : "Expand configurator"}
                    >
                      {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
                    </button>
                    <h2 className="text-foreground print:hidden m-0">Garage Plan & Elevation</h2>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewMode('2d')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm ${
                        viewMode === '2d'
                          ? 'bg-blue-600 text-white'
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
                          ? 'bg-blue-600 text-white'
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
                    <GarageCanvas config={config} onChange={setConfig} />
                  ) : (
                    <div className="h-[500px]">
                      <Garage3DRenderer config={config} />
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-background rounded-lg shadow-sm border border-border p-6 print:shadow-none print:border-2 print:border-black print:break-before-page">
                <h2 className="text-foreground mb-4">Materials Summary</h2>
                <GarageMaterialsList materials={materials} compact />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'materials' && (
          <div className="space-y-6">
            <div className="bg-background rounded-lg shadow-sm border border-border p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                {enrichedMaterials.length > 0 && totalT1Price > 0 ? (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex-1 w-full sm:w-auto">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-700">Total Estimated Cost (Tier 1 Pricing)</p>
                        <p className="text-xs text-blue-600 mt-1">Based on your organization's default pricing</p>
                      </div>
                      <p className="text-2xl font-semibold text-blue-900">${totalT1Price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                ) : <div className="flex-1"></div>}
                
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <PlannerExportDialog
                    organizationId={user.organizationId || user.organization_id || ''}
                    projectType="garage"
                    materials={enrichedMaterials.length > 0 ? enrichedMaterials : flatMaterials}
                    totalCost={totalT1Price}
                    defaultDesignName="garage-design"
                  />
                  <ProjectQuoteGenerator 
                    user={user}
                    projectType="garage"
                    materials={enrichedMaterials.length > 0 ? enrichedMaterials : flatMaterials}
                    totalCost={totalT1Price}
                    projectData={config}
                  />
                </div>
              </div>

              <div className="mt-8 border-t pt-8">
                <SavedProjectDesigns
                  user={user}
                  projectType="garage"
                  currentConfig={config}
                  materials={enrichedMaterials.length > 0 ? enrichedMaterials : flatMaterials}
                  totalCost={totalT1Price}
                  onLoadDesign={(savedConfig) => setConfig(savedConfig)}
                />
              </div>

              <GarageMaterialsList 
                materials={getEnrichedMaterialsStructure()} 
                compact={false} 
              />
            </div>
          </div>
        )}

        {activeTab === 'saved' && (
          <SavedGarageDesigns 
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
            plannerType="garage"
            materialTypes={['vinyl', 'wood', 'fiber-cement', 'aluminum']}
            initialMaterialType={pricingMaterialType || 'vinyl'}
            onDefaultsSaved={() => setDefaultsVersion(v => v + 1)}
          />
        )}
      </div>

      {/* Printable Design View */}
      <PrintableGarageDesign
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