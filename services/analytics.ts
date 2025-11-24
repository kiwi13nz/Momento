import * as Sentry from 'sentry-expo';
import Constants from 'expo-constants';

// Initialize Sentry AFTER app is ready, not at module load
let sentryInitialized = false;

export const initSentry = () => {
  if (sentryInitialized) return;
  
  const SENTRY_DSN = Constants.expoConfig?.extra?.sentryDsn;

  if (SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,
      enableInExpoDevelopment: false,
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
  /**
   * Track a custom event
   */
  trackEvent(eventName: string, properties?: Record<string, any>) {
    try {
      Sentry.Native.addBreadcrumb({
        category: 'user-action',
        message: eventName,
        data: properties,
        level: 'info',
      });
      
      console.log('📊 Event tracked:', eventName, properties);
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  },

  /**
   * Track screen view
   */
  trackScreen(screenName: string, properties?: Record<string, any>) {
    try {
      Sentry.Native.addBreadcrumb({
        category: 'navigation',
        message: `Screen: ${screenName}`,
        data: properties,
        level: 'info',
      });
      
      console.log('📱 Screen viewed:', screenName);
    } catch (error) {
      console.error('Failed to track screen:', error);
    }
  },

  /**
   * Log an error
   */
  logError(error: Error, context?: Record<string, any>) {
    try {
      Sentry.Native.captureException(error, {
        extra: context,
      });
      
      console.error('❌ Error logged to Sentry:', error.message);
    } catch (err) {
      console.error('Failed to log error to Sentry:', err);
    }
  },

  /**
   * Set user context
   */
  setUser(userId: string, properties?: Record<string, any>) {
    try {
      Sentry.Native.setUser({
        id: userId,
        ...properties,
      });
      
      console.log('👤 User context set:', userId);
    } catch (error) {
      console.error('Failed to set user context:', error);
    }
  },

  /**
   * Clear user context (on logout)
   */
  clearUser() {
    try {
      Sentry.Native.setUser(null);
      console.log('👤 User context cleared');
    } catch (error) {
      console.error('Failed to clear user context:', error);
    }
  },

  /**
   * Set custom tag
   */
  setTag(key: string, value: string) {
    try {
      Sentry.Native.setTag(key, value);
    } catch (error) {
      console.error('Failed to set tag:', error);
    }
  },

  /**
   * Add custom context
   */
  setContext(name: string, context: Record<string, any>) {
    try {
      Sentry.Native.setContext(name, context);
    } catch (error) {
      console.error('Failed to set context:', error);
    }
  },
};

// Key events to track
export const Events = {
  // User events
  USER_JOINED: 'user_joined_event',
  USER_CREATED_EVENT: 'user_created_event',
  
  // Photo events
  PHOTO_UPLOADED: 'photo_uploaded',
  PHOTO_VIEWED: 'photo_viewed',
  PHOTO_REACTED: 'photo_reacted',
  
  // Engagement
  NOTIFICATION_RECEIVED: 'notification_received',
  NOTIFICATION_OPENED: 'notification_opened',
  SHARED_TO_STORY: 'shared_to_story',
  
  // Errors
  UPLOAD_FAILED: 'upload_failed',
  JOIN_FAILED: 'join_failed',
};