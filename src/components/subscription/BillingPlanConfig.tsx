import { useState, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  DollarSign,
  Zap,
  Crown,
  Building2,
  Save,
  RotateCcw,
  Plus,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Star,
  Eye,
  EyeOff,
  Clock,
  Percent,
  FileText,
  GripVertical,
} from 'lucide-react';
import {
  getPlanConfig,
  savePlanConfig,
  formatCurrency,
  type BillingPlanConfig as BillingPlanConfigType,
  type PlanConfig,
} from '../../utils/subscription-client';

interface BillingPlanConfigProps {
  user: { id: string; role: string; organizationId?: string };
  onConfigSaved?: () => void;
}

const PLAN_ICONS: Record<string, typeof Zap> = {
  starter: Zap,
  professional: Crown,
  enterprise: Building2,
};

const PLAN_HEADER_COLORS: Record<string, string> = {
  starter: 'from-blue-500 to-blue-600',
  professional: 'from-purple-500 to-purple-600',
  enterprise: 'from-amber-500 to-amber-600',
};

export function BillingPlanConfig({ user, onConfigSaved }: BillingPlanConfigProps) {
  const [config, setConfig] = useState<BillingPlanConfigType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalConfig, setOriginalConfig] = useState<BillingPlanConfigType | null>(null);
  const [newFeatureInputs, setNewFeatureInputs] = useState<Record<string, string>>({});
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({
    starter: true,
    professional: true,
    enterprise: true,
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const data = await getPlanConfig();
      setConfig(data);
      setOriginalConfig(JSON.parse(JSON.stringify(data)));
      setHasChanges(false);
    } catch (error: any) {
      toast.error(`Failed to load plan configuration: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    try {
      setIsSaving(true);
      const saved = await savePlanConfig(config);
      setConfig(saved);
      setOriginalConfig(JSON.parse(JSON.stringify(saved)));
      setHasChanges(false);
      toast.success('Billing plan configuration saved successfully');
      if (onConfigSaved) {
        onConfigSaved();
      }
    } catch (error: any) {
      toast.error(`Failed to save plan configuration: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (originalConfig) {
      setConfig(JSON.parse(JSON.stringify(originalConfig)));
      setHasChanges(false);
      toast.info('Changes reverted');
    }
  };

  const updatePlan = (planId: string, field: keyof PlanConfig, value: any) => {
    if (!config) return;
    const updated = { ...config };
    updated.plans = { ...updated.plans };
    updated.plans[planId] = { ...updated.plans[planId], [field]: value };
    setConfig(updated);
    setHasChanges(true);
  };

  const updateGlobalSetting = (field: string, value: any) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
    setHasChanges(true);
  };

  const addFeature = (planId: string) => {
    const featureText = newFeatureInputs[planId]?.trim();
    if (!featureText || !config) return;
    const currentFeatures = [...(config.plans[planId]?.features || [])];
    if (currentFeatures.includes(featureText)) {
      toast.error('This feature already exists');
      return;
    }
    currentFeatures.push(featureText);
    updatePlan(planId, 'features', currentFeatures);
    setNewFeatureInputs({ ...newFeatureInputs, [planId]: '' });
  };

  const removeFeature = (planId: string, index: number) => {
    if (!config) return;
    const currentFeatures = [...(config.plans[planId]?.features || [])];
    currentFeatures.splice(index, 1);
    updatePlan(planId, 'features', currentFeatures);
  };

  const moveFeature = (planId: string, index: number, direction: 'up' | 'down') => {
    if (!config) return;
    const currentFeatures = [...(config.plans[planId]?.features || [])];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= currentFeatures.length) return;
    [currentFeatures[index], currentFeatures[newIndex]] = [currentFeatures[newIndex], currentFeatures[index]];
    updatePlan(planId, 'features', currentFeatures);
  };

  const recalcAnnual = (planId: string) => {
    if (!config) return;
    const plan = config.plans[planId];
    if (!plan) return;
    const discountMultiplier = 1 - (config.annualDiscountPercent / 100);
    const annualPrice = Math.round(plan.price * 12 * discountMultiplier);
    updatePlan(planId, 'priceAnnual', annualPrice);
  };

  const togglePlanExpanded = (planId: string) => {
    setExpandedPlans({ ...expandedPlans, [planId]: !expandedPlans[planId] });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
          <span className="text-muted-foreground">Loading billing plan configuration...</span>
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load billing plan configuration. Please try again.
            </AlertDescription>
          </Alert>
          <Button onClick={loadConfig} className="mt-4" variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const planOrder = ['starter', 'professional', 'enterprise'];

  return (
    <div className="space-y-6">
      {/* Header with save/reset */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Billing Plans Configuration</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Configure default pricing, features, and options for each subscription plan
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  Unsaved Changes
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={!hasChanges || isSaving}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </CardHeader>
        {config.updated_at && (
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              Last updated: {new Date(config.updated_at).toLocaleString()}
            </p>
          </CardContent>
        )}
      </Card>

      {/* Global Billing Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Global Billing Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm">Default Currency</Label>
              <Select
                value={config.currency}
                onValueChange={(v) => updateGlobalSetting('currency', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="CAD">CAD (C$)</SelectItem>
                  <SelectItem value="AUD">AUD (A$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Free Trial Duration (days)
              </Label>
              <Input
                type="number"
                min={0}
                max={90}
                value={config.trialDays}
                onChange={(e) => updateGlobalSetting('trialDays', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label className="text-sm flex items-center gap-1">
                <Percent className="h-3.5 w-3.5" />
                Annual Discount %
              </Label>
              <Input
                type="number"
                min={0}
                max={50}
                value={config.annualDiscountPercent}
                onChange={(e) => updateGlobalSetting('annualDiscountPercent', parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Applied when recalculating annual prices
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Label className="text-sm">Billing Terms & Conditions</Label>
            <Textarea
              value={config.billingTerms}
              onChange={(e) => updateGlobalSetting('billingTerms', e.target.value)}
              rows={2}
              placeholder="Payment terms displayed on invoices and checkout..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Individual Plan Cards */}
      {planOrder.map((planId) => {
        const plan = config.plans[planId];
        if (!plan) return null;
        const Icon = PLAN_ICONS[planId] || Zap;
        const isExpanded = expandedPlans[planId];

        return (
          <Card key={planId} className={`overflow-hidden ${!plan.visible ? 'opacity-60' : ''}`}>
            {/* Plan header ribbon */}
            <div
              className={`bg-gradient-to-r ${PLAN_HEADER_COLORS[planId]} px-6 py-3 flex items-center justify-between cursor-pointer`}
              onClick={() => togglePlanExpanded(planId)}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-white" />
                <div>
                  <h3 className="text-white font-semibold text-base">{plan.name}</h3>
                  <p className="text-white/70 text-xs">
                    {formatCurrency(plan.price, config.currency)}/mo
                    {' '}&bull;{' '}
                    {formatCurrency(plan.priceAnnual, config.currency)}/yr
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {plan.popular && (
                  <Badge className="bg-background/20 text-white border-white/30 text-xs">
                    <Star className="h-3 w-3 mr-1 fill-current" /> Popular
                  </Badge>
                )}
                {!plan.visible && (
                  <Badge className="bg-background/20 text-white border-white/30 text-xs">
                    <EyeOff className="h-3 w-3 mr-1" /> Hidden
                  </Badge>
                )}
                {plan.trialEnabled && (
                  <Badge className="bg-background/20 text-white border-white/30 text-xs">
                    <Clock className="h-3 w-3 mr-1" /> Trial
                  </Badge>
                )}
                <span className="text-white/60 text-sm">
                  {isExpanded ? '▲' : '▼'}
                </span>
              </div>
            </div>

            {isExpanded && (
              <CardContent className="pt-5 space-y-5">
                {/* Plan identity & pricing */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-sm">Plan Name</Label>
                    <Input
                      value={plan.name}
                      onChange={(e) => updatePlan(planId, 'name', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Monthly Price ($)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={plan.price}
                        onChange={(e) => updatePlan(planId, 'price', parseFloat(e.target.value) || 0)}
                        className="pl-7"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm flex items-center justify-between">
                      <span>Annual Price ($)</span>
                      <button
                        type="button"
                        className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                        onClick={() => recalcAnnual(planId)}
                      >
                        Auto-calc
                      </button>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={plan.priceAnnual}
                        onChange={(e) => updatePlan(planId, 'priceAnnual', parseFloat(e.target.value) || 0)}
                        className="pl-7"
                      />
                    </div>
                    {plan.price > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Savings: {Math.round((1 - plan.priceAnnual / (plan.price * 12)) * 100)}% off monthly
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm">Currency</Label>
                    <Select
                      value={plan.currency || config.currency}
                      onValueChange={(v) => updatePlan(planId, 'currency', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="CAD">CAD (C$)</SelectItem>
                        <SelectItem value="AUD">AUD (A$)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <Label className="text-sm">Description</Label>
                  <Textarea
                    value={plan.description || ''}
                    onChange={(e) => updatePlan(planId, 'description', e.target.value)}
                    rows={2}
                    placeholder="Brief description shown on pricing page..."
                  />
                </div>

                {/* Toggles */}
                <div className="flex flex-wrap gap-6 py-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`${planId}-visible`}
                      checked={plan.visible}
                      onCheckedChange={(v) => updatePlan(planId, 'visible', v)}
                    />
                    <Label htmlFor={`${planId}-visible`} className="text-sm flex items-center gap-1 cursor-pointer">
                      {plan.visible ? <Eye className="h-3.5 w-3.5 text-green-600" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                      Visible on pricing page
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`${planId}-popular`}
                      checked={plan.popular}
                      onCheckedChange={(v) => {
                        // Unset popular on other plans when setting this one
                        if (v && config) {
                          const updated = { ...config };
                          updated.plans = { ...updated.plans };
                          for (const key of Object.keys(updated.plans)) {
                            updated.plans[key] = { ...updated.plans[key], popular: key === planId };
                          }
                          setConfig(updated);
                          setHasChanges(true);
                        } else {
                          updatePlan(planId, 'popular', v);
                        }
                      }}
                    />
                    <Label htmlFor={`${planId}-popular`} className="text-sm flex items-center gap-1 cursor-pointer">
                      <Star className={`h-3.5 w-3.5 ${plan.popular ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                      Mark as "Most Popular"
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`${planId}-trial`}
                      checked={plan.trialEnabled}
                      onCheckedChange={(v) => updatePlan(planId, 'trialEnabled', v)}
                    />
                    <Label htmlFor={`${planId}-trial`} className="text-sm flex items-center gap-1 cursor-pointer">
                      <Clock className={`h-3.5 w-3.5 ${plan.trialEnabled ? 'text-blue-500' : 'text-muted-foreground'}`} />
                      Free trial available ({config.trialDays} days)
                    </Label>
                  </div>
                </div>

                {/* Features list */}
                <div>
                  <Label className="text-sm mb-2 block">Plan Features</Label>
                  <div className="space-y-1.5">
                    {(plan.features || []).map((feature, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 group bg-muted rounded-md px-3 py-1.5"
                      >
                        <GripVertical className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        <span className="text-sm text-foreground flex-1">{feature}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => moveFeature(planId, idx, 'up')}
                            disabled={idx === 0}
                            className="p-0.5 text-muted-foreground hover:text-muted-foreground disabled:opacity-30"
                            title="Move up"
                          >
                            <span className="text-xs">&#9650;</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => moveFeature(planId, idx, 'down')}
                            disabled={idx === (plan.features?.length || 0) - 1}
                            className="p-0.5 text-muted-foreground hover:text-muted-foreground disabled:opacity-30"
                            title="Move down"
                          >
                            <span className="text-xs">&#9660;</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFeature(planId, idx)}
                            className="p-0.5 text-red-400 hover:text-red-600"
                            title="Remove feature"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      value={newFeatureInputs[planId] || ''}
                      onChange={(e) =>
                        setNewFeatureInputs({ ...newFeatureInputs, [planId]: e.target.value })
                      }
                      placeholder="Add a new feature..."
                      className="text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addFeature(planId);
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addFeature(planId)}
                      disabled={!newFeatureInputs[planId]?.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Preview Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            Pricing Preview
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            How the plans will appear to customers
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {planOrder.map((planId) => {
              const plan = config.plans[planId];
              if (!plan || !plan.visible) return null;
              const Icon = PLAN_ICONS[planId] || Zap;

              return (
                <div
                  key={planId}
                  className={`relative rounded-xl border-2 p-5 ${
                    plan.popular ? 'border-purple-400 shadow-lg shadow-purple-100' : 'border-border'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-purple-600 text-white text-xs px-3">Most Popular</Badge>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${PLAN_HEADER_COLORS[planId]} flex items-center justify-center`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <h4 className="font-semibold text-foreground">{plan.name}</h4>
                  </div>
                  {plan.description && (
                    <p className="text-xs text-muted-foreground mb-3">{plan.description}</p>
                  )}
                  <div className="mb-4">
                    <span className="text-2xl font-bold text-foreground">
                      {formatCurrency(plan.price, plan.currency || config.currency)}
                    </span>
                    <span className="text-sm text-muted-foreground">/month</span>
                  </div>
                  <div className="text-xs text-muted-foreground mb-4">
                    or {formatCurrency(plan.priceAnnual, plan.currency || config.currency)}/year
                    {plan.price > 0 && (
                      <span className="text-green-600 ml-1">
                        (save {Math.round((1 - plan.priceAnnual / (plan.price * 12)) * 100)}%)
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {(plan.features || []).slice(0, 5).map((f, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                        <span className="text-xs text-muted-foreground">{f}</span>
                      </div>
                    ))}
                    {(plan.features || []).length > 5 && (
                      <p className="text-xs text-muted-foreground pl-5">
                        +{(plan.features || []).length - 5} more features
                      </p>
                    )}
                  </div>
                  {plan.trialEnabled && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-blue-600">
                        {config.trialDays}-day free trial available
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sticky save bar */}
      {hasChanges && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-gray-900 text-white rounded-lg shadow-2xl px-6 py-3 flex items-center gap-4">
            <AlertCircle className="h-4 w-4 text-yellow-400" />
            <span className="text-sm">You have unsaved changes to billing plans</span>
            <Button
              size="sm"
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
              onClick={handleReset}
              disabled={isSaving}
            >
              Discard
            </Button>
            <Button
              size="sm"
              className="bg-indigo-500 hover:bg-indigo-600 text-white"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}