import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import Constants from 'expo-constants';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,  
    shouldShowList: true,    
  }),
});

export const PushNotificationService = {
  /**
   * Register device for push notifications
   * Returns push token or null if failed
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Check if physical device
      if (!Device.isDevice) {
        console.warn('⚠️ Push notifications only work on physical devices');
        return null;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('⚠️ Push notification permission denied');
        return null;
      }

      // Get push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId || undefined,
      });

      console.log('✅ Push token obtained:', tokenData.data);

      // Configure Android channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B35',
        });
      }

      return tokenData.data;
    } catch (error) {
      console.error('❌ Failed to register for push notifications:', error);
      return null;
    }
  },

  /**
   * Save push token to player record
   */
  async savePushToken(playerId: string, pushToken: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('players')
        .update({ push_token: pushToken })
        .eq('id', playerId);

      if (error) throw error;

      console.log('✅ Push token saved for player:', playerId);
    } catch (error) {
      console.error('❌ Failed to save push token:', error);
    }
  },

  /**
   * Send push notification to a player
   */
  async sendNotification(
    pushToken: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<void> {
    try {
      const message = {
        to: pushToken,
        sound: 'default',
        title,
        body,
        data: data || {},
        priority: 'high' as const,
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();

      if (result.data?.status === 'error') {
        throw new Error(result.data.message);
      }

      console.log('✅ Push notification sent');
    } catch (error) {
      console.error('❌ Failed to send push notification:', error);
    }
  },

  /**
   * Send notification to player by ID
   */
  async notifyPlayer(
    playerId: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<void> {
    try {
      // Get player's push token
      const { data: player } = await supabase
        .from('players')
        .select('push_token')
        .eq('id', playerId)
        .single();

      if (!player?.push_token) {
        console.log('ℹ️ Player has no push token:', playerId);
        return;
      }

      await this.sendNotification(player.push_token, title, body, data);
    } catch (error) {
      console.error('❌ Failed to notify player:', error);
    }
  },

  /**
   * Batch send notifications (with rate limiting)
   */
  async sendBatchNotifications(
    notifications: Array<{
      playerId: string;
      title: string;
      body: string;
      data?: Record<string, any>;
    }>
  ): Promise<void> {
    try {
      // Limit to 100 notifications at a time
      const batch = notifications.slice(0, 100);

      // Get all push tokens
      const playerIds = batch.map((n) => n.playerId);
      const { data: players } = await supabase
        .from('players')
        .select('id, push_token')
        .in('id', playerIds);

      if (!players) return;

      // Send notifications
      const messages = batch
        .map((notif) => {
          const player = players.find((p) => p.id === notif.playerId);
          if (!player?.push_token) return null;

          return {
            to: player.push_token,
            sound: 'default',
            title: notif.title,
            body: notif.body,
            data: notif.data || {},
            priority: 'high' as const,
          };
        })
        .filter(Boolean);

      if (messages.length === 0) return;

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();
      console.log(`✅ Sent ${messages.length} push notifications`);
    } catch (error) {
      console.error('❌ Failed to send batch notifications:', error);
    }
  },
};