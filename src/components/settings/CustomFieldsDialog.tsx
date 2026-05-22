import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Plus, Trash2, Save, AlertCircle, List, Type, Hash, Calendar, CheckSquare } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Switch } from '../ui/switch';

export interface CustomField {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select';
  options?: string[]; // For select type
  required: boolean;
  entityType: 'contact' | 'deal' | 'task' | 'company';
}

interface CustomFieldsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId?: string;
}

export function CustomFieldsDialog({ open, onOpenChange, organizationId }: CustomFieldsDialogProps) {
  const [activeTab, setActiveTab] = useState('contact');
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  
  // New field state
  const [newField, setNewField] = useState<Partial<CustomField>>({
    label: '',
    type: 'text',
    required: false,
    options: []
  });
  const [newOption, setNewOption] = useState('');

  // Load fields from localStorage on mount
  useEffect(() => {
    if (open && organizationId) {
      const stored = localStorage.getItem(`custom_fields_${organizationId}`);
      if (stored) {
        try {
          setCustomFields(JSON.parse(stored));
        } catch (e) {
          // Failed to parse custom fields – using defaults
        }
      } else {
        // Default example fields if none exist
        setCustomFields([
          { id: '1', key: 'referral_source', label: 'Referral Source', type: 'select', options: ['Google', 'LinkedIn', 'Friend'], required: false, entityType: 'contact' },
          { id: '2', key: 'budget_confirmed', label: 'Budget Confirmed', type: 'boolean', required: false, entityType: 'deal' },
        ]);
      }
    }
  }, [open, organizationId]);

  const handleSave = () => {
    if (organizationId) {
      localStorage.setItem(`custom_fields_${organizationId}`, JSON.stringify(customFields));
      toast.success('Custom fields configuration saved');
    }
    onOpenChange(false);
  };

  const generateKey = (label: string) => {
    return label.toLowerCase().replace(/[^a-z0-9]/g, '_');
  };

  const handleAddField = () => {
    if (!newField.label || !newField.type) {
      toast.error('Please fill in the field label');
      return;
    }

    const field: CustomField = {
      id: Math.random().toString(36).substring(2, 9),
      key: generateKey(newField.label),
      label: newField.label,
      type: newField.type as CustomField['type'],
      required: newField.required || false,
      options: newField.options || [],
      entityType: activeTab as CustomField['entityType'],
    };

    setCustomFields([...customFields, field]);
    setNewField({ label: '', type: 'text', required: false, options: [] });
    setIsEditing(false);
    toast.success('Custom field added');
  };

  const handleDeleteField = (id: string) => {
    setCustomFields(customFields.filter(f => f.id !== id));
    toast.success('Field removed');
  };

  const handleAddOption = () => {
    if (newOption.trim()) {
      setNewField({
        ...newField,
        options: [...(newField.options || []), newOption.trim()]
      });
      setNewOption('');
    }
  };

  const handleRemoveOption = (optToRemove: string) => {
    setNewField({
      ...newField,
      options: (newField.options || []).filter(o => o !== optToRemove)
    });
  };

  const filteredFields = customFields.filter(f => f.entityType === activeTab);

  const getIconForType = (type: string) => {
    switch (type) {
      case 'text': return <Type className="h-4 w-4" />;
      case 'number': return <Hash className="h-4 w-4" />;
      case 'date': return <Calendar className="h-4 w-4" />;
      case 'boolean': return <CheckSquare className="h-4 w-4" />;
      case 'select': return <List className="h-4 w-4" />;
      default: return <Type className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-background dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle>Manage Custom Fields</DialogTitle>
          <DialogDescription>
            Extend your data models with custom fields to track specific business information.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="contact" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="contact">Contacts</TabsTrigger>
            <TabsTrigger value="company">Companies</TabsTrigger>
            <TabsTrigger value="deal">Deals</TabsTrigger>
            <TabsTrigger value="task">Tasks</TabsTrigger>
          </TabsList>
          
          <div className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium text-foreground dark:text-gray-100 capitalize">{activeTab} Fields</h3>
                <p className="text-xs text-muted-foreground">Define additional data points for {activeTab}s</p>
              </div>
              <Button size="sm" onClick={() => setIsEditing(true)} disabled={isEditing}>
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            </div>

            {isEditing && (
              <Card className="border-dashed border-2 bg-muted dark:bg-gray-800/50">
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Field Label</Label>
                      <Input 
                        placeholder="e.g. Employee Count" 
                        value={newField.label}
                        onChange={(e) => setNewField({...newField, label: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Field Type</Label>
                      <Select 
                        value={newField.type} 
                        onValueChange={(val: any) => setNewField({...newField, type: val})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text (String)</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="boolean">Checkbox (Yes/No)</SelectItem>
                          <SelectItem value="select">Dropdown Select</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {newField.type === 'select' && (
                    <div className="space-y-2 bg-background p-3 rounded border">
                      <Label>Dropdown Options</Label>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Add option..." 
                          value={newOption}
                          onChange={(e) => setNewOption(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                        />
                        <Button type="button" size="sm" variant="secondary" onClick={handleAddOption}>Add</Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {newField.options?.map((opt, i) => (
                          <span key={i} className="bg-muted text-foreground text-xs px-2 py-1 rounded flex items-center gap-1">
                            {opt}
                            <button onClick={() => handleRemoveOption(opt)} className="hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                          </span>
                        ))}
                        {(!newField.options || newField.options.length === 0) && (
                          <span className="text-xs text-muted-foreground italic">No options added yet</span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="required-mode" 
                      checked={newField.required} 
                      onCheckedChange={(checked) => setNewField({...newField, required: checked})}
                    />
                    <Label htmlFor="required-mode">Required Field</Label>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t mt-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleAddField}>Save Field</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              {filteredFields.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border rounded-md bg-muted/50">
                  <List className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                  <p>No custom fields defined for {activeTab}s.</p>
                </div>
              ) : (
                filteredFields.map(field => (
                  <Card key={field.id} className="overflow-hidden hover:border-blue-300 transition-colors">
                    <div className="flex items-center justify-between p-4 bg-background dark:bg-gray-800">
                      <div className="flex items-center gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-blue-600 dark:text-blue-400">
                          {getIconForType(field.type)}
                        </div>
                        <div>
                          <h4 className="font-medium text-sm flex items-center gap-2">
                            {field.label}
                            {field.required && <span className="text-xs text-red-500 font-normal">(Required)</span>}
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span className="font-mono bg-muted dark:bg-gray-700 px-1 rounded">{field.key}</span>
                            <span className="capitalize">{field.type}</span>
                            {field.options && field.options.length > 0 && (
                              <span className="text-muted-foreground">[{field.options.length} options]</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteField(field.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
            
            <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-md border border-amber-100 dark:border-amber-900/20 flex gap-3 items-start mt-6">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-semibold mb-1">Developer Note</p>
                <p>
                  Custom fields are stored in the organization settings. 
                  Developers can access these fields via the <code>custom_fields</code> key in the settings object.
                  The UI will automatically render these fields in the respective edit forms.
                </p>
              </div>
            </div>
          </div>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}