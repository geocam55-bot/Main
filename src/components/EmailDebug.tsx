import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Badge } from './ui/badge';
import { CheckCircle, AlertCircle, Loader2, RefreshCw, Server } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { createClient } from '../utils/supabase/client';

export function EmailDebug() {
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [results, setResults] = useState<any>(null);

  const runDiagnostics = async () => {
    setStatus('running');
    setResults(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const candidates = [
        'server/make-server-8405be07/health',
        'server/make-server-8405be07/azure-health',
      ];

      const probeResults = [];
      let successResult = null;

      const startTime = Date.now();

      for (const candidate of candidates) {
        const url = `https://${projectId}.supabase.co/functions/v1/${candidate}`;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                successResult = {
                    endpoint: candidate,
                    data,
                    duration: Date.now() - startTime
                };
                probeResults.push({ endpoint: candidate, status: 'ok', code: response.status });
                break; // Stop at first success
            } else {
                probeResults.push({ endpoint: candidate, status: 'error', code: response.status });
            }
        } catch (e) {
            probeResults.push({ endpoint: candidate, status: 'failed', error: e.message });
        }
      }

      if (successResult) {
          setResults({
              connected: true,
              activeEndpoint: successResult.endpoint,
              duration: successResult.duration,
              env: successResult.data.env,
              probes: probeResults
          });
          setStatus('success');
      } else {
          throw new Error('All endpoints failed. See details below.');
      }

    } catch (err: any) {
      setResults({
        connected: false,
        error: err.message,
        // If we have partial probe results, show them?
      });
      setStatus('error');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Email System Diagnostics
        </CardTitle>
        <CardDescription>
          Run this tool to diagnose why email connections might be failing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runDiagnostics} 
          disabled={status === 'running'}
          className="w-full sm:w-auto"
        >
          {status === 'running' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Diagnostics...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Test Connection
            </>
          )}
        </Button>

        {status === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection Failed</AlertTitle>
            <AlertDescription>
              {results?.error}
              <div className="mt-2 text-xs opacity-90">
                <strong>Troubleshooting:</strong>
                <ul className="list-disc ml-4 mt-1">
                  <li>Ensure the Edge Function "server" (or "make-server") is deployed.</li>
                  <li>Check if the Supabase project is active (not paused).</li>
                  <li>Verify that Google/Microsoft OAuth credentials are set in Supabase Secrets.</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {status === 'success' && results && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">System Operational</AlertTitle>
              <AlertDescription className="text-green-700">
                Backend is reachable via <strong>{results.activeEndpoint}</strong> ({results.duration}ms).
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-3 border rounded-lg bg-muted space-y-2">
                <h4 className="font-semibold text-sm">Environment Configuration</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Google OAuth:</span>
                    <Badge variant={results.env.hasGoogleClientId ? "default" : "destructive"} className="h-5">
                      {results.env.hasGoogleClientId ? "Configured" : "Missing"}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Azure OAuth:</span>
                    <Badge variant={results.env.hasAzureClientId ? "default" : "destructive"} className="h-5">
                      {results.env.hasAzureClientId ? "Configured" : "Missing"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="p-3 border rounded-lg bg-muted space-y-2">
                <h4 className="font-semibold text-sm">Probe Results</h4>
                <div className="space-y-1 text-xs max-h-32 overflow-y-auto">
                    {results.probes?.map((p: any, i: number) => (
                        <div key={i} className="flex justify-between items-center">
                            <span className="font-mono text-muted-foreground truncate max-w-[150px]" title={p.endpoint}>{p.endpoint}</span>
                            <Badge variant={p.status === 'ok' ? 'outline' : 'secondary'} className={p.status === 'ok' ? 'text-green-600 border-green-200' : 'text-muted-foreground'}>
                                {p.status === 'ok' ? 'OK' : p.code || 'Fail'}
                            </Badge>
                        </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}