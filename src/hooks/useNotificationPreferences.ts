import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';
import type { User } from '../App';

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  taskAssignments: boolean;
  appointments: boolean;
  bids: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  email: true,
  push: true,
  taskAssignments: true,
  appointments: true,
  bids: true,
};

export function useNotificationPreferences(user: User) {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const loadPreferences = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('user_preferences')
          .select('notifications_email, notifications_push, notifications_task_assignments, notifications_appointments, notifications_bids')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          setPreferences(DEFAULT_PREFERENCES);
        } else if (data) {
          setPreferences({
            email: data.notifications_email ?? true,
            push: data.notifications_push ?? true,
            taskAssignments: data.notifications_task_assignments ?? true,
            appointments: data.notifications_appointments ?? true,
            bids: data.notifications_bids ?? true,
          });
        } else {
          setPreferences(DEFAULT_PREFERENCES);
        }
      } catch (err) {
        setPreferences(DEFAULT_PREFERENCES);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [user?.id]);

  return { preferences, isLoading };
}
