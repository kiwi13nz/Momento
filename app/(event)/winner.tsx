import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Share, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Trophy, Share2, Camera } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, borderRadius } from '@/lib/design-tokens';
import { Button } from '@/components/ui/Button';
import { LeaderboardService } from '@/services/api';
import type { PlayerScore } from '@/types';

export default function WinnerScreen() {
  const params = useLocalSearchParams();
  const eventId = params.eventId as string;
  const eventTitle = params.eventTitle as string;
  const router = useRouter();
  
  const [winner, setWinner] = useState<PlayerScore | null>(null);
  const [topThree, setTopThree] = useState<PlayerScore[]>([]);
  const [confettiAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    loadWinner();
    startCelebration();
  }, []);

  const loadWinner = async () => {
    const scores = await LeaderboardService.getScores(eventId);
    setWinner(scores[0]);
    setTopThree(scores.slice(0, 3));
  };

  const startCelebration = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    Animated.spring(confettiAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🏆 ${winner?.player_name} won "${eventTitle}"!\n\nThey got ${winner?.reaction_count} reactions on ${winner?.photo_count} photos. Join us on Flick!`,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  if (!winner) return null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0A0E27', '#1C2128', '#2D333B']}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: confettiAnim,
            transform: [
              {
                scale: confettiAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ],
          },
        ]}
      >
        {/* Trophy Icon */}
        <View style={styles.trophyContainer}>
          <Trophy size={80} color="#FFD700" fill="#FFD700" strokeWidth={2} />
        </View>

        {/* Winner Announcement */}
        <Text style={styles.title}>🎉 Winner! 🎉</Text>
        <Text style={styles.winnerName}>{winner.player_name}</Text>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{winner.reaction_count}</Text>
            <Text style={styles.statLabel}>Total Reactions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{winner.photo_count}</Text>
            <Text style={styles.statLabel}>Photos</Text>
          </View>
        </View>

        {/* Top 3 */}
        <View style={styles.podiumContainer}>
          <Text style={styles.podiumTitle}>Top 3</Text>
          {topThree.map((player, index) => (
            <View key={player.player_id} style={styles.podiumItem}>
              <View style={styles.podiumRank}>
                <Text style={styles.podiumRankText}>#{index + 1}</Text>
              </View>
              <Text style={styles.podiumName}>{player.player_name}</Text>
              <Text style={styles.podiumScore}>🔥 {player.reaction_count}</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            onPress={handleShare}
            variant="gradient"
            fullWidth
            icon={<Share2 size={20} color="#fff" />}
          >
            Share Results
          </Button>
          
          <Button
            onPress={() => router.back()}
            variant="ghost"
            fullWidth
          >
            Back to Event
          </Button>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.xl,
  },
  trophyContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.l,
  },
  title: {
    ...typography.display,
    color: colors.text,
    textAlign: 'center',
  },
  winnerName: {
    ...typography.hero,
    color: colors.primary,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.l,
    width: '100%',
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.l,
    padding: spacing.l,
    alignItems: 'center',
    gap: spacing.s,
  },
  statNumber: {
    ...typography.display,
    color: colors.primary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  podiumContainer: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.l,
    padding: spacing.l,
    gap: spacing.m,
  },
  podiumTitle: {
    ...typography.headline,
    color: colors.text,
    marginBottom: spacing.s,
  },
  podiumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  podiumRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumRankText: {
    ...typography.bodyBold,
    color: '#fff',
  },
  podiumName: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  podiumScore: {
    ...typography.bodyBold,
    color: colors.textSecondary,
  },
  actions: {
    width: '100%',
    gap: spacing.m,
  },
});