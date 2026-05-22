import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Loader2, Search, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

export function LandingPageDiagnostic() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);

  const runDiagnostic = async () => {
    setLoading(true);
    
    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/debug/landing-pages`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Server error ${response.status}: ${text}`);
      }
      
      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({ error: error.message || String(error) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostic();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Landing Page Diagnostic</h1>
            <p className="text-gray-600 mt-1">Debug tool to inspect landing pages</p>
          </div>
          <Button onClick={runDiagnostic} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Refresh
              </>
            )}
          </Button>
        </div>

        {/* Loading State */}
        {loading && !result && (
          <div className="bg-white border rounded-lg p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading landing pages...</p>
          </div>
        )}

        {/* Error State */}
        {result?.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <h3 className="text-lg font-semibold text-red-900">Error</h3>
            </div>
            <p className="text-red-800">{result.error}</p>
          </div>
        )}

        {/* Success State */}
        {result && !result.error && (
          <>
            {/* Summary */}
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Database Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-900">{result.totalPages || 0}</div>
                  <div className="text-sm text-blue-700">Total Pages</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-900">{result.pagesWithSlugs || 0}</div>
                  <div className="text-sm text-green-700">With Slugs</div>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-900">{result.pagesWithoutSlugs || 0}</div>
                  <div className="text-sm text-yellow-700">Without Slugs</div>
                </div>
              </div>
            </div>

            {/* Available Slugs */}
            {result.availableSlugs && result.availableSlugs.length > 0 && (
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Available Slugs</h3>
                <p className="text-sm text-gray-600 mb-4">Click to test the public page</p>
                <div className="flex flex-wrap gap-2">
                  {result.availableSlugs.map((slug: string) => (
                    <a
                      key={slug}
                      href={`/landing/${slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                    >
                      {slug}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* All Pages */}
            {result.pages && result.pages.length > 0 && (
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">All Pages</h3>
                <div className="space-y-4">
                  {result.pages.map((page: any) => (
                    <div key={page.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-gray-900">{page.name || 'Untitled'}</h4>
                            {page.slug ? (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                /{page.slug}
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                                No Slug
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                            <div>ID: <span className="font-mono text-xs">{page.id}</span></div>
                            <div>Org: <span className="font-mono text-xs">{page.organizationId}</span></div>
                          </div>
                        </div>
                        {page.slug && (
                          <a
                            href={`/landing/${page.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 border rounded hover:bg-gray-50 text-sm"
                          >
                            View Page
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {result.totalPages === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <h3 className="text-lg font-semibold text-yellow-900">No Landing Pages Found</h3>
                </div>
                <p className="text-yellow-800 mb-4">
                  To create a publicly accessible landing page:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-yellow-900">
                  <li>Go to Marketing → Landing Pages</li>
                  <li>Create or open a landing page</li>
                  <li>Go to the Settings tab</li>
                  <li>Set a unique slug (e.g., "WinterBlast")</li>
                  <li>Save the page</li>
                </ol>
              </div>
            )}

            {/* Raw Data */}
            <div className="bg-gray-900 border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-100 mb-2">Debug Info</h3>
              <pre className="text-xs text-gray-300 overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </>
        )}
      </div>
    </div>
  );
}