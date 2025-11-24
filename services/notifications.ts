import { supabase } from '@/lib/supabase';
import { PushNotificationService } from './push-notifications';

export type NotificationType = 'reaction' | 'new_photo' | 'rank_change' | 'winner';

export type Notification = {
  id: string;
  player_id: string;
  type: NotificationType;
  message: string;
  photo_id?: string;
  read: boolean;
  created_at: string;
};

export const NotificationService = {
  /**
   * Create a new notification
   */
  async create(
    playerId: string,
    type: NotificationType,
    message: string,
    photoId?: string
  ): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        player_id: playerId,
        type,
        message,
        photo_id: photoId,
        read: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    console.log('✅ Notification created:', data);
    return data as Notification;
  },

  /**
   * Get all notifications for a player
   */
  async getAll(playerId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Notification[];
  },

  /**
   * Get unread count for a player
   */
  async getUnreadCount(playerId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', playerId)
      .eq('read', false);

    if (error) throw error;
    return count || 0;
  },

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) throw error;
    console.log('✅ Notification marked as read:', notificationId);
  },

  /**
   * Mark all notifications as read for a player
   */
  async markAllAsRead(playerId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('player_id', playerId)
      .eq('read', false);

    if (error) throw error;
    console.log('✅ All notifications marked as read for player:', playerId);
  },

  /**
   * Delete a notification
   */
  async delete(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
    console.log('🗑️ Notification deleted:', notificationId);
  },

  /**
   * Subscribe to new notifications for a player (realtime)
   */
  subscribeToPlayer(playerId: string, onNewNotification: (notification: Notification) => void) {
    const channel = supabase
      .channel(`notifications-${playerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `player_id=eq.${playerId}`,
        },
        (payload) => {
          console.log('🔔 New notification received:', payload.new);
          onNewNotification(payload.new as Notification);
        }
      )
      .subscribe();

    return channel;
  },

  /**
   * Helper: Create reaction notification with push
   */
  async notifyReaction(
    playerId: string,
    reactorName: string,
    reactionType: 'heart' | 'fire' | 'hundred',
    photoId: string
  ): Promise<void> {
    const emoji = reactionType === 'heart' ? '❤️' : reactionType === 'fire' ? '🔥' : '💯';
    
    // Always create in-app notification immediately (no batching for in-app)
    const message = `${reactorName} reacted ${emoji} to your photo`;
    await this.create(playerId, 'reaction', message, photoId);
    
    // Queue push notification with hybrid batching
    const { ReactionBatchingService } = await import('./reaction-batching');
    
    ReactionBatchingService.queueReaction(
      photoId,
      playerId,
      reactorName,
      // Immediate callback (first reaction)
      async () => {
        await PushNotificationService.notifyPlayer(
          playerId,
          'New Reaction! 🔥',
          message,
          {
            type: 'reaction',
            photoId,
          }
        );
      },
      // Batched callback (subsequent reactions)
      async (count: number, names: string[]) => {
        const batchMessage = names.length === 1
          ? `${names[0]} reacted to your photo`
          : names.length === 2
          ? `${names[0]} and ${names[1]} reacted to your photos`
          : `${names[0]}, ${names[1]} and ${names.length - 2} others reacted to your photos`;
        
        await PushNotificationService.notifyPlayer(
          playerId,
          `${count} New Reactions! 🔥`,
          batchMessage,
          {
            type: 'reaction',
            photoId,
            count,
          }
        );
      }
    );
  },

  /**
   * Helper: Create rank change notification with push
   */
  async notifyRankChange(playerId: string, newRank: number): Promise<void> {
    const message = `🚀 You moved up to #${newRank}!`;
    
    // Create in-app notification
    await this.create(playerId, 'rank_change', message);
    
    // Send push notification
    await PushNotificationService.notifyPlayer(
      playerId,
      'Rank Update!',
      message,
      {
        type: 'rank_change',
        newRank,
      }
    );
  },

  /**
   * Helper: Create winner notification with push
   */
  async notifyWinner(playerId: string, eventTitle: string): Promise<void> {
    const message = `🏆 You won "${eventTitle}"! Congratulations!`;
    
    // Create in-app notification
    await this.create(playerId, 'winner', message);
    
    // Send push notification
    await PushNotificationService.notifyPlayer(
      playerId,
      '🏆 You Won!',
      message,
      {
        type: 'winner',
        eventTitle,
      }
    );
  },
};