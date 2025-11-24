import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  View,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius, typography, shadows } from '@/lib/design-tokens';
import { createPressAnimation } from '@/lib/animations';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gradient';
type Size = 'small' | 'medium' | 'large';

interface ButtonProps {
  children: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  style,
}: ButtonProps) {
  const { scale, onPressIn, onPressOut } = createPressAnimation();

  const handlePress = () => {
    if (loading || disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const sizeStyle = styles[`size_${size}`];
  const textSizeStyle = styles[`textSize_${size}`];

  const content = (
    <>
      {loading ? (
        <ActivityIndicator
          color={variant === 'gradient' || variant === 'primary' || variant === 'danger' ? '#fff' : colors.primary}
        />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text style={[styles.text, styles[`${variant}Text`], textSizeStyle]}>{children}</Text>
        </View>
      )}
    </>
  );

  if (variant === 'gradient') {
    return (
      <Animated.View style={[{ transform: [{ scale }] }, fullWidth && styles.fullWidth]}>
        <TouchableOpacity
          onPress={handlePress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          activeOpacity={0.9}
          disabled={loading || disabled}
          style={[sizeStyle, (loading || disabled) && styles.disabled, style]}
        >
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.base, sizeStyle, styles.gradient]}
          >
            {content}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[{ transform: [{ scale }] }, fullWidth && styles.fullWidth]}>
      <TouchableOpacity
        style={[
          styles.base,
          styles[variant],
          sizeStyle,
          (loading || disabled) && styles.disabled,
          style,
        ]}
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.9}
        disabled={loading || disabled}
      >
        {content}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.m,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  icon: {
    marginRight: spacing.xs,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },

  // Variants
  primary: {
    backgroundColor: colors.primary,
    ...shadows.primaryGlow,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: colors.surfaceLight,
  },
  danger: {
    backgroundColor: colors.error,
  },
  gradient: {
    ...shadows.glow,
  },

  // Sizes
  size_small: {
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.m,
    minHeight: 36,
  },
  size_medium: {
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.l,
    minHeight: 48,
  },
  size_large: {
    paddingVertical: spacing.l,
    paddingHorizontal: spacing.xl,
    minHeight: 56,
  },

  // Text styles
  text: {
    fontWeight: '700',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: colors.primary,
  },
  ghostText: {
    color: colors.text,
  },
  dangerText: {
    color: '#FFFFFF',
  },
  gradientText: {
    color: '#FFFFFF',
  },
  textSize_small: {
    fontSize: 14,
  },
  textSize_medium: {
    fontSize: 16,
  },
  textSize_large: {
    fontSize: 18,
  },
});