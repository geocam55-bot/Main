import { useState, useEffect } from 'react';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { CustomField } from './settings/CustomFieldsDialog';
import { CalendarIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { format } from 'date-fns';
import { cn } from './ui/utils';

interface CustomFieldsRendererProps {
  entityType: 'contact' | 'deal' | 'task' | 'company';
  organizationId: string;
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  className?: string;
}

export function CustomFieldsRenderer({ 
  entityType, 
  organizationId, 
  values, 
  onChange,
  className 
}: CustomFieldsRendererProps) {
  const [fields, setFields] = useState<CustomField[]>([]);

  useEffect(() => {
    if (organizationId) {
      const stored = localStorage.getItem(`custom_fields_${organizationId}`);
      if (stored) {
        try {
          const allFields = JSON.parse(stored) as CustomField[];
          setFields(allFields.filter(f => f.entityType === entityType));
        } catch (e) {
          // Failed to parse custom fields – non-critical
        }
      }
    }
  }, [organizationId, entityType]);

  if (fields.length === 0) return null;

  return (
    <div className={cn("space-y-4 border-t pt-4 mt-4", className)}>
      <h3 className="text-sm font-medium text-muted-foreground mb-2">Additional Information</h3>
      <div className="grid md:grid-cols-2 gap-4">
        {fields.map(field => {
          const value = values[field.key];
          
          return (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={`cf-${field.key}`}>
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              
              {field.type === 'text' && (
                <Input
                  id={`cf-${field.key}`}
                  value={value || ''}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  placeholder={field.label}
                  required={field.required}
                />
              )}
              
              {field.type === 'number' && (
                <Input
                  id={`cf-${field.key}`}
                  type="number"
                  value={value || ''}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  placeholder="0"
                  required={field.required}
                />
              )}
              
              {field.type === 'boolean' && (
                <div className="flex items-center space-x-2 h-10">
                  <Switch
                    id={`cf-${field.key}`}
                    checked={!!value}
                    onCheckedChange={(checked) => onChange(field.key, checked)}
                  />
                  <Label htmlFor={`cf-${field.key}`} className="font-normal cursor-pointer">
                    {value ? 'Yes' : 'No'}
                  </Label>
                </div>
              )}
              
              {field.type === 'select' && (
                <Select 
                  value={value || ''} 
                  onValueChange={(val) => onChange(field.key, val)}
                  required={field.required}
                >
                  <SelectTrigger id={`cf-${field.key}`}>
                    <SelectValue placeholder={`Select ${field.label}...`} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((opt, i) => (
                      <SelectItem key={i} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {field.type === 'date' && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !value && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {value ? format(new Date(value), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={value ? new Date(value) : undefined}
                      onSelect={(date) => onChange(field.key, date?.toISOString())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}