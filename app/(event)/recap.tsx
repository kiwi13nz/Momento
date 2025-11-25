// app/(event)/recap.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LeaderboardService, PhotoService, TaskService } from '@/services/api';
import type { PlayerScore, Photo, Task } from '@/types';

const { width } = Dimensions.get('window');

interface TopPhotoByTask {
  task: Task;
  photo: Photo;
}

interface WinnerData {
  player: PlayerScore;
  topPhotos: Photo[];
}

export default function RecapScreen() {
  const { id: eventId } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [winner, setWinner] = useState<WinnerData | null>(null);
  const [topPhotosByTask, setTopPhotosByTask] = useState<TopPhotoByTask[]>([]);

  useEffect(() => {
    if (eventId) {
      loadRecapData();
    }
  }, [eventId]);

  const loadRecapData = async () => {
    try {
      setLoading(true);

      // Get leaderboard scores
      const scores = await LeaderboardService.getScores(eventId!);
      if (scores.length === 0) {
        setLoading(false);
        return;
      }

      // Get overall winner (rank 1)
      const overallWinner = scores[0];

      // Get all photos and tasks
      const [allPhotos, tasks] = await Promise.all([
        PhotoService.getByEventId(eventId!),
        TaskService.getByEventId(eventId!),
      ]);

      // Get winner's top 3 photos
      const winnerPhotos = allPhotos
        .filter((photo) => photo.player.id === overallWinner.player_id)
        .sort((a, b) => getTotalReactions(b) - getTotalReactions(a))
        .slice(0, 3);

      setWinner({
        player: overallWinner,
        topPhotos: winnerPhotos,
      });

      // Find top photo for each task
      const topPhotos: TopPhotoByTask[] = tasks
        .map((task) => {
          // Get all photos for this task
          const taskPhotos = allPhotos.filter((photo) => photo.task.id === task.id);

          if (taskPhotos.length === 0) return null;

          // Find photo with most reactions
          const topPhoto = taskPhotos.reduce((max, current) =>
            getTotalReactions(current) > getTotalReactions(max) ? current : max
          );

          return { task, photo: topPhoto };
        })
        .filter((item): item is TopPhotoByTask => item !== null);

      setTopPhotosByTask(topPhotos);
    } catch (error) {
      console.error('Failed to load recap:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTotalReactions = (photo: Photo): number => {
    const { reactions } = photo;
    return (reactions.heart || 0) + (reactions.fire || 0) + (reactions.hundred || 0);
  };

  const formatReactions = (photo: Photo): string => {
    const parts: string[] = [];
    if (photo.reactions.heart) parts.push(`❤️ ${photo.reactions.heart}`);
    if (photo.reactions.fire) parts.push(`🔥 ${photo.reactions.fire}`);
    if (photo.reactions.hundred) parts.push(`💯 ${photo.reactions.hundred}`);
    return parts.join('  ');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Calculating winners...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!winner) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="images-outline" size={64} color="#C7C7CC" />
          <Text style={styles.emptyText}>No photos yet!</Text>
          <Text style={styles.emptySubtext}>Upload some photos to see the recap</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Recap</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Overall Winner Section */}
        <View style={styles.winnerSection}>
          <View style={styles.winnerHeader}>
            <Ionicons name="trophy" size={48} color="#FFD700" />
            <Text style={styles.winnerTitle}>Overall Winner</Text>
          </View>

          <View style={styles.winnerCard}>
            <Text style={styles.winnerName}>{winner.player.player_name}</Text>
            <View style={styles.winnerStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{winner.player.reaction_count}</Text>
                <Text style={styles.statLabel}>Total Reactions</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{winner.player.photo_count}</Text>
                <Text style={styles.statLabel}>Photos</Text>
              </View>
            </View>
          </View>

          {/* Winner's Top 3 Photos */}
          {winner.topPhotos.length > 0 && (
            <View style={styles.topPhotosSection}>
              <Text style={styles.sectionTitle}>Top Photos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {winner.topPhotos.map((photo, index) => (
                  <View key={photo.id} style={styles.topPhotoCard}>
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankBadgeText}>#{index + 1}</Text>
                    </View>
                    <Image source={{ uri: photo.photo_url }} style={styles.topPhotoImage} />
                    <Text style={styles.topPhotoTask} numberOfLines={2}>
                      {photo.task.description}
                    </Text>
                    <Text style={styles.topPhotoReactions}>{formatReactions(photo)}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Best Photos by Category */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Best Photos by Category</Text>
          {topPhotosByTask.map((item) => (
            <View key={item.task.id} style={styles.categoryCard}>
              <View style={styles.categoryHeader}>
                <Ionicons name="star" size={20} color="#FFD700" />
                <Text style={styles.categoryTitle} numberOfLines={2}>
                  {item.task.description}
                </Text>
              </View>

              <View style={styles.categoryContent}>
                <Image source={{ uri: item.photo.photo_url }} style={styles.categoryImage} />
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryPlayerName}>{item.photo.player.name}</Text>
                  <Text style={styles.categoryReactions}>{formatReactions(item.photo)}</Text>
                  <Text style={styles.categoryTotal}>
                    {getTotalReactions(item.photo)} total reactions
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Share Section */}
        <View style={styles.shareSection}>
          <TouchableOpacity style={styles.shareButton}>
            <Ionicons name="share-social" size={24} color="#fff" />
            <Text style={styles.shareButtonText}>Share Recap</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  winnerSection: {
    marginBottom: 32,
  },
  winnerHeader: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  winnerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000',
  },
  winnerCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  winnerName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000',
    marginBottom: 16,
  },
  winnerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#C7C7CC',
  },
  topPhotosSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  topPhotoCard: {
    width: 180,
    marginRight: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    overflow: 'hidden',
  },
  rankBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 1,
  },
  rankBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  topPhotoImage: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  topPhotoTask: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    padding: 12,
    paddingBottom: 8,
  },
  topPhotoReactions: {
    fontSize: 12,
    color: '#8E8E93',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  categoriesSection: {
    marginBottom: 32,
  },
  categoryCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  categoryTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  categoryContent: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  categoryInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  categoryPlayerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  categoryReactions: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  categoryTotal: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  shareSection: {
    alignItems: 'center',
    paddingTop: 16,
  },
  shareButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 200,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});