import { useState, useEffect } from 'react';
import { NotificationService, type Notification } from '@/services/notifications';

export function useNotifications(playerId: string | null) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playerId) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    console.log('🔔 Setting up notifications for player:', playerId);
    loadUnreadCount();
    const channel = setupRealtimeSubscription();

    return () => {
      if (channel) {
        console.log('🔌 Cleaning up notification subscription');
        channel.unsubscribe();
      }
    };
  }, [playerId]);

  const loadUnreadCount = async () => {
    if (!playerId) return;

    try {
      setLoading(true);
      const count = await NotificationService.getUnreadCount(playerId);
      setUnreadCount(count);
      console.log('📊 Initial unread notifications:', count);
    } catch (error) {
      console.error('❌ Failed to load unread count:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!playerId) return null;

    console.log('📡 Setting up real-time subscription for player:', playerId);

    return NotificationService.subscribeToPlayer(playerId, (notification) => {
      console.log('🔔 New notification received in hook:', notification);
      if (!notification.read) {
        setUnreadCount((prev) => {
          const newCount = prev + 1;
          console.log(`📈 Unread count increased: ${prev} → ${newCount}`);
          return newCount;
        });
      }
    });
  };

  const refresh = async () => {
    console.log('🔄 Manually refreshing notifications');
    await loadUnreadCount();
  };

  return { unreadCount, loading, refresh };
}