import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';
import { useNotificationPreferences } from './useNotificationPreferences';
import type { User } from '../App';

export interface BidNotification {
  id: string;
  title: string;
  status: string;
  updated_at: string;
  type: 'new' | 'update';
}

export function useBidNotifications(user: User) {
  const [notifications, setNotifications] = useState<BidNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { preferences } = useNotificationPreferences(user);

  useEffect(() => {
    // If notifications are disabled, set count to 0 and stop
    if (!preferences.bids) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    if (user) {
      checkBidUpdates();
      const interval = setInterval(checkBidUpdates, 5 * 60 * 1000); // Poll every 5 mins
      return () => clearInterval(interval);
    }
  }, [user, preferences.bids]);

  const checkBidUpdates = async () => {
    if (!preferences.bids) return;

    try {
      // Get last checked timestamp from local storage, default to 24 hours ago if not set
      const lastCheckedStr = localStorage.getItem('prospaces_last_checked_bids');
      const lastChecked = lastCheckedStr 
        ? new Date(lastCheckedStr) 
        : new Date(Date.now() - 24 * 60 * 60 * 1000);

      const supabase = createClient();
      
      // Fetch bids updated since last check
      // We select created_at to distinguish between new and updated bids
      const { data: bids, error } = await supabase
        .from('bids')
        .select('id, title, status, updated_at, created_at, organization_id')
        .eq('organization_id', user.organizationId)
        .gt('updated_at', lastChecked.toISOString())
        .order('updated_at', { ascending: false });

      if (error) {
        return;
      }

      if (bids && bids.length > 0) {
        const notifs: BidNotification[] = bids.map((bid: any) => ({
          id: bid.id,
          title: bid.title || 'Untitled Bid',
          status: bid.status || 'Draft',
          updated_at: bid.updated_at,
          // If created_at and updated_at are within 1 second, it's new
          type: Math.abs(new Date(bid.created_at).getTime() - new Date(bid.updated_at).getTime()) < 1000 
            ? 'new' 
            : 'update'
        }));
        
        setNotifications(notifs);
        setUnreadCount(notifs.length);
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (err) {
      // Failed silently
    }
  };

  const markAsRead = () => {
    localStorage.setItem('prospaces_last_checked_bids', new Date().toISOString());
    setNotifications([]);
    setUnreadCount(0);
  };

  return { 
    notifications: preferences.bids ? notifications : [], 
    unreadCount: preferences.bids ? unreadCount : 0, 
    markAsRead, 
    refresh: checkBidUpdates 
  };
}
