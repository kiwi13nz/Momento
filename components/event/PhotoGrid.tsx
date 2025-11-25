import React from 'react';
import { FlatList, TouchableOpacity, Image, StyleSheet, Dimensions, View, Text, ActivityIndicator } from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/lib/design-tokens';
import type { Photo } from '@/types';

interface PhotoGridProps {
  photos: Photo[];
  onPhotoPress: (photo: Photo, index: number) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
}

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const SPACING = spacing.s;
const PHOTO_SIZE = (width - SPACING * (COLUMN_COUNT + 1)) / COLUMN_COUNT;

// OPTIMIZED: Memoized component
const PhotoGridComponent = ({ photos, onPhotoPress, onLoadMore, hasMore = false, loading = false }: PhotoGridProps) => {
  const renderReactions = (photo: Photo) => {
    const reactions = [];

    if (photo.reactions.heart && photo.reactions.heart > 0) {
      reactions.push({ emoji: '❤️', count: photo.reactions.heart });
    }
    if (photo.reactions.fire && photo.reactions.fire > 0) {
      reactions.push({ emoji: '🔥', count: photo.reactions.fire });
    }
    if (photo.reactions.hundred && photo.reactions.hundred > 0) {
      reactions.push({ emoji: '💯', count: photo.reactions.hundred });
    }

    if (reactions.length === 0) return null;

    return (
      <View style={styles.reactionsContainer}>
        {reactions.map((reaction, index) => (
          <View key={index} style={styles.reactionItem}>
            <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
            <Text style={styles.reactionCount}>{reaction.count}</Text>
          </View>
        ))}
      </View>
    );
  };

  // OPTIMIZED: Memoized render function
  const renderItem = React.useCallback(({ item, index }: { item: Photo; index: number }) => (
    <TouchableOpacity
      style={styles.photoContainer}
      onPress={() => onPhotoPress(item, index)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: item.photo_url }}  // ← CORRECT
        style={styles.photo}
        resizeMode="cover"
      />

      <View style={styles.bottomOverlay}>
        <Text style={styles.playerName} numberOfLines={1}>
          {item.player.name}
        </Text>
        {renderReactions(item)}
      </View>
    </TouchableOpacity>
  ), [onPhotoPress]);

  // OPTIMIZED: Stable key extractor
  const keyExtractor = React.useCallback((item: Photo) => item.id, []);

  return (
    <FlatList
      data={photos}
      keyExtractor={keyExtractor}
      numColumns={COLUMN_COUNT}
      scrollEnabled={false}
      contentContainerStyle={styles.grid}
      columnWrapperStyle={styles.row}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      renderItem={renderItem}
      removeClippedSubviews={true} // Performance boost
      maxToRenderPerBatch={10} // Render 10 items at a time
      updateCellsBatchingPeriod={50} // Batch updates every 50ms
      initialNumToRender={20} // Render first 20 immediately
      windowSize={5} // Keep 5 screens worth in memory
      ListFooterComponent={
        loading && hasMore ? (
          <View style={styles.loadingFooter}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Loading more photos...</Text>
          </View>
        ) : null
      }
    />
  );
};

// EXPORT MEMOIZED VERSION
export const PhotoGrid = React.memo(PhotoGridComponent);

const styles = StyleSheet.create({
  grid: {
    padding: spacing.s,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: spacing.s,
  },
  photoContainer: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: borderRadius.m,
    overflow: 'hidden',
    backgroundColor: colors.surfaceLight,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    // resizeMode removed from here
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.s,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  playerName: {
    ...typography.small,
    color: colors.text,
    fontWeight: '600',
    fontSize: 10,
  },
  reactionsContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  reactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reactionEmoji: {
    fontSize: 12,
  },
  reactionCount: {
    fontSize: 10,
    color: colors.text,
    fontWeight: '700',
  },
  loadingFooter: {
    padding: spacing.l,
    alignItems: 'center',
    gap: spacing.s,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});