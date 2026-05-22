import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';
import { useNotificationPreferences } from './useNotificationPreferences';
import type { User } from '../App';

export function useTaskNotifications(user: User) {
  const [taskCount, setTaskCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { preferences } = useNotificationPreferences(user);

  useEffect(() => {
    // If notifications are disabled, set count to 0 and stop
    if (!preferences.taskAssignments) {
      setTaskCount(0);
      setIsLoading(false);
      return;
    }

    if (user) {
      loadTaskCount();
      
      // Set up real-time subscription for task updates
      const supabase = createClient();
      const channel = supabase
        .channel('task-notifications')
        // Listen for INSERT and UPDATE where the user is assigned
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'tasks',
            filter: `assigned_to=eq.${user.id}`,
          },
          () => {
            loadTaskCount();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'tasks',
            filter: `assigned_to=eq.${user.id}`,
          },
          () => {
            loadTaskCount();
          }
        )
        // Listen for ANY DELETE because we can't filter by assigned_to on delete
        // (assigned_to is not present in the delete payload without REPLICA IDENTITY FULL)
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'tasks',
          },
          () => {
            loadTaskCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, preferences.taskAssignments]);

  const loadTaskCount = async () => {
    if (!preferences.taskAssignments) return;

    try {
      setIsLoading(true);
      const supabase = createClient();
      
      // Count pending tasks assigned to the user
      // We want tasks that are assigned to the user and NOT completed
      const { count, error } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .neq('status', 'completed');

      if (error) {
        return;
      }

      setTaskCount(count || 0);
    } catch (error) {
      // Failed silently
    } finally {
      setIsLoading(false);
    }
  };

  return { taskCount: preferences.taskAssignments ? taskCount : 0, isLoading };
}
