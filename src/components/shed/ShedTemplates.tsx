import React from 'react';
import { ShedConfig } from '../../types/shed';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Box, Home, Warehouse, Building2 } from 'lucide-react';

interface ShedTemplatesProps {
  onLoadTemplate: (config: ShedConfig) => void;
  currentConfig?: ShedConfig;
}

export function ShedTemplates({ onLoadTemplate, currentConfig }: ShedTemplatesProps) {
  const templates: Array<{ name: string; description: string; icon: any; config: ShedConfig }> = [
    {
      name: 'Small Storage',
      description: '8×10 gable shed',
      icon: Box,
      config: {
        width: 8,
        length: 10,
        wallHeight: 7,
        style: 'gable',
        roofPitch: 6,
        foundationType: 'skids',
        doorType: 'single',
        doorWidth: 3,
        doorHeight: 6.5,
        doorPosition: 'front',
        windows: [
          {
            id: '1',
            width: 2,
            height: 2,
            position: 'front',
            offsetFromLeft: 1.5,
            offsetFromFloor: 3,
          },
        ],
        hasLoft: false,
        hasFloor: true,
        hasShutters: false,
        hasFlowerBox: false,
        sidingType: 't1-11',
        roofingMaterial: 'asphalt-shingle',
        hasElectrical: false,
        hasShelvingPackage: true,
        unit: 'feet',
      },
    },
    {
      name: 'Classic Barn',
      description: '10×12 barn style',
      icon: Home,
      config: {
        width: 10,
        length: 12,
        wallHeight: 7,
        style: 'barn',
        roofPitch: 8,
        foundationType: 'concrete-blocks',
        doorType: 'double',
        doorWidth: 5,
        doorHeight: 6.5,
        doorPosition: 'front',
        windows: [
          {
            id: '1',
            width: 2,
            height: 2,
            position: 'left',
            offsetFromLeft: 5,
            offsetFromFloor: 3,
          },
          {
            id: '2',
            width: 2,
            height: 2,
            position: 'right',
            offsetFromLeft: 5,
            offsetFromFloor: 3,
          },
        ],
        hasLoft: true,
        hasFloor: true,
        hasShutters: true,
        hasFlowerBox: false,
        sidingType: 'vinyl',
        roofingMaterial: 'architectural-shingle',
        hasElectrical: true,
        hasShelvingPackage: true,
        unit: 'feet',
      },
    },
    {
      name: 'Deluxe Quaker',
      description: '12×16 with overhang',
      icon: Warehouse,
      config: {
        width: 12,
        length: 16,
        wallHeight: 8,
        style: 'quaker',
        roofPitch: 8,
        foundationType: 'concrete-slab',
        doorType: 'double',
        doorWidth: 6,
        doorHeight: 7,
        doorPosition: 'front',
        windows: [
          {
            id: '1',
            width: 3,
            height: 3,
            position: 'front',
            offsetFromLeft: 2,
            offsetFromFloor: 3,
          },
          {
            id: '2',
            width: 2,
            height: 2,
            position: 'left',
            offsetFromLeft: 6,
            offsetFromFloor: 4,
          },
          {
            id: '3',
            width: 2,
            height: 2,
            position: 'right',
            offsetFromLeft: 6,
            offsetFromFloor: 4,
          },
        ],
        hasLoft: true,
        hasFloor: true,
        hasShutters: true,
        hasFlowerBox: true,
        sidingType: 'vinyl',
        roofingMaterial: 'architectural-shingle',
        hasElectrical: true,
        hasShelvingPackage: true,
        unit: 'feet',
      },
    },
    {
      name: 'Lean-To Utility',
      description: '8×12 lean-to',
      icon: Building2,
      config: {
        width: 8,
        length: 12,
        wallHeight: 6.5,
        style: 'lean-to',
        roofPitch: 4,
        foundationType: 'skids',
        doorType: 'single',
        doorWidth: 4,
        doorHeight: 6.5,
        doorPosition: 'front',
        windows: [
          {
            id: '1',
            width: 2,
            height: 2,
            position: 'left',
            offsetFromLeft: 4,
            offsetFromFloor: 3,
          },
        ],
        hasLoft: false,
        hasFloor: true,
        hasShutters: false,
        hasFlowerBox: false,
        sidingType: 'wood',
        roofingMaterial: 'metal',
        hasElectrical: false,
        hasShelvingPackage: true,
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
      t.wallHeight === c.wallHeight &&
      t.style === c.style &&
      t.roofPitch === c.roofPitch &&
      t.foundationType === c.foundationType
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quick Start Templates</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {templates.map((template) => {
          const Icon = template.icon;
          const isSelected = isTemplateSelected(template);
          return (
            <Button
              key={template.name}
              variant="outline"
              className={`w-full justify-start h-auto py-3 ${
                isSelected
                  ? 'border-2 border-green-600 bg-green-50'
                  : 'border-border'
              }`}
              onClick={() => onLoadTemplate(template.config)}
            >
              <div className="flex items-start gap-3 text-left">
                <Icon className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className={`font-medium ${
                    isSelected ? 'text-green-900' : 'text-foreground'
                  }`}>{template.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{template.description}</div>
                </div>
              </div>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}