import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Users, Zap, ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography, borderRadius } from '@/lib/design-tokens';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EventPreview } from '@/components/event/EventPreview';
import { EventService, PlayerService, PhotoService } from '@/services/api';
import { SessionService } from '@/services/session';
import { supabase } from '@/lib/supabase';
import { TouchableOpacity } from 'react-native';
import { RouteErrorBoundary } from '@/components/shared/RouteErrorBoundary';
import type { Event, Photo } from '@/types';
import { AnalyticsService, Events } from '@/services/analytics';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function JoinEventScreen() {
  const router = useRouter();
  const [eventCode, setEventCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [nameError, setNameError] = useState('');
  const [eventPreview, setEventPreview] = useState<{
    event: Event;
    playerCount: number;
    photoCount: number;
    recentPhotos: Photo[];
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { expoPushToken } = usePushNotifications(null); // Get device token for registration

  const formatCode = (text: string) => {
    return text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  };

  const handleCodeChange = (text: string) => {
    setEventCode(formatCode(text));
    setCodeError('');
  };

  const handleNameChange = (text: string) => {
    setPlayerName(text);
    setNameError('');
  };

  const validateCode = async () => {
    if (!eventCode.trim()) {
      setCodeError('Enter event code');
      return false;
    }
    if (eventCode.length !== 6) {
      setCodeError('Code must be 6 characters');
      return false;
    }
    return true;
  };

  const loadEventPreview = async () => {
    if (!(await validateCode())) return;

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const event = await EventService.getByCode(eventCode);
      const photos = await PhotoService.getByEventId(event.id);
      const recentPhotos = photos.slice(0, 5);

      // Get player count
      const { data: players } = await supabase
        .from('players')
        .select('id')
        .eq('event_id', event.id);

      setEventPreview({
        event,
        playerCount: players?.length || 0,
        photoCount: photos.length,
        recentPhotos,
      });
      setShowPreview(true);
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        setCodeError('Event not found');
      } else {
        Alert.alert('Error', 'Failed to load event preview');
      }
    } finally {
      setLoading(false);
    }
  };

  const joinEvent = async () => {
    if (!playerName.trim()) {
      setNameError('Enter your name');
      return;
    }

    if (!eventPreview) return;

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Check for duplicate name
      const nameExists = await PlayerService.checkNameExists(
        eventPreview.event.id,
        playerName.trim()
      );
      if (nameExists) {
        setNameError('Name already taken');
        setLoading(false);
        return;
      }

      // Create session with invisible auth
      const session = await SessionService.createSession(
        eventPreview.event.id,
        playerName.trim()
      );

      // Set user context for error tracking
      AnalyticsService.setUser(session.playerId, {
        playerName: playerName.trim(),
        eventId: eventPreview.event.id,
      });

      // Track successful join
      AnalyticsService.trackEvent(Events.USER_JOINED, {
        eventId: eventPreview.event.id,
        eventTitle: eventPreview.event.title,
        playerCount: eventPreview.playerCount + 1,
      });

      // Register push notification token
      if (expoPushToken) {
        const { PushNotificationService } = await import('@/services/push-notifications');
        await PushNotificationService.savePushToken(session.playerId, expoPushToken);
        console.log('✅ Push token registered for player');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Navigate to feed
      router.replace({
        pathname: '/(event)/[id]',
        params: {
          id: eventPreview.event.id,
          playerId: session.playerId,
        },
      });
    } catch (error) {
      console.error('Join failed:', error);

      // Log error to Sentry
      AnalyticsService.logError(error as Error, {
        eventCode,
        playerName,
        screen: 'join-event',
      });

      // Track failed join
      AnalyticsService.trackEvent(Events.JOIN_FAILED, {
        error: (error as Error).message,
        eventCode,
      });

      Alert.alert('Error', 'Failed to join event');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <RouteErrorBoundary routeName="join-event">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.iconContainer}>
              <Users size={40} color={colors.primary} />
              <View style={styles.zapIcon}>
                <Zap size={24} color={colors.warning} fill={colors.warning} />
              </View>
            </View>
            <Text style={styles.title}>Join Event</Text>
            <Text style={styles.subtitle}>Enter the code to start playing 🎮</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Event Code"
              value={eventCode}
              onChangeText={handleCodeChange}
              placeholder="XY3K9P"
              autoCapitalize="characters"
              maxLength={6}
              autoCorrect={false}
              error={codeError}
              helperText="6-character code from event host"
              style={styles.codeInput}
              editable={!showPreview}
            />

            {!showPreview ? (
              <Button
                onPress={loadEventPreview}
                loading={loading}
                disabled={loading || eventCode.length !== 6}
                fullWidth
                size="large"
              >
                Preview Event
              </Button>
            ) : (
              <>
                <Input
                  label="Your Name"
                  value={playerName}
                  onChangeText={handleNameChange}
                  placeholder="Enter your name"
                  maxLength={30}
                  error={nameError}
                  helperText="Must be unique in this event"
                />

                <Button
                  onPress={joinEvent}
                  loading={loading}
                  disabled={loading}
                  fullWidth
                  size="large"
                  variant="gradient"
                >
                  Join Event
                </Button>

                <Button
                  onPress={() => {
                    setShowPreview(false);
                    setEventPreview(null);
                  }}
                  variant="ghost"
                  fullWidth
                  disabled={loading}
                >
                  Change Code
                </Button>
              </>
            )}

            {!showPreview && (
              <Button
                onPress={() => router.back()}
                variant="ghost"
                fullWidth
                disabled={loading}
              >
                Cancel
              </Button>
            )}
          </View>

          {/* Event Preview */}
          {eventPreview && showPreview && (
            <View style={styles.previewContainer}>
              <EventPreview
                event={eventPreview.event}
                playerCount={eventPreview.playerCount}
                photoCount={eventPreview.photoCount}
                recentPhotos={eventPreview.recentPhotos}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </RouteErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: spacing.m,
    paddingBottom: spacing.m,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.xl,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: spacing.l,
  },
  zapIcon: {
    position: 'absolute',
    top: -8,
    right: -12,
  },
  title: {
    ...typography.title,
    color: colors.text,
    marginBottom: spacing.s,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    paddingHorizontal: spacing.l,
    gap: spacing.l,
  },
  codeInput: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  previewContainer: {
    marginTop: spacing.l,
    marginHorizontal: spacing.l,
  },
});