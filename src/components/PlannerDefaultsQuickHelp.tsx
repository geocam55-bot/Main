import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { 
  HelpCircle, 
  ChevronDown, 
  ChevronUp,
  Settings as SettingsIcon,
  Save,
  RefreshCw,
  Database,
  CheckCircle2,
  Info
} from 'lucide-react';

export function PlannerDefaultsQuickHelp() {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <HelpCircle className="h-5 w-5 text-blue-600" />
            Quick Help: Planner Defaults
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-blue-600"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                More
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Always Visible - Quick Summary */}
        <Alert className="bg-background border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-900">
            <strong>What are Planner Defaults?</strong> Customize which inventory items are automatically 
            selected when you create new projects. Your choices are saved across all your devices.
          </AlertDescription>
        </Alert>

        {expanded && (
          <div className="space-y-3">
            {/* How It Works */}
            <div className="bg-background p-3 rounded-lg border border-blue-200">
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <SettingsIcon className="h-4 w-4 text-blue-600" />
                How It Works
              </h4>
              <ul className="text-xs space-y-1 text-foreground">
                <li>• <strong>Organization Defaults:</strong> Set by admins in Settings, shared by everyone</li>
                <li>• <strong>Your Custom Defaults:</strong> Override organization defaults with your personal preferences</li>
                <li>• <strong>Visual Indicators:</strong> Items marked "Custom" show you've personalized them</li>
              </ul>
            </div>

            {/* Key Actions */}
            <div className="bg-background p-3 rounded-lg border border-blue-200">
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                Key Actions
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <Save className="h-3 w-3 mt-0.5 text-blue-600 flex-shrink-0" />
                  <div>
                    <strong>Save My Defaults:</strong> Stores your customizations to the database. 
                    Available on all your devices.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <RefreshCw className="h-3 w-3 mt-0.5 text-blue-600 flex-shrink-0" />
                  <div>
                    <strong>Restore Organization Defaults:</strong> Removes all your customizations 
                    and reverts to organization-wide settings.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Database className="h-3 w-3 mt-0.5 text-blue-600 flex-shrink-0" />
                  <div>
                    <strong>Check Migration Status:</strong> Go to Settings → Appearance to see if your 
                    data has been migrated to the database.
                  </div>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-background p-3 rounded-lg border border-blue-200">
              <h4 className="font-medium text-sm mb-2 text-blue-900">💡 Pro Tips</h4>
              <ul className="text-xs space-y-1 text-foreground">
                <li>• Customize defaults for materials you use most frequently</li>
                <li>• Click "Save My Defaults" after making changes</li>
                <li>• Check Settings → Appearance to verify your data is backed up</li>
                <li>• Organization defaults show below your custom selection for reference</li>
                <li>• Each planner (Deck, Garage, Shed, etc.) has independent defaults</li>
              </ul>
            </div>

            {/* Common Questions */}
            <div className="bg-background p-3 rounded-lg border border-blue-200">
              <h4 className="font-medium text-sm mb-2 text-blue-900">❓ Common Questions</h4>
              <div className="space-y-2 text-xs text-foreground">
                <div>
                  <strong>Q: Will my customizations affect others?</strong>
                  <br />
                  A: No, your personal defaults only affect your account.
                </div>
                <div>
                  <strong>Q: Can I undo a restore?</strong>
                  <br />
                  A: No, restoring is permanent. You'll need to re-customize your preferences.
                </div>
                <div>
                  <strong>Q: What if I don't customize anything?</strong>
                  <br />
                  A: You'll automatically use the organization defaults set by your admin.
                </div>
              </div>
            </div>

            {/* Where to Find More Help */}
            <Alert className="bg-blue-100 border-blue-300">
              <AlertDescription className="text-xs text-blue-900">
                <strong>Need more help?</strong> Contact your system administrator or check the 
                Settings → Appearance tab for migration status and additional information.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
