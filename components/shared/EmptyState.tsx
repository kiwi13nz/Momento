import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Camera, Users, Trophy } from 'lucide-react-native';
import { colors, spacing, typography } from '@/lib/design-tokens';
import { Button } from '@/components/ui/Button';

interface EmptyStateProps {
  type: 'feed' | 'tasks' | 'players';
  onAction?: () => void;
  actionLabel?: string;
}

export function EmptyState({ type, onAction, actionLabel }: EmptyStateProps) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Scale in
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  const content = {
    feed: {
      icon: Camera,
      title: "Let's get this party started! 🎉",
      subtitle: "Upload your first photo and watch the magic happen",
      actionLabel: actionLabel || "Upload First Photo",
    },
    tasks: {
      icon: Trophy,
      title: "Time to set challenges! 💪",
      subtitle: "Add photo tasks for your players to complete",
      actionLabel: actionLabel || "Add Tasks",
    },
    players: {
      icon: Users,
      title: "Waiting for players... 👀",
      subtitle: "Share your event code to get the party started",
      actionLabel: actionLabel || "Share Code",
    },
  }[type];

  const Icon = content.icon;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: floatAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.iconContainer}>
        <Icon size={64} color={colors.primary} strokeWidth={1.5} />
      </View>
      <Text style={styles.title}>{content.title}</Text>
      <Text style={styles.subtitle}>{content.subtitle}</Text>
      {onAction && (
        <Button onPress={onAction} style={styles.button} size="large">
          {content.actionLabel}
        </Button>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.headline,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.m,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  button: {
    minWidth: 200,
  },
});