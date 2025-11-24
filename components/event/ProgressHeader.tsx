import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Trophy, TrendingUp } from 'lucide-react-native';
import { colors, spacing, typography, borderRadius } from '@/lib/design-tokens';

interface ProgressHeaderProps {
  completedTasks: number;
  totalTasks: number;
  currentRank: number;
  pointsToNext?: number;
}

export function ProgressHeader({
  completedTasks,
  totalTasks,
  currentRank,
  pointsToNext,
}: ProgressHeaderProps) {
  const progress = totalTasks > 0 ? completedTasks / totalTasks : 0;

  return (
    <View style={styles.container}>
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.label}>🎯 Your Progress</Text>
          <Text style={styles.progressText}>
            {completedTasks}/{totalTasks} tasks
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      <View style={styles.rankSection}>
        <Trophy size={20} color={colors.primary} />
        <View style={styles.rankContent}>
          <Text style={styles.rankText}>You're #{currentRank}</Text>
          {pointsToNext && pointsToNext > 0 && (
            <View style={styles.rankHint}>
              <TrendingUp size={14} color={colors.success} />
              <Text style={styles.rankHintText}>
                {pointsToNext}🔥 to next place
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.l,
    padding: spacing.m,
    marginHorizontal: spacing.m,
    marginBottom: spacing.m,
    gap: spacing.m,
  },
  progressSection: {
    gap: spacing.s,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...typography.bodyBold,
    color: colors.text,
  },
  progressText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.s,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.s,
  },
  rankSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  rankContent: {
    flex: 1,
    gap: spacing.xs,
  },
  rankText: {
    ...typography.bodyBold,
    color: colors.text,
  },
  rankHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rankHintText: {
    ...typography.small,
    color: colors.success,
  },
});