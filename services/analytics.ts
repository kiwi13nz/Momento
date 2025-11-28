// services/analytics.ts
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

let sentryInitialized = false;

export const initSentry = () => {
  if (sentryInitialized) return;

  const SENTRY_DSN = Constants.expoConfig?.extra?.sentryDsn;

  if (SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,
      debug: __DEV__,
      tracesSampleRate: 1.0,
    });
    sentryInitialized = true;
    console.log('✅ Sentry initialized');
  } else {
    console.warn('⚠️ Sentry DSN not found - error tracking disabled');
  }
};

export const AnalyticsService = {
  trackEvent(eventName: string, properties?: Record<string, any>) {
    try {
      console.log('📊 Event tracked:', eventName, properties);

      if (!sentryInitialized) {
        return;
      }

      // Sentry handles platform detection automatically
      try {
        Sentry.addBreadcrumb({
          category: 'user-action',
          message: eventName,
          data: properties,
          level: 'info',
        });
      } catch (breadcrumbError) {
        // Silently fail - analytics shouldn't break the app
        console.debug('Breadcrumb failed:', breadcrumbError);
      }
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  },

  trackScreen(screenName: string, properties?: Record<string, any>) {
    try {
      console.log('📱 Screen viewed:', screenName);

      if (!sentryInitialized) {
        return;
      }

      try {
        Sentry.addBreadcrumb({
          category: 'navigation',
          message: `Screen: ${screenName}`,
          data: properties,
          level: 'info',
        });
      } catch (breadcrumbError) {
        console.debug('Breadcrumb failed:', breadcrumbError);
      }
    } catch (error) {
      console.error('Failed to track screen:', error);
    }
  },

  logError(error: Error, context?: Record<string, any>) {
    try {
      console.error('❌ Error:', error.message, context);

      if (!sentryInitialized) {
        return;
      }

      try {
        Sentry.captureException(error, {
          extra: context,
        });
      } catch (sentryError) {
        console.debug('Sentry captureException failed:', sentryError);
      }
    } catch (err) {
      console.error('Failed to log error to Sentry:', err);
    }
  },

  setUser(userId: string, properties?: Record<string, any>) {
    try {
      console.log('👤 User context set:', userId);

      if (!sentryInitialized) {
        return;
      }

      try {
        const userData = {
          id: userId,
          ...properties,
        };

        Sentry.setUser(userData);
      } catch (setUserError) {
        console.debug('Sentry setUser failed:', setUserError);
      }
    } catch (error) {
      console.error('Failed to set user context:', error);
    }
  },

  clearUser() {
    try {
      console.log('👤 User context cleared');

      if (!sentryInitialized) {
        return;
      }

      try {
        Sentry.setUser(null);
      } catch (clearUserError) {
        console.debug('Sentry clearUser failed:', clearUserError);
      }
    } catch (error) {
      console.error('Failed to clear user context:', error);
    }
  },

  setTag(key: string, value: string) {
    try {
      if (!sentryInitialized) {
        return;
      }

      try {
        Sentry.setTag(key, value);
      } catch (setTagError) {
        console.debug('Sentry setTag failed:', setTagError);
      }
    } catch (error) {
      console.error('Failed to set tag:', error);
    }
  },

  setContext(name: string, context: Record<string, any>) {
    try {
      if (!sentryInitialized) {
        return;
      }

      try {
        Sentry.setContext(name, context);
      } catch (setContextError) {
        console.debug('Sentry setContext failed:', setContextError);
      }
    } catch (error) {
      console.error('Failed to set context:', error);
    }
  },
};

export const Events = {
  USER_JOINED: 'user_joined_event',
  USER_CREATED_EVENT: 'user_created_event',

  PHOTO_UPLOADED: 'photo_uploaded',
  PHOTO_VIEWED: 'photo_viewed',
  PHOTO_REACTED: 'photo_reacted',

  NOTIFICATION_RECEIVED: 'notification_received',
  NOTIFICATION_OPENED: 'notification_opened',
  SHARED_TO_STORY: 'shared_to_story',

  UPLOAD_FAILED: 'upload_failed',
  JOIN_FAILED: 'join_failed',
};