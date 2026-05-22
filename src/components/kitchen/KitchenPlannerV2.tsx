import React, { useState, useEffect } from 'react';
import { KitchenCanvas } from './KitchenCanvas';
import { Kitchen3DRenderer, Kitchen3DRendererRef } from './Kitchen3DRenderer';
import { KitchenConfigurator } from './KitchenConfigurator';
import { SavedKitchenDesigns } from './SavedKitchenDesigns';
import { KitchenTemplates } from './KitchenTemplates';
import { DiagnosticPanel } from '../DiagnosticPanel';
import { PrintableKitchenDesign } from '../project-wizard/PrintableKitchenDesign';
import { PlannerDefaults } from '../PlannerDefaults';
import { ProjectQuoteGenerator } from '../ProjectQuoteGenerator';
import { SavedProjectDesigns } from '../SavedProjectDesigns';
import { ModelLibrary } from './ModelLibrary';
import { calculateKitchenMaterials } from '../../utils/kitchenCalculations';
import { enrichMaterialsWithT1Pricing } from '../../utils/enrichMaterialsWithPricing';
import { KitchenConfig, PlacedCabinet, CABINET_CATALOG, CabinetItem, Appliance } from '../../types/kitchen';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  Box, 
  Refrigerator, 
  DoorOpen, 
  Search, 
  Plus,
  X,
  ChevronLeft,
  Camera,
  ShoppingCart,
  Settings,
  Maximize2,
  Edit3,
  Save,
  Printer,
  LayoutTemplate,
  FileTerminal
} from 'lucide-react';
import type { User } from '../../App';
import { toast } from 'sonner@2.0.3';
import { ChefHat } from 'lucide-react';
import { PlannerWorkflowHelp } from '../planners/PlannerWorkflowHelp';
import { PlannerExportDialog } from '../planners/PlannerExportDialog';
import { 
  BaseCabinetIcon, 
  WallCabinetIcon, 
  TallCabinetIcon, 
  CornerBaseCabinetIcon, 
  IslandCabinetIcon,
  RefrigeratorIcon,
  StoveIcon,
  DishwasherIcon,
  MicrowaveIcon,
  SinkIcon
} from './CabinetIcons';

interface KitchenPlannerV2Props {
  user: User;
}

type ItemCategory = 'cabinets' | 'appliances' | 'openings' | 'settings';
type MainTab = 'design' | 'materials' | 'templates' | 'saved-designs' | 'diagnostics' | 'defaults' | 'model-library';

// Cabinet images by type
const CABINET_IMAGES: Record<string, string> = {
  'base': 'https://images.unsplash.com/photo-1741314671445-a9a1cc1bfa7d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxraXRjaGVuJTIwYmFzZSUyMGNhYmluZXR8ZW58MXx8fHwxNzY3MjgyNzUxfDA&ixlib=rb-4.1.0&q=80&w=1080',
  'wall': 'https://images.unsplash.com/photo-1713514022453-4adc636025a4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxraXRjaGVuJTIwd2FsbCUyMGNhYmluZXR8ZW58MXx8fHwxNzY3MjgyNzUxfDA&ixlib=rb-4.1.0&q=80&w=1080',
  'tall': 'https://images.unsplash.com/photo-1738162599555-c28b00062960?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0YWxsJTIwa2l0Y2hlbiUyMGNhYmluZXR8ZW58MXx8fHwxNzY3MjgyNzUyfDA&ixlib=rb-4.1.0&q=80&w=1080',
  'corner-base': 'https://images.unsplash.com/photo-1741314671445-a9a1cc1bfa7d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxraXRjaGVuJTIwYmFzZSUyMGNhYmluZXR8ZW58MXx8fHwxNzY3MjgyNzUxfDA&ixlib=rb-4.1.0&q=80&w=1080',
  'corner-wall': 'https://images.unsplash.com/photo-1713514022453-4adc636025a4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxraXRjaGVuJTIwd2FsbCUyMGNhYmluZXR8ZW58MXx8fHwxNzY3MjgyNzUxfDA&ixlib=rb-4.1.0&q=80&w=1080',
  'island': 'https://images.unsplash.com/photo-1611818830402-d07de749ed59?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aGl0ZSUyMGtpdGNoZW4lMjBjYWJpbmV0fGVufDF8fHx8MTc2NzI4Mjc1MXww&ixlib=rb-4.1.0&q=80&w=1080',
  'peninsula': 'https://images.unsplash.com/photo-1611818830402-d07de749ed59?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aGl0ZSUyMGtpdGNoZW4lMjBjYWJpbmV0fGVufDF8fHx8MTc2NzI4Mjc1MXww&ixlib=rb-4.1.0&q=80&w=1080',
};

// Appliance catalog
const APPLIANCE_CATALOG = [
  { 
    id: 'fridge-36', 
    type: 'refrigerator' as const, 
    name: 'Refrigerator 36"', 
    width: 36, 
    height: 70, 
    depth: 30, 
    price: 1200,
    image: 'https://images.unsplash.com/photo-1610733374054-59454fe657cd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGFpbmxlc3MlMjBzdGVlbCUyMHJlZnJpZ2VyYXRvcnxlbnwxfHx8fDE3NjcyODI3NTJ8MA&ixlib=rb-4.1.0&q=80&w=1080'
  },
  { 
    id: 'fridge-33', 
    type: 'refrigerator' as const, 
    name: 'Refrigerator 33"', 
    width: 33, 
    height: 70, 
    depth: 30, 
    price: 1000,
    image: 'https://images.unsplash.com/photo-1610733374054-59454fe657cd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGFpbmxlc3MlMjBzdGVlbCUyMHJlZnJpZ2VyYXRvcnxlbnwxfHx8fDE3NjcyODI3NTJ8MA&ixlib=rb-4.1.0&q=80&w=1080'
  },
  { 
    id: 'stove-30', 
    type: 'stove' as const, 
    name: 'Gas Range 30"', 
    width: 30, 
    height: 36, 
    depth: 28, 
    price: 800,
    image: 'https://images.unsplash.com/photo-1749496600182-a4c4ca08dd8e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnYXMlMjBzdG92ZSUyMHJhbmdlfGVufDF8fHx8MTc2NzI4Mjc1Mnww&ixlib=rb-4.1.0&q=80&w=1080'
  },
  { 
    id: 'dishwasher-24', 
    type: 'dishwasher' as const, 
    name: 'Dishwasher 24"', 
    width: 24, 
    height: 34, 
    depth: 24, 
    price: 600,
    image: 'https://images.unsplash.com/photo-1610733374054-59454fe657cd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGFpbmxlc3MlMjBzdGVlbCUyMHJlZnJpZ2VyYXRvcnxlbnwxfHx8fDE3NjcyODI3NTJ8MA&ixlib=rb-4.1.0&q=80&w=1080'
  },
  { 
    id: 'microwave-30', 
    type: 'microwave' as const, 
    name: 'Over-Range Microwave 30"', 
    width: 30, 
    height: 17, 
    depth: 16, 
    price: 300,
    image: 'https://images.unsplash.com/photo-1610733374054-59454fe657cd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGFpbmxlc3MlMjBzdGVlbCUyMHJlZnJpZ2VyYXRvcnxlbnwxfHx8fDE3NjcyODI3NTJ8MA&ixlib=rb-4.1.0&q=80&w=1080'
  },
  { 
    id: 'sink-33', 
    type: 'sink' as const, 
    name: 'Undermount Sink 33"', 
    width: 33, 
    height: 9, 
    depth: 22, 
    price: 250,
    image: 'https://images.unsplash.com/photo-1610733374054-59454fe657cd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGFpbmxlc3MlMjBzdGVlbCUyMHJlZnJpZ2VyYXRvcnxlbnwxfHx8fDE3NjcyODI3NTJ8MA&ixlib=rb-4.1.0&q=80&w=1080'
  },
];

// Cabinet Card Component
function CabinetCard({ 
  cabinet, 
  onAdd,
  finish 
}: { 
  cabinet: CabinetItem; 
  onAdd: (cab: PlacedCabinet) => void;
  finish: string;
}) {
  const handleAdd = () => {
    const newCabinet: PlacedCabinet = {
      id: `cabinet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      catalogId: cabinet.id,
      name: cabinet.name,
      type: cabinet.type,
      width: cabinet.width,
      height: cabinet.height,
      depth: cabinet.depth,
      x: 100,
      y: 100,
      rotation: 0,
      finish: finish,
      price: cabinet.price,
      modelUrl: cabinet.modelUrl,
    };
    onAdd(newCabinet);
    toast.success(`Added ${cabinet.name}`);
  };

  const getCabinetIcon = () => {
    if (cabinet.image) {
      return (
        <div className="w-full h-full flex items-center justify-center p-2">
          <ImageWithFallback 
            src={cabinet.image} 
            alt={cabinet.name} 
            className="w-full h-full object-contain mix-blend-multiply" 
          />
        </div>
      );
    }
    switch (cabinet.type) {
      case 'base': return <BaseCabinetIcon className="w-full h-full" />;
      case 'wall': return <WallCabinetIcon className="w-full h-full" />;
      case 'tall': return <TallCabinetIcon className="w-full h-full" />;
      case 'corner-base':
      case 'corner-wall': return <CornerBaseCabinetIcon className="w-full h-full" />;
      case 'island':
      case 'peninsula': return <IslandCabinetIcon className="w-full h-full" />;
      default: return <Box className="w-8 h-8" />;
    }
  };

  return (
    <div 
      className="rounded-lg border border-border hover:shadow-md transition-shadow cursor-pointer bg-background group relative overflow-hidden" 
      onClick={handleAdd}
    >
      <div className="h-32 p-4 border-b border-border bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        {getCabinetIcon()}
        <div className="absolute top-0 left-0 right-0 h-32 bg-transparent group-hover:bg-black/5 transition-all flex items-center justify-center">
          <Plus className="w-8 h-8 text-foreground opacity-0 group-hover:opacity-50 transition-opacity drop-shadow" />
        </div>
      </div>
      <div className="p-3 bg-background">
        <h3 className="font-medium text-sm mb-1">{cabinet.name}</h3>
        <p className="text-xs text-muted-foreground mb-2">{cabinet.width}W × {cabinet.height}H × {cabinet.depth}D</p>
        <p className="text-sm font-semibold text-blue-600">${cabinet.price?.toFixed(2) || '0.00'}</p>
      </div>
    </div>
  );
}

// Appliance Card Component
function ApplianceCard({ 
  appliance, 
  onAdd 
}: { 
  appliance: typeof APPLIANCE_CATALOG[0]; 
  onAdd: (app: typeof APPLIANCE_CATALOG[0], x: number, y: number) => void;
}) {
  const handleAdd = () => {
    onAdd(appliance, 200, 200);
    toast.success(`Added ${appliance.name}`);
  };

  const getApplianceIcon = () => {
    switch (appliance.type) {
      case 'refrigerator': return <RefrigeratorIcon className="w-full h-full" />;
      case 'stove': return <StoveIcon className="w-full h-full" />;
      case 'dishwasher': return <DishwasherIcon className="w-full h-full" />;
      case 'microwave': return <MicrowaveIcon className="w-full h-full" />;
      case 'sink': return <SinkIcon className="w-full h-full" />;
      default: return <Refrigerator className="w-full h-full" />;
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group" onClick={handleAdd}>
      <div className="relative h-32 bg-gradient-to-br from-slate-50 to-slate-100 border-b border-border p-4 flex items-center justify-center">
        {getApplianceIcon()}
        <div className="absolute inset-0 bg-transparent group-hover:bg-black/5 transition-all flex items-center justify-center">
          <Plus className="w-8 h-8 text-foreground opacity-0 group-hover:opacity-50 transition-opacity drop-shadow" />
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm mb-1">{appliance.name}</h3>
        <p className="text-xs text-muted-foreground mb-2">{appliance.width}W × {appliance.height}H</p>
        <p className="text-sm font-semibold text-green-600">${appliance.price.toFixed(2)}</p>
      </div>
    </Card>
  );
}

export function KitchenPlannerV2({ user }: KitchenPlannerV2Props) {
  const kitchen3DRendererRef = React.useRef<Kitchen3DRendererRef>(null);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);

  const [config, setConfig] = useState<KitchenConfig>({
    roomWidth: 12,
    roomLength: 14,
    roomHeight: 8,
    wallThickness: 6,
    layoutStyle: 'L-shaped',
    cabinetFinish: 'White Shaker',
    countertopMaterial: 'Granite',
    cabinets: [],
    countertops: [],
    appliances: [],
    hasIsland: false,
    hasPantry: false,
    hasBacksplash: true,
    gridSize: 6,
    showGrid: false,
    snapToGrid: false,
    viewMode: '2D',
    unit: 'feet',
  });

  const [selectedCabinet, setSelectedCabinet] = useState<PlacedCabinet | null>(null);
  const [activeCategory, setActiveCategory] = useState<ItemCategory>('cabinets');
  const [showSidebar, setShowSidebar] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<MainTab>('design');
  const [loadedDesignInfo, setLoadedDesignInfo] = useState<{
    name?: string;
    description?: string;
    customerName?: string;
    customerCompany?: string;
  }>({});
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Poll for snapshot URL from 3D renderer
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (kitchen3DRendererRef.current && config.viewMode === '3D') {
        const url = kitchen3DRendererRef.current.getSnapshotUrl();
        if (url && url !== snapshotUrl) {
          setSnapshotUrl(url);
        }
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [config.viewMode, snapshotUrl]);

  const materials = calculateKitchenMaterials(config);
  const flatMaterials = [
    ...materials.cabinets,
    ...materials.countertops,
    ...materials.appliances,
    ...materials.hardware,
    ...materials.installation,
  ];

  const totalPrice = config.cabinets.reduce((sum, cab) => sum + (cab.price || 0), 0) +
                     config.appliances.reduce((sum, app) => sum + (app.price || 0), 0);

  const handleAddCabinet = (cabinet: PlacedCabinet) => {
    setConfig(prev => ({
      ...prev,
      cabinets: [...prev.cabinets, cabinet],
    }));
  };

  const handleAddAppliance = (applianceData: typeof APPLIANCE_CATALOG[0], x: number, y: number) => {
    const newAppliance: Appliance = {
      id: `appliance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: applianceData.type,
      name: applianceData.name,
      width: applianceData.width,
      height: applianceData.height,
      depth: applianceData.depth,
      x,
      y,
      rotation: 0,
      price: applianceData.price,
    };
    
    setConfig(prev => ({
      ...prev,
      appliances: [...prev.appliances, newAppliance],
    }));
  };

  const handleUpdateCabinet = (id: string, updates: Partial<PlacedCabinet>) => {
    setConfig(prev => ({
      ...prev,
      cabinets: prev.cabinets.map(cab => 
        cab.id === id ? { ...cab, ...updates } : cab
      ),
    }));
    if (selectedCabinet?.id === id) {
      setSelectedCabinet(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const handleUpdateAppliance = (id: string, updates: Partial<Appliance>) => {
    setConfig(prev => ({
      ...prev,
      appliances: prev.appliances.map(app => 
        app.id === id ? { ...app, ...updates } : app
      ),
    }));
  };

  const handleDeleteCabinet = (id: string) => {
    setConfig(prev => ({
      ...prev,
      cabinets: prev.cabinets.filter(cab => cab.id !== id),
    }));
    if (selectedCabinet?.id === id) {
      setSelectedCabinet(null);
    }
  };

  const handleUpdateConfig = (updates: Partial<KitchenConfig>) => {
    setConfig(prev => ({
      ...prev,
      ...updates,
    }));
  };

  const filteredCabinets = CABINET_CATALOG.filter(cab =>
    cab.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAppliances = APPLIANCE_CATALOG.filter(app =>
    app.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrintPlan = () => {
    if (kitchen3DRendererRef.current && config.viewMode === '3D') {
      kitchen3DRendererRef.current.captureSnapshot();
    }
    setTimeout(() => window.print(), 500);
  };

  if (!isDesktop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center bg-muted rounded-lg m-4 border border-border">
        <Maximize2 className="w-16 h-16 text-blue-500 mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Desktop View Required</h2>
        <p className="text-muted-foreground max-w-md">
          The 3D Kitchen Planner requires a larger screen to ensure the best design experience. Please access this feature on a desktop or laptop computer.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-background">
        <div className="print:hidden">
          {/* Main Tab Navigation - Design / Materials / Saved Designs */}
          <div className="border-b bg-background">
          <div className="px-6 py-0 flex items-center justify-between">
          {/* Tab Navigation */}
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('design')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'design'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span>Design</span>
            </button>

            <button
              onClick={() => setActiveTab('materials')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'materials'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Materials</span>
            </button>

            <button
              onClick={() => setActiveTab('templates')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'templates'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutTemplate className="w-4 h-4" />
              <span>Templates</span>
            </button>

            <button
              onClick={() => setActiveTab('saved-designs')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'saved-designs'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>Saved Designs</span>
            </button>

            <button
              onClick={() => setActiveTab('diagnostics')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'diagnostics'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileTerminal className="w-4 h-4" />
              <span>Diagnostics</span>
            </button>

            <button
              onClick={() => setActiveTab('defaults')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'defaults'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Defaults</span>
            </button>

            <button
              onClick={() => setActiveTab('model-library')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'model-library'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Box className="w-4 h-4" />
              <span>3D Models</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <PlannerWorkflowHelp
              plannerType="kitchen"
              userId={user.id}
              onOpenDesign={() => setActiveTab('design')}
              onOpenMaterials={() => setActiveTab('materials')}
              onOpenTemplates={() => setActiveTab('templates')}
              onOpenSaved={() => setActiveTab('saved-designs')}
              onOpenDefaults={() => setActiveTab('defaults')}
              onOpenDiagnostics={() => setActiveTab('diagnostics')}
              onOpenModelLibrary={() => setActiveTab('model-library')}
              onSwitch2D={() => setConfig((prev) => ({ ...prev, viewMode: '2D' }))}
              onSwitch3D={() => setConfig((prev) => ({ ...prev, viewMode: '3D' }))}
              onPrint={handlePrintPlan}
            />
            {/* Print Plan Button */}
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white print:hidden"
              onClick={handlePrintPlan}
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Plan
            </Button>
          </div>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
        {activeTab === 'design' && (
          <div className="flex gap-6 h-[calc(100vh-12rem)] min-h-[700px]">
            {/* Left Catalog Panel */}
            {showSidebar && (
              <div className="w-72 flex-shrink-0 flex flex-col bg-background rounded-lg shadow-sm border border-border h-full">
                {/* Category Tabs */}
                <div className="flex p-2 gap-1 border-b border-border bg-muted/50">
                <button
                  onClick={() => setActiveCategory('cabinets')}
                  className={`flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-md transition-all ${
                    activeCategory === 'cabinets'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                  title="Cabinets"
                >
                  <Box className="w-5 h-5" />
                  <span className="text-[10px] font-medium leading-none">Cabinets</span>
                </button>
                <button
                  onClick={() => setActiveCategory('appliances')}
                  className={`flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-md transition-all ${
                    activeCategory === 'appliances'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                  title="Appliances"
                >
                  <Refrigerator className="w-5 h-5" />
                  <span className="text-[10px] font-medium leading-none">Appliances</span>
                </button>
                <button
                  onClick={() => setActiveCategory('settings')}
                  className={`flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-md transition-all ${
                    activeCategory === 'settings'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                  title="Room Settings"
                >
                  <Settings className="w-5 h-5" />
                  <span className="text-[10px] font-medium leading-none text-center">Settings</span>
                </button>
              </div>

              {/* Header */}
              <div className="p-4 border-b border-border flex flex-col gap-3">
                <div className="text-sm font-semibold text-foreground capitalize flex items-center gap-2">
                  {activeCategory === 'cabinets' && <><Box className="w-4 h-4" /> Cabinet Catalog</>}
                  {activeCategory === 'appliances' && <><Refrigerator className="w-4 h-4" /> Appliance Catalog</>}
                  {activeCategory === 'settings' && <><Settings className="w-4 h-4" /> Room Settings</>}
                </div>
                {activeCategory !== 'settings' && (
                  <div className="relative w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 h-9 text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-300">
                {selectedCabinet ? (
                  <div className="flex flex-col gap-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-2 rounded-md">
                        <Box className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground">{selectedCabinet.name}</div>
                        <div className="text-xs text-muted-foreground">{selectedCabinet.width}W × {selectedCabinet.height}H × {selectedCabinet.depth}D</div>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1 block">Custom 3D Model (OBJ URL)</label>
                      <Input 
                        placeholder="https://.../model.obj"
                        value={selectedCabinet.modelUrl || ''}
                        onChange={(e) => handleUpdateCabinet(selectedCabinet.id, { modelUrl: e.target.value })}
                        className="text-xs h-8 bg-background"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-blue-100/50">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 text-xs bg-background"
                        onClick={() => setSelectedCabinet(null)}
                      >
                        Deselect
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="flex-1 text-xs"
                        onClick={() => handleDeleteCabinet(selectedCabinet.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {activeCategory === 'cabinets' && (
                      <div className="flex flex-col gap-3 pb-4">
                        {filteredCabinets.map(cabinet => (
                          <CabinetCard
                            key={cabinet.id}
                            cabinet={cabinet}
                            onAdd={handleAddCabinet}
                            finish={config.cabinetFinish}
                          />
                        ))}
                        {filteredCabinets.length === 0 && (
                          <div className="text-sm text-muted-foreground py-4 text-center">No cabinets found.</div>
                        )}
                      </div>
                    )}

                    {activeCategory === 'appliances' && (
                      <div className="flex flex-col gap-3 pb-4">
                        {filteredAppliances.map(appliance => (
                          <ApplianceCard
                            key={appliance.id}
                            appliance={appliance}
                            onAdd={handleAddAppliance}
                          />
                        ))}
                        {filteredAppliances.length === 0 && (
                          <div className="text-sm text-muted-foreground py-4 text-center">No appliances found.</div>
                        )}
                      </div>
                    )}

                    {activeCategory === 'settings' && (
                      <div className="w-full">
                        <KitchenConfigurator config={config} onChange={handleUpdateConfig} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Right Side Content (Canvas & Summary) */}
            <div className="flex-1 flex flex-col gap-6 min-w-0 h-full overflow-y-auto pb-4 pr-1">
              <div className="flex-none flex flex-col min-h-[600px] bg-background rounded-lg shadow-sm border border-border overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-border bg-muted/50">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setShowSidebar(!showSidebar)}
                      className="p-2 bg-background border border-border rounded-md hover:bg-muted transition-colors text-muted-foreground"
                      title={showSidebar ? "Hide Catalog (Maximize Canvas)" : "Show Catalog"}
                    >
                      {showSidebar ? <ChevronLeft className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                    </button>
                    <h2 className="text-lg font-semibold">Kitchen Plan & Elevation</h2>
                    <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100">
                      <span className="text-xs text-blue-700 font-medium">Total Cost:</span>
                      <span className="text-sm font-bold text-blue-900">${totalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfig(prev => ({ ...prev, viewMode: '2D' }))}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm ${
                        config.viewMode === '2D'
                          ? 'bg-blue-600 text-white'
                          : 'bg-muted text-foreground hover:bg-muted'
                      }`}
                    >
                      2D
                    </button>
                    <button
                      onClick={() => setConfig(prev => ({ ...prev, viewMode: '3D' }))}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm ${
                        config.viewMode === '3D'
                          ? 'bg-blue-600 text-white'
                          : 'bg-muted text-foreground hover:bg-muted'
                      }`}
                    >
                      <Box className="w-4 h-4" />
                      3D
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-h-[600px] border border-border rounded-lg overflow-hidden relative">
                  <div className="absolute inset-0">
                    {config.viewMode === '2D' ? (
                      <KitchenCanvas
                        config={config}
                        selectedCabinet={selectedCabinet}
                        onSelectCabinet={setSelectedCabinet}
                        onUpdateCabinet={handleUpdateCabinet}
                        onUpdateAppliance={handleUpdateAppliance}
                        onDeleteCabinet={handleDeleteCabinet}
                        onAddCabinet={handleAddCabinet}
                        onAddAppliance={handleAddAppliance}
                        onUpdateConfig={handleUpdateConfig}
                      />
                    ) : (
                      <div className="h-full">
                        <Kitchen3DRenderer ref={kitchen3DRendererRef} config={config} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-none bg-background rounded-lg shadow-sm border border-border p-6">
                <h2 className="text-lg font-semibold mb-4">Materials Summary</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 text-sm font-semibold">Category</th>
                        <th className="text-left p-3 text-sm font-semibold">Item</th>
                        <th className="text-right p-3 text-sm font-semibold">Qty</th>
                        <th className="text-right p-3 text-sm font-semibold">Unit Price</th>
                        <th className="text-right p-3 text-sm font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flatMaterials.slice(0, 10).map((item, idx) => (
                        <tr key={idx} className="border-t border-border">
                          <td className="p-3 text-sm text-muted-foreground">{item.category}</td>
                          <td className="p-3 text-sm">{item.description}</td>
                          <td className="p-3 text-sm text-right">{item.quantity} {item.unit}</td>
                          <td className="p-3 text-sm text-right">${item.unitPrice?.toFixed(2) || '—'}</td>
                          <td className="p-3 text-sm text-right font-medium">${item.totalPrice?.toFixed(2) || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'materials' && (
          <div className="flex-1 overflow-auto p-6 bg-muted">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6">
                <h2 className="text-2xl font-semibold">Materials & Cost Breakdown</h2>
                <div className="flex flex-wrap items-center gap-3">
                  <PlannerExportDialog
                    organizationId={user.organizationId}
                    projectType="kitchen"
                    materials={flatMaterials}
                    totalCost={totalPrice}
                    defaultDesignName="kitchen-design"
                  />
                  <ProjectQuoteGenerator 
                    user={user}
                    projectType="kitchen"
                    materials={flatMaterials}
                    totalCost={totalPrice}
                    projectData={config}
                  />
                </div>
              </div>

              <div className="mb-6">
                <SavedProjectDesigns
                  user={user}
                  projectType="kitchen"
                  currentConfig={config}
                  materials={flatMaterials}
                  totalCost={totalPrice}
                  onLoadDesign={(savedConfig) => setConfig(savedConfig as KitchenConfig)}
                />
              </div>
              
              <div className="bg-background rounded-lg border border-border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-4 font-semibold">Category</th>
                      <th className="text-left p-4 font-semibold">Item</th>
                      <th className="text-right p-4 font-semibold">Quantity</th>
                      <th className="text-right p-4 font-semibold">Unit Price</th>
                      <th className="text-right p-4 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flatMaterials.map((item, idx) => (
                      <tr key={idx} className="border-t border-border">
                        <td className="p-4 text-sm text-muted-foreground">{item.category}</td>
                        <td className="p-4">{item.description}</td>
                        <td className="p-4 text-right">{item.quantity} {item.unit}</td>
                        <td className="p-4 text-right">${item.unitPrice?.toFixed(2) || '—'}</td>
                        <td className="p-4 text-right font-medium">${item.totalPrice?.toFixed(2) || '—'}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-border bg-blue-50">
                      <td colSpan={4} className="p-4 font-bold text-right">Grand Total:</td>
                      <td className="p-4 text-right font-bold text-xl text-blue-600">
                        ${totalPrice.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'saved-designs' && (
          <div className="flex-1 overflow-auto p-6 bg-muted">
            <div className="max-w-6xl mx-auto">
              <SavedKitchenDesigns 
                user={user}
                currentConfig={config}
                materials={flatMaterials}
                totalCost={totalPrice}
                onLoadDesign={(loadedConfig, designInfo) => {
                  setConfig(loadedConfig);
                  if (designInfo) {
                    setLoadedDesignInfo(designInfo);
                  }
                  setActiveTab('design');
                  toast.success('Design loaded successfully!');
                }}
              />
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="flex-1 overflow-auto p-6 bg-muted">
            <div className="max-w-6xl mx-auto">
              <KitchenTemplates
                currentConfig={config}
                onLoadTemplate={(loadedConfig) => {
                  setConfig(loadedConfig);
                  setSelectedCabinet(null);
                  setActiveTab('design');
                  toast.success('Template loaded successfully!');
                }}
              />
            </div>
          </div>
        )}

        {activeTab === 'diagnostics' && (
          <div className="flex-1 overflow-auto p-6 bg-muted">
            <div className="max-w-6xl mx-auto">
              <DiagnosticPanel
                organizationId={user.organizationId}
                plannerType="kitchen"
              />
            </div>
          </div>
        )}

        {activeTab === 'defaults' && (
          <div className="flex-1 overflow-auto p-6 bg-muted">
            <div className="max-w-6xl mx-auto">
              <PlannerDefaults 
                organizationId={user.organizationId}
                userId={user.id}
                plannerType="kitchen"
              />
            </div>
          </div>
        )}

        {activeTab === 'model-library' && (
          <div className="flex-1 overflow-auto p-6 bg-muted">
            <div className="max-w-6xl mx-auto">
              <ModelLibrary />
            </div>
          </div>
        )}
      </div>
      </div>
      </div>

      {/* Hidden element for printing */}
      <PrintableKitchenDesign 
        config={config}
        materials={flatMaterials}
        totalCost={totalPrice}
        customerName={loadedDesignInfo.customerName}
        customerCompany={loadedDesignInfo.customerCompany}
        description={loadedDesignInfo.description}
        designName={loadedDesignInfo.name}
        snapshotUrl={snapshotUrl || undefined}
      />
    </>
  );
}