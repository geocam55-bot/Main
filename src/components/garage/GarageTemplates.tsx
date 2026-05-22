import React from 'react';
import { GarageConfig } from '../../types/garage';
import { Car, TrendingUp, Warehouse, Building2 } from 'lucide-react';

interface GarageTemplatesProps {
  onLoadTemplate: (config: GarageConfig) => void;
  currentConfig?: GarageConfig;
}

export function GarageTemplates({ onLoadTemplate, currentConfig }: GarageTemplatesProps) {
  const templates: Array<{ name: string; description: string; icon: any; config: GarageConfig }> = [
    {
      name: 'Basic Single',
      description: '12×20 single bay',
      icon: Car,
      config: {
        width: 12,
        length: 20,
        height: 8,
        bays: 1,
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
            offsetFromLeft: 1.5,
          },
        ],
        windows: [],
        hasWalkDoor: true,
        walkDoorPosition: 'front',
        sidingType: 'vinyl',
        roofingMaterial: 'asphalt-shingle',
        hasAtticTrusses: false,
        isInsulated: false,
        hasElectrical: false,
        unit: 'feet',
      },
    },
    {
      name: 'Standard Double',
      description: '20×20 two car garage',
      icon: TrendingUp,
      config: {
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
      },
    },
    {
      name: 'Deluxe Double',
      description: '24×24 with storage',
      icon: Warehouse,
      config: {
        width: 24,
        length: 24,
        height: 10,
        bays: 2,
        roofStyle: 'gable',
        roofPitch: 8,
        wallFraming: '2x6',
        doors: [
          {
            id: '1',
            type: 'overhead',
            width: 10,
            height: 8,
            position: 'front',
            offsetFromLeft: 1,
          },
          {
            id: '2',
            type: 'overhead',
            width: 10,
            height: 8,
            position: 'front',
            offsetFromLeft: 12,
          },
        ],
        windows: [
          {
            id: '1',
            width: 3,
            height: 3,
            position: 'left',
            offsetFromLeft: 10,
            offsetFromFloor: 5,
          },
          {
            id: '2',
            width: 3,
            height: 3,
            position: 'right',
            offsetFromLeft: 10,
            offsetFromFloor: 5,
          },
          {
            id: '3',
            width: 4,
            height: 3,
            position: 'back',
            offsetFromLeft: 10,
            offsetFromFloor: 5,
          },
        ],
        hasWalkDoor: true,
        walkDoorPosition: 'side',
        sidingType: 'fiber-cement',
        roofingMaterial: 'asphalt-shingle',
        hasAtticTrusses: true,
        isInsulated: true,
        hasElectrical: true,
        unit: 'feet',
      },
    },
    {
      name: 'Triple Bay',
      description: '30×24 three car garage',
      icon: Building2,
      config: {
        width: 30,
        length: 24,
        height: 10,
        bays: 3,
        roofStyle: 'hip',
        roofPitch: 6,
        wallFraming: '2x6',
        doors: [
          {
            id: '1',
            type: 'overhead',
            width: 9,
            height: 8,
            position: 'front',
            offsetFromLeft: 1,
          },
          {
            id: '2',
            type: 'overhead',
            width: 9,
            height: 8,
            position: 'front',
            offsetFromLeft: 10.5,
          },
          {
            id: '3',
            type: 'overhead',
            width: 9,
            height: 8,
            position: 'front',
            offsetFromLeft: 20,
          },
        ],
        windows: [
          {
            id: '1',
            width: 3,
            height: 2,
            position: 'left',
            offsetFromLeft: 10,
            offsetFromFloor: 6,
          },
          {
            id: '2',
            width: 3,
            height: 2,
            position: 'right',
            offsetFromLeft: 10,
            offsetFromFloor: 6,
          },
        ],
        hasWalkDoor: true,
        walkDoorPosition: 'side',
        sidingType: 'vinyl',
        roofingMaterial: 'metal',
        hasAtticTrusses: false,
        isInsulated: true,
        hasElectrical: true,
        unit: 'feet',
      },
    },
  ];

  // Check if a template matches the current config
  const isTemplateSelected = (template: typeof templates[0]) => {
    if (!currentConfig) return false;
    
    const t = template.config;
    const c = currentConfig;
    
    // Check key properties that define a template
    return (
      t.width === c.width &&
      t.length === c.length &&
      t.height === c.height &&
      t.bays === c.bays &&
      t.roofStyle === c.roofStyle &&
      t.roofPitch === c.roofPitch
    );
  };

  return (
    <div className="bg-background rounded-lg shadow-sm border border-border p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
          <Warehouse className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Quick Start Templates</h2>
          <p className="text-sm text-muted-foreground">Start with a pre-configured garage layout</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {templates.map((template) => {
          const Icon = template.icon;
          const isSelected = isTemplateSelected(template);
          return (
            <div
              key={template.name}
              onClick={() => onLoadTemplate(template.config)}
              className={`relative p-5 rounded-xl border-2 transition-all duration-200 cursor-pointer flex items-start gap-4 ${
                isSelected
                  ? 'border-blue-600 bg-blue-50 shadow-md'
                  : 'border-border bg-background hover:border-blue-300 hover:bg-muted'
              }`}
            >
              <div className={`p-3 rounded-lg flex-shrink-0 ${
                isSelected ? 'bg-blue-100 text-blue-600' : 'bg-muted text-muted-foreground'
              }`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`font-medium mb-1 truncate ${
                  isSelected ? 'text-blue-900' : 'text-foreground'
                }`}>{template.name}</div>
                <div className={`text-sm ${
                  isSelected ? 'text-blue-700' : 'text-muted-foreground'
                }`}>{template.description}</div>
              </div>
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600"></span>
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}