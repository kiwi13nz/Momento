import React, { useEffect, useState, useCallback } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { Heart, Flame } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography, borderRadius } from '@/lib/design-tokens';
import { ReactionsService } from '@/services/reactions';
import { PhotoService } from '@/services/api';
import type { Reactions } from '@/types';

interface ReactionBarProps {
  photoId: string;
  reactions: Reactions;
  onReact: (reaction: 'heart' | 'fire' | 'hundred', newCount: number) => void;
}

// OPTIMIZED: Memoized component
const ReactionBarComponent = ({ photoId, reactions, onReact }: ReactionBarProps) => {
  const [activeReactions, setActiveReactions] = useState({
    heart: false,
    fire: false,
    hundred: false,
  });

  const [isAnimating, setIsAnimating] = useState({
    heart: false,
    fire: false,
    hundred: false,
  });

  const [scaleAnims] = useState({
    heart: new Animated.Value(1),
    fire: new Animated.Value(1),
    hundred: new Animated.Value(1),
  });

  useEffect(() => {
    ReactionsService.loadCache().then(() => {
      setActiveReactions({
        heart: ReactionsService.hasReacted(photoId, 'heart'),
        fire: ReactionsService.hasReacted(photoId, 'fire'),
        hundred: ReactionsService.hasReacted(photoId, 'hundred'),
      });
    });
  }, [photoId]);

  // OPTIMIZED: Memoized handler
  const handleReact = useCallback(async (reaction: 'heart' | 'fire' | 'hundred') => {
    if (isAnimating[reaction]) return;

    setIsAnimating(prev => ({ ...prev, [reaction]: true }));

    // Animate button
    Animated.sequence([
      Animated.spring(scaleAnims[reaction], {
        toValue: 1.2,
        useNativeDriver: true,
        tension: 100,
        friction: 3,
      }),
      Animated.spring(scaleAnims[reaction], {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 3,
      }),
    ]).start(() => {
      setIsAnimating(prev => ({ ...prev, [reaction]: false }));
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Toggle via API
      const { reactions: newReactions, wasAdded } = await PhotoService.toggleReaction(
        photoId,
        reaction
      );

      // Update active state based on server response
      setActiveReactions((prev) => ({
        ...prev,
        [reaction]: wasAdded,
      }));

      // Call parent with new counts
      onReact(reaction, newReactions[reaction] || 0);
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
    }
  }, [photoId, onReact, isAnimating, scaleAnims]);

  return (
    <View style={styles.container}>
      {/* Heart */}
      <Animated.View style={{ transform: [{ scale: scaleAnims.heart }] }}>
        <TouchableOpacity
          style={[styles.button, activeReactions.heart && styles.buttonActive]}
          onPress={() => handleReact('heart')}
          activeOpacity={0.7}
        >
          <Heart
            size={28}
            color={colors.reactionHeart}
            fill={activeReactions.heart ? colors.reactionHeart : 'transparent'}
            strokeWidth={2.5}
          />
          {reactions.heart && reactions.heart > 0 ? (
            <Text style={styles.count}>{reactions.heart}</Text>
          ) : null}
        </TouchableOpacity>
      </Animated.View>

      {/* Fire */}
      <Animated.View style={{ transform: [{ scale: scaleAnims.fire }] }}>
        <TouchableOpacity
          style={[styles.button, activeReactions.fire && styles.buttonActive]}
          onPress={() => handleReact('fire')}
          activeOpacity={0.7}
        >
          <Flame
            size={28}
            color={colors.reactionFire}
            fill={activeReactions.fire ? colors.reactionFire : 'transparent'}
            strokeWidth={2.5}
          />
          {reactions.fire && reactions.fire > 0 ? (
            <Text style={styles.count}>{reactions.fire}</Text>
          ) : null}
        </TouchableOpacity>
      </Animated.View>

      {/* 100 */}
      <Animated.View style={{ transform: [{ scale: scaleAnims.hundred }] }}>
        <TouchableOpacity
          style={[styles.button, activeReactions.hundred && styles.buttonActive]}
          onPress={() => handleReact('hundred')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.emojiIcon,
            activeReactions.hundred && styles.emojiIconActive
          ]}>
            💯
          </Text>
          {reactions.hundred && reactions.hundred > 0 ? (
            <Text style={styles.count}>{reactions.hundred}</Text>
          ) : null}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// EXPORT MEMOIZED VERSION
export const ReactionBar = React.memo(ReactionBarComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(10, 14, 39, 0.95)',
    borderRadius: borderRadius.xl,
    padding: spacing.s,
    gap: spacing.m,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  button: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.m,
    borderRadius: borderRadius.m,
    minWidth: 56,
  },
  buttonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  emojiIcon: {
    fontSize: 28,
    opacity: 0.7,
  },
  emojiIconActive: {
    opacity: 1,
  },
  count: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
});