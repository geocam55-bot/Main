import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Save, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { settingsAPI } from '../../utils/api';

interface EnvironmentSettingField {
  key: string;
  label: string;
  description: string;
  secret?: boolean;
  type?: string;
}

const SYSTEM_FIELDS: EnvironmentSettingField[] = [
  { key: 'APP_URL', label: 'Application URL', description: 'Public URL used in system-generated links.' },
  { key: 'VITE_APP_URL', label: 'Application URL (legacy)', description: 'Public URL used by older system-generated links.' },
  { key: 'SUPPORT_EMAIL_ADDRESS', label: 'Support email', description: 'Sender and contact address for system emails.' },
  { key: 'SYSTEM_SMTP_HOST', label: 'SMTP host', description: 'Mail server hostname for system-generated emails.' },
  { key: 'SYSTEM_SMTP_PORT', label: 'SMTP port', description: 'Mail server port, commonly 587.', type: 'number' },
  { key: 'SYSTEM_SMTP_SECURITY', label: 'SMTP security', description: 'Transport security mode, commonly tls.' },
  { key: 'SYSTEM_SMTP_USERNAME', label: 'SMTP username', description: 'Authentication username for the system mail server.' },
  { key: 'SYSTEM_SMTP_PASSWORD', label: 'SMTP password', description: 'Authentication password for the system mail server.', secret: true },
  { key: 'SMTP_HOST', label: 'SMTP host (legacy)', description: 'SMTP host used by legacy mail senders.' },
  { key: 'SMTP_PORT', label: 'SMTP port (legacy)', description: 'SMTP port used by legacy mail senders.', type: 'number' },
  { key: 'SMTP_USER', label: 'SMTP username (legacy)', description: 'SMTP username used by legacy mail senders.' },
  { key: 'SMTP_PASS', label: 'SMTP password (legacy)', description: 'SMTP password used by legacy mail senders.', secret: true },
  { key: 'SMTP_FROM', label: 'SMTP sender address (legacy)', description: 'From address used by legacy mail senders.' },
  { key: 'GEMINI_API_KEY', label: 'Gemini API key', description: 'System-wide key for AI services.', secret: true },
  { key: 'GOOGLE_MAPS_PLATFORM_KEY', label: 'Google Maps API key', description: 'System-wide key for map services.', secret: true },
  { key: 'AZURE_CLIENT_ID', label: 'Microsoft OAuth client ID', description: 'Application client ID for Microsoft sign-in.' },
  { key: 'AZURE_CLIENT_SECRET', label: 'Microsoft OAuth client secret', description: 'Application secret for Microsoft sign-in.', secret: true },
  { key: 'AZURE_TENANT_ID', label: 'Microsoft OAuth tenant ID', description: 'Directory tenant ID, or common for multi-tenant sign-in.' },
  { key: 'AZURE_REDIRECT_URI', label: 'Microsoft OAuth redirect URI', description: 'Registered redirect URL for Microsoft sign-in.' },
  { key: 'GOOGLE_CLIENT_ID', label: 'Google OAuth client ID', description: 'Application client ID for Google sign-in.' },
  { key: 'GOOGLE_CLIENT_SECRET', label: 'Google OAuth client secret', description: 'Application secret for Google sign-in.', secret: true },
  { key: 'GOOGLE_REDIRECT_URI', label: 'Google OAuth redirect URI', description: 'Registered redirect URL for Google sign-in.' },
];

const TENANT_FIELDS: EnvironmentSettingField[] = [
  { key: 'FLEET_COMPLETE_URL', label: 'Fleet Complete API URL', description: 'Base URL for the tenant Fleet Complete account.' },
  { key: 'FLEET_COMPLETE_API_URL', label: 'Fleet Complete token URL', description: 'Authentication endpoint for the tenant Fleet Complete account.' },
  { key: 'FLEET_COMPLETE_ORG_UUID', label: 'Fleet Complete organization ID', description: 'Organization identifier in Fleet Complete.' },
  { key: 'FLEET_COMPLETE_USERNAME', label: 'Fleet Complete username', description: 'Username for the tenant Fleet Complete account.' },
  { key: 'FLEET_COMPLETE_PASSWORD', label: 'Fleet Complete password', description: 'Password for the tenant Fleet Complete account.', secret: true },
  { key: 'FLEET_COMPLETE_API_KEY', label: 'Fleet Complete API key', description: 'API key or token for the tenant Fleet Complete account.', secret: true },
];

interface Props {
  scope: 'system' | 'tenant';
  organizationId?: string;
}

export function EnvironmentSettingsPanel({ scope, organizationId }: Props) {
  const fields = scope === 'system' ? SYSTEM_FIELDS : TENANT_FIELDS;
  const [values, setValues] = useState<Record<string, string>>({});
  const [configuredSecrets, setConfiguredSecrets] = useState<string[]>([]);
  const [clearSecrets, setClearSecrets] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await settingsAPI.getEnvironmentSettings(scope, organizationId);
      setValues(result.values || {});
      setConfiguredSecrets(result.configuredSecrets || []);
      setClearSecrets([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load settings.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [scope, organizationId]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      await settingsAPI.saveEnvironmentSettings(scope, values, clearSecrets, organizationId);
      toast.success(`${scope === 'system' ? 'System' : 'Tenant'} settings saved.`);
      await loadSettings();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save settings.';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /><span className="ml-2">Loading settings...</span></div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{scope === 'system' ? 'System Variables' : 'Tenant Variables'}</CardTitle>
          <CardDescription>
            {scope === 'system'
              ? 'Shared configuration for system services. Database settings override deployment values where supported. Supabase connection and service-role credentials must remain in deployment secrets. Supabase Auth password-reset delivery is configured separately in Supabase Auth SMTP settings.'
              : 'Configuration stored for this organization. Tenant values are isolated from other organizations.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {fields.map((field) => {
            const isConfigured = configuredSecrets.includes(field.key);
            const markedToClear = clearSecrets.includes(field.key);
            return (
              <div key={field.key} className="grid gap-2 sm:grid-cols-[minmax(12rem,1fr)_2fr] sm:items-center">
                <div className="space-y-1">
                  <Label htmlFor={`${scope}-${field.key}`}>{field.label}</Label>
                  <p className="text-xs text-muted-foreground">{field.description}</p>
                  <code className="text-xs text-muted-foreground">{field.key}</code>
                </div>
                <div className="space-y-2">
                  <Input
                    id={`${scope}-${field.key}`}
                    type={field.secret ? 'password' : (field.type || 'text')}
                    autoComplete="off"
                    value={values[field.key] || ''}
                    placeholder={field.secret && isConfigured ? 'Saved securely; enter a replacement or leave blank' : ''}
                    disabled={markedToClear}
                    onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                  />
                  {field.secret && isConfigured && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setClearSecrets((current) => (
                        markedToClear ? current.filter((key) => key !== field.key) : [...current, field.key]
                      ))}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {markedToClear ? 'Keep saved value' : 'Remove saved value'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          <div className="flex justify-end border-t pt-4">
            <Button type="button" onClick={saveSettings} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
