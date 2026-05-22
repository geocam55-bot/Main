import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Loader2, RefreshCw, ExternalLink, AlertTriangle, CheckCircle } from 'lucide-react';

export function LandingPageDebug() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [testingSlug, setTestingSlug] = useState('');
  const [testResult, setTestResult] = useState<any>(null);

  const fetchDebugData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/debug/landing-pages`
      );
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${text}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testSlugAccess = async (slug: string) => {
    if (!slug) return;
    setTestingSlug(slug);
    setTestResult(null);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8405be07/public/landing-page/${slug}`
      );
      
      const result = await response.json();
      setTestResult({
        status: response.status,
        ok: response.ok,
        data: result
      });
    } catch (err: any) {
      setTestResult({
        status: 'error',
        ok: false,
        error: err.message
      });
    }
  };

  useEffect(() => {
    fetchDebugData();
  }, []);

  const testLandingPage = (slug: string) => {
    const url = `/landing/${slug}`;
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Landing Page Debug Tool</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchDebugData}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
              <p className="text-red-800 font-semibold">Error:</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          )}

          {loading && !data && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          )}

          {data && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-lg px-4 py-2">
                  {data.count} Landing Page{data.count !== 1 ? 's' : ''} Found
                </Badge>
              </div>

              {data.count === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                  <p className="text-yellow-800 font-semibold">No Landing Pages Found</p>
                  <p className="text-yellow-700 text-sm mt-1">
                    Create a landing page in the Marketing Module → Landing Pages section
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-3"
                    onClick={() => window.location.href = '/?module=marketing&tab=landing-pages'}
                  >
                    Go to Landing Page Builder
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.pages.map((page: any, index: number) => (
                    <div 
                      key={index} 
                      className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div>
                            <h3 className="font-semibold text-lg">{page.name || 'Untitled'}</h3>
                            <p className="text-sm text-gray-600">ID: {page.id}</p>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500 font-medium">Slug:</span>
                              {page.slug ? (
                                <code className="bg-white px-2 py-1 rounded text-sm border">
                                  {page.slug}
                                </code>
                              ) : (
                                <Badge variant="destructive" className="text-xs">No Slug Set</Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500 font-medium">Public URL:</span>
                              {page.slug ? (
                                <code className="bg-white px-2 py-1 rounded text-sm border">
                                  /landing/{page.slug}
                                </code>
                              ) : (
                                <span className="text-sm text-gray-400 italic">
                                  (Set a slug to enable public access)
                                </span>
                              )}
                            </div>
                            
                            {page.organizationId && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500 font-medium">Organization:</span>
                                <code className="bg-white px-2 py-1 rounded text-xs border">
                                  {page.organizationId}
                                </code>
                              </div>
                            )}
                            
                            {page.createdAt && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500 font-medium">Created:</span>
                                <span className="text-sm text-gray-600">
                                  {new Date(page.createdAt).toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          {page.slug ? (
                            <Button 
                              size="sm" 
                              onClick={() => testLandingPage(page.slug)}
                              className="whitespace-nowrap"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Test Page
                            </Button>
                          ) : (
                            <Button size="sm" disabled className="whitespace-nowrap">
                              No Slug
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {testingSlug && testResult && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-semibold mb-2">Test Result for <code className="bg-gray-100 px-1 rounded">/landing/{testingSlug}</code>:</h4>
                  {testResult.ok ? (
                    <div className="bg-green-50 border border-green-200 rounded p-4">
                      <p className="text-green-800 font-semibold">Success!</p>
                      <p className="text-green-600 text-sm mt-1">
                        The landing page is accessible. You can visit it at <a href={`/landing/${testingSlug}`} target="_blank" className="text-blue-500 underline">/landing/{testingSlug}</a>.
                      </p>
                      <div className="flex items-center mt-2">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        <p className="text-sm text-gray-600">Status: {testResult.status}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded p-4">
                      <p className="text-red-800 font-semibold">Error!</p>
                      <p className="text-red-600 text-sm mt-1">
                        The landing page is not accessible. Please check the slug and try again.
                      </p>
                      <div className="flex items-center mt-2">
                        <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                        <p className="text-sm text-gray-600">Status: {testResult.status}</p>
                      </div>
                      {testResult.error && (
                        <p className="text-sm text-gray-600 mt-1">Error Message: {testResult.error}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 pt-6 border-t">
                <h4 className="font-semibold mb-2">Troubleshooting Tips:</h4>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Make sure your landing page has a slug set in the Settings tab</li>
                  <li>The slug should be URL-friendly (e.g., "winter-blast" or "WinterBlast")</li>
                  <li>Access the page at <code className="bg-gray-100 px-1 rounded">/landing/[your-slug]</code></li>
                  <li>If you just created or updated a page, try refreshing this page</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}