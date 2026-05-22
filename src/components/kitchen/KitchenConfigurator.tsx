import React from 'react';
import { KitchenConfig, CabinetFinish, CountertopMaterial } from '../../types/kitchen';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Slider } from '../ui/slider';

interface KitchenConfiguratorProps {
  config: KitchenConfig;
  onChange: (config: KitchenConfig) => void;
}

export function KitchenConfigurator({ config, onChange }: KitchenConfiguratorProps) {
  const handleChange = (updates: Partial<KitchenConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-4">
      {/* Room Dimensions */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Room Dimensions</h4>
        
        <div>
          <Label htmlFor="roomWidth" className="text-xs">Width (feet)</Label>
          <Input
            id="roomWidth"
            type="number"
            value={config.roomWidth}
            onChange={(e) => handleChange({ roomWidth: parseFloat(e.target.value) || 0 })}
            min={6}
            max={30}
            step={0.5}
          />
        </div>

        <div>
          <Label htmlFor="roomLength" className="text-xs">Length (feet)</Label>
          <Input
            id="roomLength"
            type="number"
            value={config.roomLength}
            onChange={(e) => handleChange({ roomLength: parseFloat(e.target.value) || 0 })}
            min={6}
            max={30}
            step={0.5}
          />
        </div>

        <div>
          <Label htmlFor="roomHeight" className="text-xs">Ceiling Height (feet)</Label>
          <Input
            id="roomHeight"
            type="number"
            value={config.roomHeight}
            onChange={(e) => handleChange({ roomHeight: parseFloat(e.target.value) || 0 })}
            min={7}
            max={12}
            step={0.5}
          />
        </div>
      </div>

      {/* Layout Style */}
      <div>
        <Label htmlFor="layoutStyle" className="text-xs">Layout Style</Label>
        <Select value={config.layoutStyle} onValueChange={(value: any) => handleChange({ layoutStyle: value })}>
          <SelectTrigger id="layoutStyle">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="L-shape">L-Shape</SelectItem>
            <SelectItem value="U-shape">U-Shape</SelectItem>
            <SelectItem value="galley">Galley</SelectItem>
            <SelectItem value="island">Island</SelectItem>
            <SelectItem value="one-wall">One-Wall</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cabinet Finish */}
      <div>
        <Label htmlFor="cabinetFinish" className="text-xs">Cabinet Finish</Label>
        <Select value={config.cabinetFinish} onValueChange={(value: any) => handleChange({ cabinetFinish: value })}>
          <SelectTrigger id="cabinetFinish">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="White">White</SelectItem>
            <SelectItem value="Oak">Oak</SelectItem>
            <SelectItem value="Walnut">Walnut</SelectItem>
            <SelectItem value="Gray">Gray</SelectItem>
            <SelectItem value="Black">Black</SelectItem>
            <SelectItem value="Cherry">Cherry</SelectItem>
            <SelectItem value="Maple">Maple</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Countertop Material */}
      <div>
        <Label htmlFor="countertopMaterial" className="text-xs">Countertop Material</Label>
        <Select value={config.countertopMaterial} onValueChange={(value: any) => handleChange({ countertopMaterial: value })}>
          <SelectTrigger id="countertopMaterial">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Laminate">Laminate</SelectItem>
            <SelectItem value="Granite">Granite</SelectItem>
            <SelectItem value="Quartz">Quartz</SelectItem>
            <SelectItem value="Marble">Marble</SelectItem>
            <SelectItem value="Butcher Block">Butcher Block</SelectItem>
            <SelectItem value="Concrete">Concrete</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Features */}
      <div className="space-y-3 pt-2 border-t">
        <h4 className="text-sm font-medium">Features</h4>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="hasIsland" className="text-xs">Kitchen Island</Label>
          <Switch
            id="hasIsland"
            checked={config.hasIsland}
            onCheckedChange={(checked) => handleChange({ hasIsland: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="hasPantry" className="text-xs">Pantry Cabinet</Label>
          <Switch
            id="hasPantry"
            checked={config.hasPantry}
            onCheckedChange={(checked) => handleChange({ hasPantry: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="hasBacksplash" className="text-xs">Tile Backsplash</Label>
          <Switch
            id="hasBacksplash"
            checked={config.hasBacksplash}
            onCheckedChange={(checked) => handleChange({ hasBacksplash: checked })}
          />
        </div>
      </div>

      {/* Grid Settings */}
      <div className="space-y-3 pt-2 border-t">
        <h4 className="text-sm font-medium">Grid Settings</h4>
        
        <div>
          <Label htmlFor="gridSize" className="text-xs">
            Grid Size: {config.gridSize} inches
          </Label>
          <Slider
            id="gridSize"
            value={[config.gridSize]}
            onValueChange={([value]) => handleChange({ gridSize: value })}
            min={1}
            max={12}
            step={1}
            className="mt-2"
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="showGrid" className="text-xs">Show Grid</Label>
          <Switch
            id="showGrid"
            checked={config.showGrid}
            onCheckedChange={(checked) => handleChange({ showGrid: checked })}
          />
        </div>
      </div>
    </div>
  );
}
