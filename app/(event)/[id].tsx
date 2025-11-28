// FIXED: Event Feed Screen - Key changes:
// 1. Pass hasUserReacted from usePhotos to PhotoStories
// 2. Fix handleReact to properly await toggleReaction
// 3. Improve error handling and logging

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  RefreshControl,
  ScrollView,
  Share as RNShare,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Camera, Share2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography } from '@/lib/design-tokens';
import { useEvent } from '@/hooks/useEvent';
import { usePhotos } from '@/hooks/usePhotos';
import { usePlayer } from '@/hooks/usePlayer';
import { useNotifications } from '@/hooks/useNotifications';
import { PhotoGrid } from '@/components/event/PhotoGrid';
import { PhotoStories } from '@/components/event/PhotoStories';
import { Podium } from '@/components/event/Podium';
import { ProgressHeader } from '@/components/event/ProgressHeader';
import { ActivityFeed, type Activity } from '@/components/event/ActivityFeed';
import { TaskPrompt } from '@/components/event/TaskPrompt';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Button } from '@/components/ui/Button';
import { PhotoService, LeaderboardService } from '@/services/api';
import { NotificationService } from '@/services/notifications';
import { SessionService } from '@/services/session';
import { RouteErrorBoundary } from '@/components/shared/RouteErrorBoundary';
import { TooltipOverlay, shouldShowTooltip } from '@/components/shared/TooltipOverlay';
import { EventExpirationBanner } from '@/components/event/EventExpirationBanner';
import type { Photo, PlayerScore } from '@/types';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function EventFeedScreen() {
  const params = useLocalSearchParams();
  const eventId = params.id as string;
  const playerId = params.playerId as string | null;
  const router = useRouter();

  const { event, tasks, loading: eventLoading } = useEvent(eventId);
  const {
    photos,
    loading: photosLoading,
    loadingMore,
    hasMore,
    refreshPhotos,
    loadMorePhotos,
    toggleReaction,
    hasUserReacted
  } = usePhotos(eventId);
  const { submissions, completionRate } = usePlayer(playerId, eventId);
  const { unreadCount, refresh: refreshNotifications } = useNotifications(playerId);
  const { expoPushToken } = usePushNotifications(playerId);

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [scores, setScores] = useState<PlayerScore[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [previousRank, setPreviousRank] = useState<number | null>(null);
  const [showTooltip, setShowTooltip] = useState<{
    visible: boolean;
    step: 'tap_photo' | 'react_to_photo' | 'upload_photo' | null;
  }>({ visible: false, step: null });
  const [photosViewed, setPhotosViewed] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Screen focused - refreshing data');
      handleRefresh();
    }, [eventId])
  );

  useEffect(() => {
    const restoreSession = async () => {
      if (!playerId && eventId) {
        console.log('🔍 Checking for existing session...');
        const session = await SessionService.getSession(eventId);

        if (session) {
          console.log('✅ Session found, restoring:', session.playerId);
          router.replace({
            pathname: '/(event)/[id]',
            params: {
              id: eventId,
              playerId: session.playerId,
            },
          });
        } else {
          console.log('ℹ️ No valid session found for event');
        }
      }
    };

    restoreSession();
  }, [eventId, playerId]);

  useEffect(() => {
    if (eventId && playerId) {
      LeaderboardService.getScores(eventId).then((newScores: PlayerScore[]) => {
        setScores(newScores);

        const playerScore = newScores.find((s: PlayerScore) => s.player_id === playerId);
        if (playerScore) {
          if (previousRank !== null && playerScore.rank < previousRank) {
            NotificationService.notifyRankChange(playerId, playerScore.rank);

            addActivity({
              id: `rank-${Date.now()}`,
              type: 'rank',
              message: `🚀 You moved up to #${playerScore.rank}!`,
              timestamp: new Date(),
            });
          }
          setPreviousRank(playerScore.rank);
        }
      });
    } else if (eventId) {
      LeaderboardService.getScores(eventId).then(setScores);
    }
  }, [eventId, photos, playerId]);

  useEffect(() => {
    if (playerId && photos.length > 0) {
      const checkTooltips = async () => {
        const shouldShow = await shouldShowTooltip('tap_photo');
        if (shouldShow) {
          setTimeout(() => {
            setShowTooltip({ visible: true, step: 'tap_photo' });
          }, 1000);
        }
      };
      checkTooltips();
    }
  }, [playerId, photos]);

  const addActivity = (activity: Activity) => {
    setActivities((prev) => [activity, ...prev.slice(0, 9)]);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    console.log('🔄 Refreshing feed...');

    try {
      await refreshPhotos();
      const newScores = await LeaderboardService.getScores(eventId);
      setScores(newScores);

      if (playerId) {
        await refreshNotifications();
        console.log('✅ Notifications refreshed');
      }

      console.log('✅ Feed refreshed successfully');
    } catch (error) {
      console.error('❌ Failed to refresh feed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handlePhotoPress = (photo: Photo, index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPhotoIndex(index);

    const newViewCount = photosViewed + 1;
    setPhotosViewed(newViewCount);

    if (newViewCount === 3 && playerId) {
      setTimeout(async () => {
        const shouldShow = await shouldShowTooltip('upload_photo');
        if (shouldShow) {
          setShowTooltip({ visible: true, step: 'upload_photo' });
        }
      }, 2000);
    }
  };

  // FIXED: handleReact now properly returns boolean for PhotoStories
  const handleReact = async (
    photoId: string,
    reaction: 'heart' | 'fire' | 'hundred'
  ): Promise<boolean> => {
    console.log(`🔄 Event feed handling reaction ${reaction} for photo ${photoId}`);

    try {
      const wasAdded = await toggleReaction(photoId, reaction);
      console.log(`✅ Reaction ${wasAdded ? 'added' : 'removed'} successfully`);
      return wasAdded;
    } catch (error) {
      console.error('❌ Failed to handle reaction in event feed:', error);
      Alert.alert('Error', 'Failed to react. Please try again.');
      throw error;
    }
  };

  const handleUploadPress = () => {
    if (isEventClosed) {
      Alert.alert('Event Ended', 'This event has closed. No new photos can be uploaded.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Navigate directly to upload screen (no task selection modal)
    router.push({
      pathname: '/(event)/upload',
      params: {
        id: eventId,
        playerId,
      },
    });
  };

  const handleShareEvent = async () => {
    try {
      await RNShare.share({
        message: `🎉 Join my event "${event?.title}"!\n\n📱 Code: ${event?.code}\n\nhttps://tookee.online/`,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const handleNotificationPress = () => {
    router.push({
      pathname: '/notifications',
      params: { playerId },
    });
  };

  const handleEndEvent = () => {
    router.push({
      pathname: '/(event)/winner',
      params: { eventId, eventTitle: event?.title },
    });
  };

  const handleTooltipDismiss = async () => {
    setShowTooltip({ visible: false, step: null });
  };

  if (eventLoading || photosLoading) {
    return <LoadingState message="Loading event..." />;
  }

  if (!event) {
    return (
      <RouteErrorBoundary routeName="event-feed">
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Event not found</Text>
          <Button onPress={() => router.back()}>Go Back</Button>
        </View>
      </RouteErrorBoundary>
    );
  }

  const isEventClosed = event?.closed_at != null;
  const completedTaskIds = submissions.map((s) => s.task_id);
  const playerScore = playerId ? scores.find((s) => s.player_id === playerId) : null;
  const nextPlayerScore = playerScore
    ? scores.find((s) => s.rank === playerScore.rank - 1)
    : null;
  const pointsToNext = nextPlayerScore
    ? nextPlayerScore.reaction_count - playerScore!.reaction_count
    : undefined;

  return (
    <RouteErrorBoundary routeName="event-feed">
      <View style={styles.container}>
        <ActivityFeed activities={activities} />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <View style={styles.headerActions}>
                {playerId && event.owner_id === playerId && (
                  <TouchableOpacity onPress={handleEndEvent} style={{ marginRight: spacing.s }}>
                    <Text style={{ ...typography.body, color: colors.primary }}>End Event</Text>
                  </TouchableOpacity>
                )}

                {playerId && (
                  <NotificationBell
                    unreadCount={unreadCount}
                    onPress={handleNotificationPress}
                  />
                )}
                <TouchableOpacity onPress={handleShareEvent}>
                  <Share2 size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {event?.created_at && (
            <EventExpirationBanner createdAt={event.created_at} />
          )}

          {playerId && playerScore && (
            <ProgressHeader
              completedTasks={submissions.length}
              totalTasks={tasks.length}
              currentRank={playerScore.rank}
              pointsToNext={pointsToNext}
            />
          )}

          {scores.length > 0 && <Podium scores={scores} />}

          {photos.length > 0 ? (
            <PhotoGrid
              photos={photos}
              onPhotoPress={handlePhotoPress}
              loading={photosLoading}
              onLoadMore={loadMorePhotos}
              hasMore={hasMore}
            />
          ) : (
            <EmptyState
              type="feed"
              onAction={playerId ? handleUploadPress : undefined}
              actionLabel={playerId ? "Upload First Photo" : undefined}
            />
          )}
        </ScrollView>

        {playerId && !isEventClosed && (
          <View style={styles.footer}>
            <Button
              onPress={handleUploadPress}
              icon={<Camera size={24} color="#fff" />}
              fullWidth
              size="large"
              variant="gradient"
            >
              Upload Photo
            </Button>
          </View>
        )}

        {isEventClosed && (
          <View style={styles.closedBanner}>
            <Text style={styles.closedText}>
              🏁 Event Ended - No more uploads allowed
            </Text>
          </View>
        )}

        {/* FIXED: PhotoStories now receives hasUserReacted callback */}
        {selectedPhotoIndex !== null && (
          <Modal
            visible={true}
            animationType="fade"
            onRequestClose={() => setSelectedPhotoIndex(null)}
          >
            <PhotoStories
              photos={photos}
              initialIndex={selectedPhotoIndex}
              onClose={() => setSelectedPhotoIndex(null)}
              onReact={handleReact}
              hasUserReacted={hasUserReacted}
            />
          </Modal>
        )}

        {showTooltip.visible && showTooltip.step && (
          <TooltipOverlay
            step={showTooltip.step}
            visible={showTooltip.visible}
            onDismiss={handleTooltipDismiss}
          />
        )}
      </View>
    </RouteErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 120,
  },
  header: {
    paddingHorizontal: spacing.m,
    paddingBottom: spacing.m,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventTitle: {
    ...typography.title,
    color: colors.text,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.m,
    backgroundColor: colors.backgroundLight,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  closedBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.m,
    backgroundColor: colors.surfaceLight,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceLight,
    alignItems: 'center',
  },
  closedText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  errorText: {
    ...typography.headline,
    color: colors.text,
    marginBottom: spacing.l,
  },
});