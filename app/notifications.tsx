import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Heart, TrendingUp, Trophy, Award, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography, borderRadius, shadows } from '@/lib/design-tokens';
import { Button } from '@/components/ui/Button';
import { NotificationService, type Notification } from '@/services/notifications';
import { RouteErrorBoundary } from '@/components/shared/RouteErrorBoundary';

export default function NotificationsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const playerId = params.playerId as string;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
    const channel = NotificationService.subscribeToPlayer(playerId, (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
    });

    return () => {
      channel.unsubscribe();
    };
  }, [playerId]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await NotificationService.getAll(playerId);
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: Notification) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!notification.read) {
      await NotificationService.markAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
    }
  };

  const handleMarkAllAsRead = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await NotificationService.markAllAsRead(playerId);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'reaction':
        return <Heart size={20} color={colors.reactionHeart} />;
      case 'rank_change':
        return <TrendingUp size={20} color={colors.success} />;
      case 'winner':
        return <Trophy size={20} color={colors.warning} />;
      default:
        return <Award size={20} color={colors.primary} />;
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const timeAgo = getTimeAgo(item.created_at);

    return (
      <TouchableOpacity
        style={[styles.notificationCard, !item.read && styles.notificationCardUnread]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>{getNotificationIcon(item.type)}</View>
        <View style={styles.notificationContent}>
          <Text style={[styles.message, !item.read && styles.messageUnread]}>
            {item.message}
          </Text>
          <Text style={styles.timestamp}>{timeAgo}</Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <RouteErrorBoundary routeName="notifications">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={{ width: 40 }} />
        </View>

        {unreadCount > 0 && (
          <View style={styles.actionsBar}>
            <Button
              onPress={handleMarkAllAsRead}
              variant="ghost"
              size="small"
              icon={<Check size={16} color={colors.primary} />}
            >
              Mark all as read
            </Button>
          </View>
        )}

        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Award size={64} color={colors.textSecondary} strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySubtitle}>
                You'll see notifications here when you get reactions or rank changes
              </Text>
            </View>
          }
        />
      </View>
    </RouteErrorBoundary>
  );
}

function getTimeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return then.toLocaleDateString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: spacing.m,
    paddingBottom: spacing.m,
    backgroundColor: colors.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.headline,
    color: colors.text,
  },
  actionsBar: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
    alignItems: 'flex-end',
  },
  list: {
    padding: spacing.m,
    gap: spacing.s,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.m,
    padding: spacing.m,
    ...shadows.small,
  },
  notificationCardUnread: {
    backgroundColor: colors.surfaceLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
    gap: spacing.xs,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
  },
  messageUnread: {
    ...typography.bodyBold,
    color: colors.text,
  },
  timestamp: {
    ...typography.small,
    color: colors.textTertiary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.m,
  },
  emptyTitle: {
    ...typography.headline,
    color: colors.text,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});