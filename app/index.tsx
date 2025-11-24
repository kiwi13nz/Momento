import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Trophy, Users, Sparkles, ChevronRight, Play } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, borderRadius, shadows } from '@/lib/design-tokens';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getOwnerEvents, type OwnerEvent } from '@/lib/storage';
import { SessionService, type PlayerSession } from '@/services/session';
import { useFadeIn, useSlideUp } from '@/lib/animations';
import { RouteErrorBoundary } from '@/components/shared/RouteErrorBoundary';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const [ownerEvents, setOwnerEvents] = useState<OwnerEvent[]>([]);
  const [playerSessions, setPlayerSessions] = useState<PlayerSession[]>([]);
  const fadeAnim = useFadeIn(600);
  const { translateY, opacity } = useSlideUp();

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    const owned = await getOwnerEvents();
    const sessions = await SessionService.getAllSessions();
    setOwnerEvents(owned);
    setPlayerSessions(sessions);
  };

  const handleCreateEvent = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/create-event');
  };

  const handleJoinEvent = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/join-event');
  };

  const handleEventPress = (event: OwnerEvent) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(event)/[id]',
      params: {
        id: event.eventId,
        ownerId: event.ownerId,
        code: event.eventCode,
      },
    });
  };

  const handleSessionPress = (session: PlayerSession) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(event)/[id]',
      params: {
        id: session.eventId,
        playerId: session.playerId,
      },
    });
  };

  return (
    <RouteErrorBoundary routeName="home">
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <Animated.View style={[styles.hero, { opacity: fadeAnim }]}>
          <View style={styles.logoContainer}>
            <Sparkles size={48} color={colors.primary} strokeWidth={2} />
          </View>
          <Text style={styles.appName}>Flick</Text>
          <Text style={styles.tagline}>Turn events into games</Text>
          <View style={styles.socialProof}>
            <Text style={styles.socialProofText}>🔥 Join active events worldwide</Text>
          </View>
        </Animated.View>

        {/* Main Actions */}
        <Animated.View style={[styles.actionsContainer, { opacity, transform: [{ translateY }] }]}>
          <TouchableOpacity
            style={styles.primaryActionContainer}
            onPress={handleCreateEvent}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryAction}
            >
              <Trophy size={36} color="#fff" strokeWidth={2.5} />
              <View style={styles.primaryActionText}>
                <Text style={styles.primaryActionTitle}>Create Event</Text>
                <Text style={styles.primaryActionSubtitle}>Host the game 🎮</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={handleJoinEvent}
            activeOpacity={0.9}
          >
            <Users size={32} color={colors.primary} strokeWidth={2.5} />
            <View style={styles.secondaryActionText}>
              <Text style={styles.secondaryActionTitle}>Join Event</Text>
              <Text style={styles.secondaryActionSubtitle}>Have a code? Jump in! 🚀</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Events You're In (Player Sessions) */}
        {playerSessions.length > 0 && (
          <View style={styles.myEventsSection}>
            <Text style={styles.sectionTitle}>Events You're In</Text>
            <Text style={styles.sectionSubtitle}>Continue where you left off</Text>
            <View style={styles.eventsList}>
              {playerSessions.map((session) => (
                <Card
                  key={session.eventId}
                  style={styles.sessionCard}
                  pressable
                  onPress={() => handleSessionPress(session)}
                >
                  <View style={styles.sessionCardContent}>
                    <View style={styles.sessionCardLeft}>
                      <View style={styles.sessionAvatar}>
                        <Text style={styles.sessionAvatarText}>
                          {session.playerName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.sessionInfo}>
                        <Text style={styles.sessionPlayerName}>{session.playerName}</Text>
                        <Text style={styles.sessionEventId}>
                          Event: {session.eventId.substring(0, 8)}...
                        </Text>
                        <Text style={styles.sessionDate}>
                          Joined {new Date(session.joinedAt).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                    <Play size={24} color={colors.primary} fill={colors.primary} />
                  </View>
                </Card>
              ))}
            </View>
          </View>
        )}

        {/* Your Created Events */}
        {ownerEvents.length > 0 && (
          <View style={styles.myEventsSection}>
            <Text style={styles.sectionTitle}>Your Events</Text>
            <Text style={styles.sectionSubtitle}>Events you created</Text>
            <View style={styles.eventsList}>
              {ownerEvents.map((event) => (
                <Card
                  key={event.eventId}
                  style={styles.eventCard}
                  pressable
                  onPress={() => handleEventPress(event)}
                >
                  <View style={styles.eventCardContent}>
                    <View style={styles.eventCardLeft}>
                      <Text style={styles.eventCardTitle}>{event.title}</Text>
                      <Text style={styles.eventCardCode}>Code: {event.eventCode}</Text>
                    </View>
                    <ChevronRight size={24} color={colors.textSecondary} />
                  </View>
                </Card>
              ))}
            </View>
          </View>
        )}

        {/* How It Works */}
        <View style={styles.howItWorksSection}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.stepsList}>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Create photo challenges</Text>
                <Text style={styles.stepDescription}>Set fun tasks for your friends</Text>
              </View>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Friends upload photos</Text>
                <Text style={styles.stepDescription}>Everyone competes in real-time</Text>
              </View>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Most reactions wins</Text>
                <Text style={styles.stepDescription}>Vote with ❤️ 🔥 💯</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Perfect for parties, festivals, team outings, and celebrations ✨
          </Text>
        </View>
      </ScrollView>
    </RouteErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: spacing.l,
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.l,
    ...shadows.glow,
  },
  appName: {
    ...typography.hero,
    color: colors.text,
    marginBottom: spacing.s,
  },
  tagline: {
    ...typography.headline,
    color: colors.textSecondary,
    marginBottom: spacing.l,
  },
  socialProof: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: borderRadius.full,
  },
  socialProofText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  actionsContainer: {
    paddingHorizontal: spacing.m,
    gap: spacing.m,
  },
  primaryActionContainer: {
    borderRadius: borderRadius.l,
    ...shadows.primaryGlow,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.l,
    padding: spacing.l,
    borderRadius: borderRadius.l,
  },
  primaryActionText: {
    flex: 1,
  },
  primaryActionTitle: {
    ...typography.headline,
    color: '#fff',
    marginBottom: spacing.xs,
  },
  primaryActionSubtitle: {
    ...typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.l,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.l,
    padding: spacing.l,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  secondaryActionText: {
    flex: 1,
  },
  secondaryActionTitle: {
    ...typography.headline,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  secondaryActionSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  myEventsSection: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.m,
  },
  sectionTitle: {
    ...typography.headline,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.m,
  },
  eventsList: {
    gap: spacing.m,
  },
  sessionCard: {
    padding: spacing.m,
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  sessionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  sessionAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionAvatarText: {
    ...typography.headline,
    color: '#fff',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionPlayerName: {
    ...typography.bodyBold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sessionEventId: {
    ...typography.small,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  sessionDate: {
    ...typography.small,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  eventCard: {
    padding: spacing.m,
  },
  eventCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventCardLeft: {
    flex: 1,
  },
  eventCardTitle: {
    ...typography.bodyBold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  eventCardCode: {
    ...typography.caption,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  howItWorksSection: {
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.m,
  },
  stepsList: {
    gap: spacing.l,
  },
  step: {
    flexDirection: 'row',
    gap: spacing.m,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    ...typography.headline,
    color: '#fff',
  },
  stepContent: {
    flex: 1,
    paddingTop: spacing.xs,
  },
  stepTitle: {
    ...typography.bodyBold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  stepDescription: {
    ...typography.body,
    color: colors.textSecondary,
  },
  footer: {
    marginTop: spacing.xxl,
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  footerText: {
    ...typography.body,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 24,
  },
});