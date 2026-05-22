import { useState, useEffect, useCallback } from 'react';
import { createClient } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { useNotificationPreferences } from './useNotificationPreferences';
import type { User } from '../App';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-8405be07`;

export function useAppointmentNotifications(user: User) {
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { preferences } = useNotificationPreferences(user);

  const loadAppointmentCount = useCallback(async () => {
    if (!preferences.appointments || !user) return;

    try {
      setIsLoading(true);

      // Get the access token fresh each time to avoid race conditions
      const supabase = createClient();
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token ?? null;
      
      // If no valid session/token, silently skip (user might be logging out or session expired)
      if (!token || sessionError) {
        setAppointmentCount(0);
        setIsLoading(false);
        return;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
        'X-User-Token': token,
      };

      const res = await fetch(`${API_BASE}/appointments/count`, { headers });
      if (!res.ok) {
        setAppointmentCount(0);
        return;
      }
      const data = await res.json();
      setAppointmentCount(data.count ?? 0);
    } catch (error: any) {
      // Network errors are non-fatal — just zero out
      setAppointmentCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [user, preferences.appointments]);

  useEffect(() => {
    if (!preferences.appointments) {
      setAppointmentCount(0);
      setIsLoading(false);
      return;
    }

    if (!user) return;

    loadAppointmentCount();

    // Periodically recheck so past-due appointments drop off the badge
    const interval = setInterval(loadAppointmentCount, 60_000);

    // Set up real-time subscription for appointment updates
    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null;
    try {
      const supabase = createClient();
      channel = supabase
        .channel('appointment-notifications')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'appointments', filter: `owner_id=eq.${user.id}` },
          () => loadAppointmentCount()
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'appointments', filter: `owner_id=eq.${user.id}` },
          () => loadAppointmentCount()
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'appointments' },
          () => loadAppointmentCount()
        )
        .subscribe();
    } catch {
      // Realtime subscription failure is non-fatal
    }

    return () => {
      clearInterval(interval);
      if (channel) {
        try { createClient().removeChannel(channel); } catch { /* ignore */ }
      }
    };
  }, [user, preferences.appointments, loadAppointmentCount]);

  return { appointmentCount: preferences.appointments ? appointmentCount : 0, isLoading };
}