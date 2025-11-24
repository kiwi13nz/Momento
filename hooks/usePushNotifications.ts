import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { PushNotificationService } from '@/services/push-notifications';
import { useRouter } from 'expo-router';
import { AnalyticsService, Events } from '@/services/analytics';

export function usePushNotifications(playerId: string | null) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | undefined>(
    undefined
  );
  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);
  const router = useRouter();

  useEffect(() => {
    if (!playerId) return;

    // Register for push notifications
    registerForPushNotifications();

    // Listen for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('🔔 Notification received:', notification);
        setNotification(notification);

        // Track notification received
        AnalyticsService.trackEvent(Events.NOTIFICATION_RECEIVED, {
          type: notification.request.content.data.type,
          playerId,
        });
      }
    );

    // Listen for user interactions with notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('🔔 Notification tapped:', response);

        // Track notification opened
        AnalyticsService.trackEvent(Events.NOTIFICATION_OPENED, {
          type: response.notification.request.content.data.type,
          playerId,
        });

        handleNotificationResponse(response);
      }
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [playerId]);

  const registerForPushNotifications = async () => {
    try {
      const token = await PushNotificationService.registerForPushNotifications();

      if (token && playerId) {
        setExpoPushToken(token);
        await PushNotificationService.savePushToken(playerId, token);

        // Track successful registration
        AnalyticsService.trackEvent('push_notifications_enabled', {
          playerId,
          platform: Platform.OS,
        });
      }
    } catch (error) {
      console.error('Failed to register for push notifications:', error);

      // Log error
      AnalyticsService.logError(error as Error, {
        context: 'push_notification_registration',
        playerId,
      });
    }
  };

  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;

    // Navigate based on notification type
    if (data.type === 'reaction' && data.photoId) {
      // Navigate to photo
      console.log('Navigate to photo:', data.photoId);
      // You can add navigation logic here when you implement photo deep linking
    } else if (data.type === 'rank_change' && data.eventId) {
      // Navigate to event
      router.push(`/(event)/${data.eventId}` as any);
    } else if (data.eventId) {
      // Default: navigate to event
      router.push(`/(event)/${data.eventId}` as any);
    }
  };

  return {
    expoPushToken,
    notification,
  };
}