import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Trophy, Medal, Award } from 'lucide-react-native';
import { colors, spacing, typography, borderRadius } from '@/lib/design-tokens';
import type { PlayerScore } from '@/types';
import { useFadeIn } from '@/lib/animations';
import { Animated } from 'react-native';

interface PodiumProps {
  scores: PlayerScore[];
}

// OPTIMIZED: Memoized component
const PodiumComponent = ({ scores }: PodiumProps) => {
  const opacity = useFadeIn(400);

  if (scores.length === 0) return null;

  const top3 = scores.slice(0, 3);

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      {top3.map((score, index) => {
        const Icon = index === 0 ? Trophy : index === 1 ? Medal : Award;
        const iconColor = index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32';

        return (
          <View key={score.player_id} style={styles.podiumCard}>
            <Icon size={20} color={iconColor} />
            <Text style={styles.playerName} numberOfLines={1}>
              {score.player_name}
            </Text>
            <Text style={styles.score}>🔥 {score.reaction_count}</Text>
          </View>
        );
      })}
    </Animated.View>
  );
};

// EXPORT MEMOIZED VERSION
export const Podium = React.memo(PodiumComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.s,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
  },
  podiumCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.m,
    padding: spacing.m,
  },
  playerName: {
    ...typography.caption,
    color: colors.text,
    flex: 1,
  },
  score: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
  },
});