import React, { useState, useEffect, useRef } from 'react';
import { DeckConfigurator } from '../deck/DeckConfigurator';
import { DeckCanvas } from '../deck/DeckCanvas';
import { Deck3DRenderer, Deck3DRendererRef } from '../deck/Deck3DRenderer';
import { MaterialsList } from '../deck/MaterialsList';
import { DeckTemplates } from '../deck/DeckTemplates';
import { SavedDeckDesigns } from '../deck/SavedDeckDesigns';
import { DiagnosticPanel } from '../DiagnosticPanel';
import { PrintableDeckDesign } from '../project-wizard/PrintableDeckDesign';
import { PlannerDefaults } from '../PlannerDefaults';
import { ProjectQuoteGenerator } from '../ProjectQuoteGenerator';
import { SavedProjectDesigns } from '../SavedProjectDesigns';
import { calculateMaterials } from '../../utils/deckCalculations';
import { enrichMaterialsWithT1Pricing } from '../../utils/enrichMaterialsWithPricing';
import { getUserDefaults, extractConversionFactors, getOrgConversionFactors, extractOrgConversionFactors } from '../../utils/project-wizard-defaults-client';
import { DeckConfig } from '../../types/deck';
import { Ruler, Package, Printer, FileText, Box, Layers, Hammer, Settings, LayoutTemplate, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner@2.0.3';
import type { User } from '../../App';
import { PermissionGate } from '../PermissionGate';
import { PlannerWorkflowHelp } from './PlannerWorkflowHelp';
import { PlannerExportDialog } from './PlannerExportDialog';

interface DeckPlannerProps {
  user: User;
}

export function DeckPlanner({ user }: DeckPlannerProps) {
  const deck3DRendererRef = useRef<Deck3DRendererRef>(null);
  const orgId = user.organizationId || user.organization_id || '';
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [pricingContext, setPricingContext] = useState<{
    cfMap: Record<string, number>;
    mergedUserDefaults: Record<string, string>;
  }>({
    cfMap: {},
    mergedUserDefaults: {},
  });
  const draftDefaultsStorageKey = `planner_defaults_draft_${orgId}_${user.id}_deck`;

  const getDraftDefaults = (): Record<string, string> => {
    try {
      const raw = localStorage.getItem(draftDefaultsStorageKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  };
  
  const [config, setConfig] = useState<DeckConfig>({
    width: 12,
    length: 16,
    shape: 'rectangle',
    height: 2,
    hasStairs: true,
    stairSide: 'front',
    railingSides: ['front', 'left', 'right'],
    railingStyle: 'Treated',
    aluminumInfillType: 'Pickets',
    aluminumRailingColor: 'White',
    deckingPattern: 'perpendicular',
    joistSpacing: 16,
    deckingType: 'Treated',
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

  const pricingMaterialType = config.railingStyle === 'Aluminum'
    ? `aluminum-${(config.aluminumRailingColor || 'White').toLowerCase()}`
    : config.deckingType.toLowerCase();
  const defaultsUiMaterialType = config.deckingType.toLowerCase();

  const materials = calculateMaterials(config);

  // Flatten materials for quote generator
  const flatMaterials = [
    ...materials.framing,
    ...materials.decking,
    ...materials.railing,
    ...materials.hardware,
  ];

  // Load defaults and conversion factors when defaults/material type context changes,
  // not on every dimension tweak.
  useEffect(() => {
    let cancelled = false;

    const loadPricingContext = async () => {
      const draftUserDefs = getDraftDefaults();
      let mergedUserDefs: Record<string, string> = draftUserDefs;
      let cfMap: Record<string, number> = {};

      try {
        const orgCFs = await getOrgConversionFactors(orgId);
        cfMap = extractOrgConversionFactors(orgCFs, 'deck', pricingMaterialType);
      } catch {
        // Best-effort: continue with user-level/default CFs.
      }

      try {
        const persistedUserDefs = await getUserDefaults(user.id, orgId);
        mergedUserDefs = { ...persistedUserDefs, ...draftUserDefs };
      } catch {
        // Best-effort: use draft/local values.
      }

      const userCFMap = extractConversionFactors(mergedUserDefs, 'deck', pricingMaterialType);
      cfMap = { ...cfMap, ...userCFMap };

      if (!cancelled) {
        setPricingContext({
          cfMap,
          mergedUserDefaults: mergedUserDefs,
        });
      }
    };

    loadPricingContext();
    return () => {
      cancelled = true;
    };
  }, [
    orgId,
    user.id,
    config.deckingType,
    pricingMaterialType,
    defaultsVersion,
  ]);

  // Enrich materials with T1 pricing whenever config changes
  useEffect(() => {
    const enrichMaterials = async () => {
      if (orgId && flatMaterials.length > 0) {
        const { materials: enriched, totalT1Price: total } = await enrichMaterialsWithT1Pricing(
          flatMaterials,
          orgId,
          'deck',
          pricingMaterialType,
          pricingContext.cfMap,
          user.id,
          pricingContext.mergedUserDefaults
        );
        setEnrichedMaterials(enriched);
        setTotalT1Price(total);
      }
    };
    enrichMaterials();
  }, [
    config.width,
    config.length,
    config.height,
    config.shape,
    config.lShapeWidth,
    config.lShapeLength,
    config.lShapePosition,
    config.hasStairs,
    config.stairSide,
    config.stairWidth,
    config.railingSides,
    config.railingHeight,
    config.railingStyle,
    config.aluminumInfillType,
    config.aluminumRailingColor,
    config.joistSpacing,
    config.deckingType,
    pricingMaterialType,
    config.deckingPattern,
    orgId,
    user.id,
    flatMaterials.length,
    pricingContext.cfMap,
    pricingContext.mergedUserDefaults,
    defaultsVersion,
  ]);

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
      framing: materials.framing.map(item => enrichedMap.get(item.description) || item),
      decking: materials.decking.map(item => enrichedMap.get(item.description) || item),
      railing: materials.railing.map(item => enrichedMap.get(item.description) || item),
      hardware: materials.hardware.map(item => enrichedMap.get(item.description) || item),
    };
  };

  const handleLoadTemplate = (templateConfig: DeckConfig) => {
    setConfig(templateConfig);
    setLoadedDesignInfo({}); // Clear loaded design info when loading a template
    setActiveTab('design');
    toast.success('Template loaded successfully!');
  };

  const handleLoadDesign = (loadedConfig: DeckConfig, designInfo?: {
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
    // Ensure all pending async operations are complete before printing
    // This prevents the "callback is no longer runnable" error
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Poll for snapshot URL from 3D renderer
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (deck3DRendererRef.current && viewMode === '3d') {
        const url = deck3DRendererRef.current.getSnapshotUrl();
        if (url && url !== snapshotUrl) {
          setSnapshotUrl(url);
        }
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [viewMode, snapshotUrl]);

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
                    ? 'border-purple-600 text-purple-600'
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
                    ? 'border-purple-600 text-purple-600'
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
                    ? 'border-purple-600 text-purple-600'
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
                    ? 'border-purple-600 text-purple-600'
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
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Settings className="w-4 h-4" />
                Defaults
              </button>
            </nav>
            <div className="flex items-center gap-2">
              <PlannerWorkflowHelp
                plannerType="deck"
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
              <div className="w-full lg:w-1/3 shrink-0 space-y-6 print:hidden">
                <DeckConfigurator config={config} onChange={setConfig} />
              </div>
            )}

            <div className="flex-1 min-w-0 space-y-6 print:hidden">
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
                    <h2 className="text-foreground print:hidden m-0">Deck Plan & Elevation</h2>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewMode('2d')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm ${
                        viewMode === '2d'
                          ? 'bg-purple-600 text-white'
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
                          ? 'bg-purple-600 text-white'
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
                    <DeckCanvas config={config} onChange={setConfig} />
                  ) : (
                    <div className="h-[500px]">
                      <Deck3DRenderer 
                        key={`3d-${config.width}-${config.length}-${config.shape}-${config.lShapePosition}-${config.lShapeWidth}-${config.lShapeLength}-${config.hasStairs}-${config.stairSide}`} 
                        config={config} 
                        ref={deck3DRendererRef}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-background rounded-lg shadow-sm border border-border p-6 print:shadow-none print:border-2 print:border-black print:break-before-page">
                <h2 className="text-foreground mb-4">Materials Summary</h2>
                <MaterialsList materials={materials} compact />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'materials' && (
          <div className="space-y-6">
            <div className="bg-background rounded-lg shadow-sm border border-border p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                {enrichedMaterials.length > 0 && totalT1Price > 0 ? (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg flex-1 w-full sm:w-auto">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-700">Total Estimated Cost (Tier 1 Pricing)</p>
                        <p className="text-xs text-purple-600 mt-1">Based on your organization's default pricing</p>
                      </div>
                      <p className="text-2xl font-semibold text-purple-900">${totalT1Price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                ) : <div className="flex-1"></div>}
                
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <PlannerExportDialog
                    organizationId={user.organizationId || user.organization_id || ''}
                    projectType="deck"
                    materials={enrichedMaterials.length > 0 ? enrichedMaterials : flatMaterials}
                    totalCost={totalT1Price}
                    defaultDesignName="deck-design"
                  />
                  <ProjectQuoteGenerator 
                    user={user}
                    projectType="deck"
                    materials={enrichedMaterials}
                    totalCost={totalT1Price}
                    projectData={config}
                  />
                </div>
              </div>

              <div className="mt-8 border-t pt-8">
                <SavedProjectDesigns
                  user={user}
                  projectType="deck"
                  currentConfig={config}
                  materials={enrichedMaterials}
                  totalCost={totalT1Price}
                  onLoadDesign={(savedConfig) => setConfig(savedConfig)}
                />
              </div>

              <MaterialsList 
                materials={getEnrichedMaterialsStructure()} 
                compact={false} 
              />
            </div>
            
            <DiagnosticPanel 
              organizationId={user.organizationId || user.organization_id || ''}
              plannerType="deck"
              materialType={pricingMaterialType}
            />
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <DeckTemplates onLoadTemplate={handleLoadTemplate} currentConfig={config} />
          </div>
        )}

        {activeTab === 'saved' && (
          <SavedDeckDesigns 
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
            plannerType="deck"
            materialTypes={[config.deckingType.toLowerCase()]}
            initialMaterialType={defaultsUiMaterialType}
            initialRailingType={config.railingStyle || 'Treated'}
            initialAluminumColor={(config.aluminumRailingColor || 'White').toLowerCase()}
            onDefaultsSaved={() => setDefaultsVersion(v => v + 1)}
          />
        )}
      </div>

      {/* Printable Design View */}
      <PrintableDeckDesign
        config={config}
        materials={getEnrichedMaterialsStructure()}
        totalCost={totalT1Price}
        designName={loadedDesignInfo.name}
        description={loadedDesignInfo.description}
        customerName={loadedDesignInfo.customerName}
        customerCompany={loadedDesignInfo.customerCompany}
        snapshotUrl={snapshotUrl}
      />
    </div>
    </PermissionGate>
  );
}