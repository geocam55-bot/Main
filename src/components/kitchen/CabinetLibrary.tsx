import React, { useState } from 'react';
import { CABINET_CATALOG, CabinetItem, KitchenConfig, PlacedCabinet } from '../../types/kitchen';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Plus, Search } from 'lucide-react';
import { Card } from '../ui/card';

interface CabinetLibraryProps {
  config: KitchenConfig;
  onAddCabinet: (cabinet: PlacedCabinet) => void;
}

export function CabinetLibrary({ config, onAddCabinet }: CabinetLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  const filteredCabinets = CABINET_CATALOG.filter(cab => {
    const matchesSearch = cab.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || cab.type === selectedType;
    return matchesSearch && matchesType;
  });

  const handleAddToCanvas = (cabinetItem: CabinetItem) => {
    // Create a new placed cabinet with default position
    const newCabinet: PlacedCabinet = {
      ...cabinetItem,
      id: `cabinet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      finish: config.cabinetFinish,
      x: 50, // Default position
      y: 50,
      rotation: 0,
      wall: 'north',
    };
    
    onAddCabinet(newCabinet);
  };

  const handleDragStart = (e: React.DragEvent, cabinet: CabinetItem) => {
    // Store cabinet data in drag event
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify(cabinet));
    
    // Create a custom drag image
    const dragImage = document.createElement('div');
    dragImage.textContent = cabinet.name;
    dragImage.style.padding = '8px 12px';
    dragImage.style.backgroundColor = '#3b82f6';
    dragImage.style.color = 'white';
    dragImage.style.borderRadius = '6px';
    dragImage.style.fontSize = '14px';
    dragImage.style.fontWeight = '500';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    
    // Clean up drag image after a delay
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);
  };

  const cabinetsByType = {
    'Base Cabinets': filteredCabinets.filter(c => c.type === 'base'),
    'Wall Cabinets': filteredCabinets.filter(c => c.type === 'wall'),
    'Tall Cabinets': filteredCabinets.filter(c => c.type === 'tall'),
    'Corner Cabinets': filteredCabinets.filter(c => c.type.includes('corner')),
    'Island Cabinets': filteredCabinets.filter(c => c.type === 'island'),
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cabinets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="base">Base Cabinets</SelectItem>
            <SelectItem value="wall">Wall Cabinets</SelectItem>
            <SelectItem value="tall">Tall Cabinets</SelectItem>
            <SelectItem value="corner-base">Corner Base</SelectItem>
            <SelectItem value="corner-wall">Corner Wall</SelectItem>
            <SelectItem value="island">Island</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cabinet List */}
      <ScrollArea className="h-[600px]">
        <div className="space-y-4">
          {Object.entries(cabinetsByType).map(([category, cabinets]) => {
            if (cabinets.length === 0) return null;
            
            return (
              <div key={category}>
                <h4 className="text-sm font-semibold text-foreground mb-2">{category}</h4>
                <div className="space-y-2">
                  {cabinets.map(cabinet => (
                    <Card 
                      key={cabinet.id} 
                      className="p-3 hover:bg-muted transition-colors cursor-move"
                      draggable
                      onDragStart={(e) => handleDragStart(e, cabinet)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{cabinet.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {cabinet.width}" W × {cabinet.height}" H × {cabinet.depth}" D
                          </p>
                          <div className="flex gap-2 mt-1">
                            {cabinet.hasDoors && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                {cabinet.numberOfDoors} Door{cabinet.numberOfDoors !== 1 ? 's' : ''}
                              </span>
                            )}
                            {cabinet.hasDrawers && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                {cabinet.numberOfDrawers} Drawer{cabinet.numberOfDrawers !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAddToCanvas(cabinet)}
                          className="ml-2"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Visual representation */}
                      <div className="mt-3 border rounded p-2 bg-background flex justify-center items-center h-20">
                        {cabinet.image ? (
                          <img src={cabinet.image} alt={cabinet.name} className="max-h-full max-w-full object-contain" />
                        ) : (
                          <div 
                            className="bg-gradient-to-b from-gray-200 to-gray-300 border border-gray-400 rounded"
                            style={{
                              width: '100%',
                              height: `${Math.min(60, cabinet.height / 2)}px`,
                            }}
                          >
                            {/* Simple cabinet visualization */}
                            <div className="h-full flex items-center justify-center">
                              <div className="text-xs text-muted-foreground font-mono">
                                {cabinet.width}"
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="pt-4 border-t">
        <p className="text-xs text-muted-foreground text-center">
          Drag cabinets to canvas or click <Plus className="inline h-3 w-3" /> to add
        </p>
      </div>
    </div>
  );
}