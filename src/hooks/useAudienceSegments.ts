import { useState, useEffect } from 'react';
import { settingsAPI } from '../utils/api';

const DEFAULT_SEGMENTS = ['VIP', 'New Lead', 'Active Customer', 'Inactive', 'Prospect'];

export function useAudienceSegments(organizationId: string) {
  const [segments, setSegments] = useState<string[]>(DEFAULT_SEGMENTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSegments = async () => {
      try {
        // Try to fetch from Supabase
        const settings = await settingsAPI.getOrganizationSettings(organizationId);
        
        if (settings?.audience_segments && Array.isArray(settings.audience_segments) && settings.audience_segments.length > 0) {
          setSegments(settings.audience_segments);
        } else {
          // Fallback to localStorage
          const localSettings = localStorage.getItem(`global_settings_${organizationId}`);
          if (localSettings) {
            const parsed = JSON.parse(localSettings);
            if (parsed.audienceSegments && Array.isArray(parsed.audienceSegments) && parsed.audienceSegments.length > 0) {
              setSegments(parsed.audienceSegments);
            }
          }
        }
      } catch (error) {
        // Fallback to localStorage
        try {
          const localSettings = localStorage.getItem(`global_settings_${organizationId}`);
          if (localSettings) {
            const parsed = JSON.parse(localSettings);
            if (parsed.audienceSegments && Array.isArray(parsed.audienceSegments) && parsed.audienceSegments.length > 0) {
              setSegments(parsed.audienceSegments);
            }
          }
        } catch (localError) {
          // Failed silently
        }
      } finally {
        setLoading(false);
      }
    };

    if (organizationId) {
      fetchSegments();
    } else {
      setLoading(false);
    }
  }, [organizationId]);

  return { segments, loading };
}
