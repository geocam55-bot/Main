import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle2, AlertCircle, Loader2, Database, ShieldCheck, RefreshCw } from 'lucide-react';
import { createClient } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';

export function DataDiagnostic() {
  const [isFixing, setIsFixing] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setIsFixing(true);
    setResult(null);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8405be07/data/fix`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      setResult(data.report);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Diagnostics</h1>
          <p className="text-muted-foreground">
            Check and repair data consistency issues across the platform.
          </p>
        </div>
        <Button onClick={runDiagnostics} disabled={isFixing}>
          {isFixing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Diagnostics...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Run Diagnostics
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Deals & Bids Status
            </CardTitle>
            <CardDescription>
              Ensures all deals have valid status and ownership assignments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Database Integrity Check</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Role-Based Access
            </CardTitle>
            <CardDescription>
              Verifies organization IDs are correctly set for data visibility.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">RLS Compatibility Check</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error running diagnostics: {error}
          </AlertDescription>
        </Alert>
      )}

      {result && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg text-green-900">Diagnostic Results</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="font-semibold text-green-800">Bids Table</h3>
                <ul className="space-y-1 text-sm text-green-700">
                  <li>Scanned: <span className="font-mono font-bold">{result.bids.scanned}</span> records</li>
                  <li>Fixed Status: <span className="font-mono font-bold">{result.bids.fixed_status}</span></li>
                  <li>Fixed Organization: <span className="font-mono font-bold">{result.bids.fixed_org}</span></li>
                  <li>Fixed Ownership: <span className="font-mono font-bold">{result.bids.fixed_owner}</span></li>
                </ul>
                {result.bids.errors.length > 0 && (
                  <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-800">
                    <strong>Errors:</strong> {result.bids.errors.join(', ')}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-green-800">Quotes Table</h3>
                <ul className="space-y-1 text-sm text-green-700">
                  <li>Scanned: <span className="font-mono font-bold">{result.quotes.scanned}</span> records</li>
                  <li>Fixed Status: <span className="font-mono font-bold">{result.quotes.fixed_status}</span></li>
                  <li>Fixed Organization: <span className="font-mono font-bold">{result.quotes.fixed_org}</span></li>
                  <li>Fixed Ownership: <span className="font-mono font-bold">{result.quotes.fixed_owner}</span></li>
                </ul>
                {result.quotes.errors.length > 0 && (
                  <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-800">
                     <strong>Errors:</strong> {result.quotes.errors.join(', ')}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}