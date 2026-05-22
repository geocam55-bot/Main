import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';
import { useNotificationPreferences } from './useNotificationPreferences';
import type { User } from '../App';

export function useUnreadEmails(user: User) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { preferences } = useNotificationPreferences(user);

  useEffect(() => {
    // If notifications are disabled, set count to 0 and stop
    if (!preferences.email) {
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    if (user) {
      loadUnreadCount();
      
      // Set up real-time subscription for email updates
      const supabase = createClient();
      const channel = supabase
        .channel('unread-emails-count')
        // Listen for INSERT and UPDATE where the user is the owner
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'emails',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadUnreadCount();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'emails',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadUnreadCount();
          }
        )
        // Listen for ANY DELETE because we can't filter by user_id on delete
        // (user_id is not present in the delete payload without REPLICA IDENTITY FULL)
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'emails',
          },
          () => {
            loadUnreadCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, preferences.email]);

  const loadUnreadCount = async () => {
    if (!preferences.email) return;

    try {
      setIsLoading(true);
      const supabase = createClient();
      
      // 1. Fetch ALL email accounts (matching Email.tsx behavior)
      // The Email component defaults to showing the FIRST account returned.
      // To match the UI "0" count, we must also only look at that first account.
      const { data: accounts, error: accountsError } = await supabase
        .from('email_accounts')
        .select('id')
        .eq('user_id', user.id);

      if (accountsError) {
        return;
      }

      // If no accounts, 0 unread
      if (!accounts || accounts.length === 0) {
        setUnreadCount(0);
        setIsLoading(false);
        return;
      }

      // STRICT MATCHING: Only count the "Primary" account (the first one)
      // This ensures the badge matches the default view of the Email component.
      const primaryAccountId = accounts[0].id;
      
      // 2. Fetch GLOBAL latest 100 emails (exactly matching Email.tsx)
      // We must NOT filter by account_id in the query, because Email.tsx doesn't.
      // If we filtered by account here, we might find old unread emails that are 
      // not in the "Global Top 100" that Email.tsx loads, causing a mismatch.
      const { data, error } = await supabase
        .from('emails')
        .select('is_read, folder, account_id')
        .eq('user_id', user.id)
        .order('received_at', { ascending: false })
        .limit(100);

      if (error) {
        return;
      }

      if (data) {
        const count = data.filter(email => {
          // 1. Must match the PRIMARY account strictly
          if (email.account_id !== primaryAccountId) {
            return false;
          }

          // 2. Must be strictly unread
          const isUnread = email.is_read === false || email.is_read === null;
          
          // 3. Must be strictly in 'inbox'
          const isInbox = email.folder === 'inbox';
          
          return isUnread && isInbox;
        }).length;
        
        setUnreadCount(count);
      }

    } catch (error) {
      // Failed silently
    } finally {
      setIsLoading(false);
    }
  };

  return { unreadCount: preferences.email ? unreadCount : 0, isLoading, refresh: loadUnreadCount };
}
