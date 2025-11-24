import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { colors, borderRadius, spacing, shadows } from '@/lib/design-tokens';
import { createPressAnimation } from '@/lib/animations';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  pressable?: boolean;
  onPress?: () => void;
  variant?: 'default' | 'glass';
}

export function Card({
  children,
  style,
  pressable = false,
  onPress,
  variant = 'default',
}: CardProps) {
  const { scale, onPressIn, onPressOut } = createPressAnimation();

  const variantStyle = variant === 'glass' ? styles.glass : styles.default;

  if (pressable && onPress) {
    return (
      <Animated.View style={[{ transform: [{ scale }] }]}>
        <TouchableOpacity
          style={[styles.base, variantStyle, style]}
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          activeOpacity={0.9}
        >
          {children}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return <View style={[styles.base, variantStyle, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.l,
    padding: spacing.m,
  },
  default: {
    backgroundColor: colors.surface,
    ...shadows.medium,
  },
  glass: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
});