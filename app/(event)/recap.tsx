import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Calendar, Users, Camera, Heart } from 'lucide-react-native';
import { colors, spacing, typography, borderRadius } from '@/lib/design-tokens';
import { PhotoService, LeaderboardService, PlayerService } from '@/services/api';
import type { Photo, PlayerScore } from '@/types';

export default function RecapScreen() {
  const params = useLocalSearchParams();
  const eventId = params.eventId as string;
  
  const [stats, setStats] = useState({
    totalPhotos: 0,
    totalReactions: 0,
    totalPlayers: 0,
    topPhoto: null as Photo | null,
    winner: null as PlayerScore | null,
  });

  useEffect(() => {
    loadRecap();
  }, []);

  const loadRecap = async () => {
    const [photos, scores, players] = await Promise.all([
      PhotoService.getByEventId(eventId),
      LeaderboardService.getScores(eventId),
      PlayerService.getByEventId(eventId),
    ]);

    const totalReactions = photos.reduce((sum: number, p: Photo) => {
      return sum + (p.reactions.heart || 0) + (p.reactions.fire || 0) + (p.reactions.hundred || 0);
    }, 0);

    const topPhoto = photos.sort((a: Photo, b: Photo) => {
      const aTotal = (a.reactions.heart || 0) + (a.reactions.fire || 0) + (a.reactions.hundred || 0);
      const bTotal = (b.reactions.heart || 0) + (b.reactions.fire || 0) + (b.reactions.hundred || 0);
      return bTotal - aTotal;
    })[0];

    setStats({
      totalPhotos: photos.length,
      totalReactions,
      totalPlayers: players.length,
      topPhoto,
      winner: scores[0],
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Event Recap</Text>
        <Text style={styles.subtitle}>Here's what happened! 🎉</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Camera size={32} color={colors.primary} />
          <Text style={styles.statNumber}>{stats.totalPhotos}</Text>
          <Text style={styles.statLabel}>Photos</Text>
        </View>

        <View style={styles.statCard}>
          <Heart size={32} color={colors.reactionHeart} />
          <Text style={styles.statNumber}>{stats.totalReactions}</Text>
          <Text style={styles.statLabel}>Reactions</Text>
        </View>

        <View style={styles.statCard}>
          <Users size={32} color={colors.primary} />
          <Text style={styles.statNumber}>{stats.totalPlayers}</Text>
          <Text style={styles.statLabel}>Players</Text>
        </View>
      </View>

      {/* Top Photo */}
      {stats.topPhoto && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏆 Most Popular Photo</Text>
          <Image 
            source={{ uri: stats.topPhoto.photo_url }} 
            style={styles.topPhoto}
          />
          <Text style={styles.topPhotoCaption}>
            by {stats.topPhoto.player.name}
          </Text>
        </View>
      )}

      {/* Winner */}
      {stats.winner && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👑 Winner</Text>
          <Text style={styles.winnerName}>{stats.winner.player_name}</Text>
          <Text style={styles.winnerStats}>
            {stats.winner.reaction_count} reactions on {stats.winner.photo_count} photos
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  title: {
    ...typography.title,
    color: colors.text,
    marginBottom: spacing.s,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.m,
    gap: spacing.m,
    marginBottom: spacing.xl,
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
  section: {
    padding: spacing.l,
    gap: spacing.m,
  },
  sectionTitle: {
    ...typography.headline,
    color: colors.text,
  },
  topPhoto: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: borderRadius.l,
    backgroundColor: colors.surface,
  },
  topPhotoCaption: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  winnerName: {
    ...typography.title,
    color: colors.primary,
    textAlign: 'center',
  },
  winnerStats: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});