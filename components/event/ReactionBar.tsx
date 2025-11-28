import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { Heart, Flame } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography, borderRadius } from '@/lib/design-tokens';
import type { Reactions } from '@/types';

interface ReactionBarProps {
  photoId: string;
  reactions: Reactions;
  hasUserReacted: (reaction: 'heart' | 'fire' | 'hundred') => boolean;
  onReact: (reaction: 'heart' | 'fire' | 'hundred', newCount: number) => Promise<boolean>;
}

// FIXED: Prevent infinite loops with debouncing and proper state management
const ReactionBarComponent = ({ photoId, reactions, hasUserReacted, onReact }: ReactionBarProps) => {
  const [activeReactions, setActiveReactions] = useState({
    heart: false,
    fire: false,
    hundred: false,
  });

  const isProcessing = useRef<Set<string>>(new Set());
  const scaleAnims = useRef({
    heart: new Animated.Value(1),
    fire: new Animated.Value(1),
    hundred: new Animated.Value(1),
  });

  // Load active state only when photoId changes
  useEffect(() => {
    console.log(`🔄 Loading reaction state for photo ${photoId}`);
    setActiveReactions({
      heart: hasUserReacted('heart'),
      fire: hasUserReacted('fire'),
      hundred: hasUserReacted('hundred'),
    });
  }, [photoId]); // Only depend on photoId to prevent loops

  // FIXED: Debounced handler with proper locking
  const handleReact = useCallback(async (reaction: 'heart' | 'fire' | 'hundred') => {
    const lockKey = `${photoId}-${reaction}`;

    if (isProcessing.current.has(lockKey)) {
      console.log(`⏸️ Reaction ${reaction} already processing, skipping`);
      return;
    }

    isProcessing.current.add(lockKey);

    // Animate button
    Animated.sequence([
      Animated.spring(scaleAnims.current[reaction], {
        toValue: 1.2,
        useNativeDriver: true,
        tension: 100,
        friction: 3,
      }),
      Animated.spring(scaleAnims.current[reaction], {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 3,
      }),
    ]).start();

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      console.log(`🔄 Toggling ${reaction} for photo ${photoId}`);

      // Optimistic update
      const wasActive = activeReactions[reaction];
      setActiveReactions((prev) => ({
        ...prev,
        [reaction]: !wasActive,
      }));

      // Call parent's onReact - it handles the API call and returns wasAdded
      const wasAdded = await onReact(reaction, 0);  // Parent returns boolean

      console.log(`✅ Reaction ${wasAdded ? 'added' : 'removed'}`);

      // Update with actual result from parent
      setActiveReactions((prev) => ({
        ...prev,
        [reaction]: wasAdded,
      }));
    } catch (error) {
      console.error('❌ Failed to toggle reaction:', error);

      // Revert optimistic update
      setActiveReactions({
        heart: hasUserReacted('heart'),
        fire: hasUserReacted('fire'),
        hundred: hasUserReacted('hundred'),
      });
    } finally {
      // Release lock after a small delay to prevent rapid clicking
      setTimeout(() => {
        isProcessing.current.delete(lockKey);
      }, 500);
    }
  }, [photoId, onReact, activeReactions]); // Include activeReactions for optimistic update

  return (
    <View style={styles.container}>
      {/* Heart */}
      <Animated.View style={{ transform: [{ scale: scaleAnims.current.heart }] }}>
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
      <Animated.View style={{ transform: [{ scale: scaleAnims.current.fire }] }}>
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
      <Animated.View style={{ transform: [{ scale: scaleAnims.current.hundred }] }}>
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