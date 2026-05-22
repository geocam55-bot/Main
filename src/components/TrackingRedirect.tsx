import React, { useEffect } from 'react';
import { publicAnonKey } from '../utils/supabase/info';
import { buildServerFunctionUrl } from '../utils/server-function-url';

export function TrackingRedirect() {
  useEffect(() => {
    const trackAndRedirect = async () => {
      const params = new URLSearchParams(window.location.search);
      const url = params.get('url');
      const id = params.get('id');
      const orgId = params.get('orgId');
      const type = params.get('type') || 'quote';
      const campaignId = params.get('campaignId');

      if (!url) {
        document.body.innerHTML = 'Invalid tracking link: Missing destination URL';
        return;
      }

      // If we have tracking data, log it
      if (id && orgId) {
        try {
          await fetch(buildServerFunctionUrl('/public/events'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`
            },
            body: JSON.stringify({
              type: 'click',
              entityType: type,
              entityId: id,
              orgId: orgId,
              campaignId: campaignId,
              url: url,
              userAgent: navigator.userAgent
            })
          });
        } catch (error) {
          // Tracking failed – continue to redirect
          // Continue to redirect even if tracking fails
        }
      }

      // Redirect
      window.location.replace(url);
    };

    trackAndRedirect();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
      <p className="text-muted-foreground font-medium">Redirecting...</p>
    </div>
  );
}