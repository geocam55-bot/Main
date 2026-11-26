/**
 * Global fetch interceptor to transparently redirect all absolute Supabase Edge Function
 * requests for make-server-8405be07 to local relative Express server routes.
 */

if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    try {
      let urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input && typeof input.url === 'string' ? input.url : '');
      if (urlStr && urlStr.includes('/functions/v1/make-server-8405be07')) {
        const idx = urlStr.indexOf('/functions/v1/make-server-8405be07');
        const relativePath = urlStr.slice(idx);
        if (typeof input === 'string') {
          input = relativePath;
        } else if (input instanceof URL) {
          input = new URL(relativePath, window.location.origin);
        } else if (input instanceof Request) {
          input = new Request(relativePath, input);
        }
      }
    } catch (e) {}
    return originalFetch.call(window, input, init);
  };
}
