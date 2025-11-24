import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Camera, Heart, Flame, Award, TrendingUp } from 'lucide-react-native';
import { colors, spacing, typography, borderRadius } from '@/lib/design-tokens';

export type Activity = {
  id: string;
  type: 'photo' | 'reaction' | 'rank';
  message: string;
  timestamp: Date;
};

interface ActivityFeedProps {
  activities: Activity[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const [visible, setVisible] = useState(false);
  const [currentActivity, setCurrentActivity] = useState<Activity | null>(null);
  const slideAnim = useState(new Animated.Value(-100))[0];
  const opacityAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (activities.length === 0) return;

    const latest = activities[0];
    if (!currentActivity || latest.id !== currentActivity.id) {
      setCurrentActivity(latest);
      showNotification();
    }
  }, [activities]);

  const showNotification = () => {
    setVisible(true);

    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      hideNotification();
    }, 3000);
  };

  const hideNotification = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
    });
  };

  if (!visible || !currentActivity) return null;

  const getIcon = () => {
    switch (currentActivity.type) {
      case 'photo':
        return <Camera size={20} color={colors.primary} />;
      case 'reaction':
        return <Heart size={20} color={colors.reactionHeart} />;
      case 'rank':
        return <TrendingUp size={20} color={colors.success} />;
      default:
        return null;
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.content}>
        {getIcon()}
        <Text style={styles.message}>{currentActivity.message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 120,
    left: spacing.m,
    right: spacing.m,
    zIndex: 100,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.l,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  message: {
    ...typography.bodyBold,
    color: colors.text,
    flex: 1,
  },
});