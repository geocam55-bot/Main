import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { AlertTriangle, Copy, CheckCircle, ExternalLink } from 'lucide-react';
import { copyToClipboard } from '../utils/clipboard';
import { toast } from 'sonner@2.0.3';

interface InvalidOrgIdAlertProps {
  invalidOrgId: string;
  correctOrgId?: string;
}

export function InvalidOrgIdAlert({ invalidOrgId, correctOrgId = 'rona-atlantic' }: InvalidOrgIdAlertProps) {
  const [copied, setCopied] = useState(false);

  const quickFixSQL = `-- Quick Fix: Replace invalid org ID with correct one
UPDATE profiles
SET 
  organization_id = '${correctOrgId}',
  updated_at = NOW()
WHERE organization_id = '${invalidOrgId}';

UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
  jsonb_build_object('organizationId', '${correctOrgId}')
WHERE id IN (
  SELECT id FROM profiles WHERE organization_id = '${correctOrgId}'
);`;

  const handleCopySQL = async () => {
    const success = await copyToClipboard(quickFixSQL);
    if (success) {
      setCopied(true);
      toast.success('SQL copied to clipboard!');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <Alert className="border-red-500 bg-red-50">
      <AlertTriangle className="h-5 w-5 text-red-600" />
      <AlertTitle className="text-red-900 text-lg">Invalid Organization ID Detected</AlertTitle>
      <AlertDescription>
        <div className="space-y-4 text-red-900 mt-2">
          <div className="space-y-2">
            <p className="font-medium">Your account has an invalid organization ID:</p>
            <code className="block bg-red-100 px-3 py-2 rounded border border-red-300 text-sm">
              {invalidOrgId}
            </code>
            <p className="text-sm">
              This is a timestamp-based ID that was created by old signup logic. It needs to be replaced with a valid organization ID.
            </p>
          </div>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-blue-900">⚡ 2-Minute Fix</CardTitle>
              <CardDescription className="text-blue-700">
                Run this SQL in your Supabase SQL Editor to fix the issue immediately
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <pre className="bg-background p-3 rounded border border-blue-200 text-xs overflow-x-auto max-h-48">
                  {quickFixSQL}
                </pre>
                <Button
                  onClick={handleCopySQL}
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2 bg-background"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy SQL
                    </>
                  )}
                </Button>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-2 text-sm">
                  <span className="font-bold text-blue-900 min-w-[20px]">1.</span>
                  <span className="text-blue-800">
                    Open your <strong>Supabase Dashboard</strong> → <strong>SQL Editor</strong>
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <span className="font-bold text-blue-900 min-w-[20px]">2.</span>
                  <span className="text-blue-800">
                    Copy the SQL above (or click "Copy SQL" button)
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <span className="font-bold text-blue-900 min-w-[20px]">3.</span>
                  <span className="text-blue-800">
                    Paste and click <strong>Run</strong> (or press F5)
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <span className="font-bold text-blue-900 min-w-[20px]">4.</span>
                  <span className="text-blue-800">
                    <strong>Log out</strong> and <strong>log back in</strong>
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <span className="font-bold text-blue-900 min-w-[20px]">✅</span>
                  <span className="text-blue-800 font-semibold">
                    Error is fixed!
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              onClick={handleCopySQL}
              variant="default"
              className="flex-1"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Fix SQL
            </Button>
            <Button
              asChild
              variant="outline"
              className="flex-1"
            >
              <a href="#recovery" className="flex items-center justify-center">
                <ExternalLink className="h-4 w-4 mr-2" />
                Go to User Recovery
              </a>
            </Button>
          </div>

          <div className="bg-amber-100 border border-amber-300 rounded p-3 text-sm space-y-1">
            <p className="font-semibold text-amber-900">Alternative: Use the UI Tool</p>
            <p className="text-amber-800">
              Navigate to <strong>Users → User Recovery</strong> tab and use the 
              <strong> "Fix Invalid Organization IDs"</strong> tool to scan and fix automatically.
            </p>
          </div>

          <div className="text-xs text-muted-foreground pt-2 border-t border-red-200">
            <p><strong>What gets fixed:</strong></p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Your organization ID in the <code className="bg-muted px-1 py-0.5 rounded">profiles</code> table</li>
              <li>Your organization ID in the <code className="bg-muted px-1 py-0.5 rounded">auth.users</code> metadata</li>
              <li>All related permission and access issues</li>
            </ul>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}