import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { tenantsAPI } from '../utils/api';
import { toast } from 'sonner@2.0.3';

interface AIToggleSwitchProps {
  organizationId?: string;
  organizationName?: string;
  initialEnabled?: boolean;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onToggle?: (enabled: boolean) => void;
}

export function AIToggleSwitch({ 
  organizationId, 
  organizationName, 
  initialEnabled, 
  checked,
  onCheckedChange,
  onToggle 
}: AIToggleSwitchProps) {
  const [isEnabled, setIsEnabled] = useState(initialEnabled || checked || false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async () => {
    const newValue = !isEnabled;
    
    // If we have a direct checked/onCheckedChange callback (used in forms)
    if (onCheckedChange) {
      onCheckedChange(newValue);
      setIsEnabled(newValue);
      return;
    }
    
    // Otherwise update via API (used in tenant cards)
    if (!organizationId || !organizationName) return;
    
    try {
      setIsUpdating(true);
      
      await tenantsAPI.updateFeatures(organizationId, {
        ai_suggestions_enabled: newValue
      });
      
      setIsEnabled(newValue);
      onToggle?.(newValue);
      
      toast.success(
        `AI Suggestions ${newValue ? 'enabled' : 'disabled'} for ${organizationName}. ` +
        `Users will need to refresh their browser to see the change.`
      );
    } catch (error) {
      // Failed to toggle AI Suggestions
      toast.error('Failed to update feature setting');
    } finally {
      setIsUpdating(false);
    }
  };

  // Sync with external checked prop
  if (checked !== undefined && checked !== isEnabled) {
    setIsEnabled(checked);
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isUpdating}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        isEnabled ? 'bg-purple-600' : 'bg-muted'
      } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
          isEnabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}