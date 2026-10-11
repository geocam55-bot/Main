import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { toast } from 'sonner@2.0.3';
import { Shield, Save, RefreshCw } from 'lucide-react';

interface EnvironmentSettingsPanelProps {
  scope: 'tenant' | 'system';
  organizationId?: string;
}

export function EnvironmentSettingsPanel({ scope, organizationId }: EnvironmentSettingsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    apiEndpoint: 'https://api.prospaces.com/v1',
    timeoutSeconds: '30',
    debugMode: false,
    environmentName: scope === 'system' ? 'Production Global' : `Organization (${organizationId || 'Default'})`,
    rateLimitingEnabled: true,
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Simulate saving settings
      await new Promise(resolve => setTimeout(resolve, 800));
      toast.success(`${scope === 'system' ? 'System' : 'Tenant'} environment settings saved successfully!`);
    } catch (err: any) {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-primary" />
              {scope === 'system' ? 'System Environment Configuration' : 'Tenant Environment Configuration'}
            </CardTitle>
            <CardDescription>
              {scope === 'system'
                ? 'Configure global system-wide environment parameters, API gateways, and defaults.'
                : 'Configure organization-specific environment overrides and operational parameters.'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="env-name">Environment Title / Name</Label>
              <Input
                id="env-name"
                value={settings.environmentName}
                onChange={(e) => setSettings({ ...settings, environmentName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api-endpoint">Primary API Endpoint</Label>
              <Input
                id="api-endpoint"
                value={settings.apiEndpoint}
                onChange={(e) => setSettings({ ...settings, apiEndpoint: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeout">Request Timeout (seconds)</Label>
              <Input
                id="timeout"
                type="number"
                value={settings.timeoutSeconds}
                onChange={(e) => setSettings({ ...settings, timeoutSeconds: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Debug Mode</Label>
                <p className="text-sm text-muted-foreground">Enable verbose logging and diagnostic telemetry.</p>
              </div>
              <Switch
                checked={settings.debugMode}
                onCheckedChange={(checked) => setSettings({ ...settings, debugMode: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">API Rate Limiting</Label>
                <p className="text-sm text-muted-foreground">Enforce inbound rate limits to prevent abuse.</p>
              </div>
              <Switch
                checked={settings.rateLimitingEnabled}
                onCheckedChange={(checked) => setSettings({ ...settings, rateLimitingEnabled: checked })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => toast.info('Settings reset to defaults')}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
