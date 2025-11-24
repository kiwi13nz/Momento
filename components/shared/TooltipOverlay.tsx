import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';
import { colors, spacing, typography, borderRadius, shadows } from '@/lib/design-tokens';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOOLTIPS_KEY = '@seen_tooltips_v2'; // Changed key to reset for all users

export type TooltipStep = 
  | 'tap_photo' 
  | 'react_to_photo' 
  | 'upload_photo'
  | 'share_code';

type TooltipData = {
  title: string;
  message: string;
  emoji: string;
  position: 'top' | 'center' | 'bottom';
};

const tooltips: Record<TooltipStep, TooltipData> = {
  tap_photo: {
    title: 'Tap any photo',
    message: 'View full-screen with Stories-style viewer',
    emoji: '👆',
    position: 'center',
  },
  react_to_photo: {
    title: 'React to photos',
    message: 'Double-tap or use buttons. Most reactions wins!',
    emoji: '❤️',
    position: 'bottom',
  },
  upload_photo: {
    title: 'Your turn!',
    message: 'Upload your own photo to compete',
    emoji: '📸',
    position: 'bottom',
  },
  share_code: {
    title: 'Share your code',
    message: 'Invite friends to start playing',
    emoji: '🎉',
    position: 'top',
  },
};

interface TooltipOverlayProps {
  step: TooltipStep;
  visible: boolean;
  onDismiss: () => void;
}

export function TooltipOverlay({ step, visible, onDismiss }: TooltipOverlayProps) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
      ]).start();

      // Pulse animation for attention
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [visible]);

  const handleDismiss = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Mark as seen for this specific player/event combo
    try {
      const seen = await getSeenTooltips();
      if (!seen.includes(step)) {
        seen.push(step);
        await AsyncStorage.setItem(TOOLTIPS_KEY, JSON.stringify(seen));
        console.log('✅ Tooltip marked as seen:', step);
      }
    } catch (error) {
      console.error('Failed to save tooltip state:', error);
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 0.9,
        useNativeDriver: true,
      }),
    ]).start(onDismiss);
  };

  if (!visible) return null;

  const tooltip = tooltips[step];

  return (
    <Modal visible={visible} transparent animationType="none">
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleDismiss}
      >
        <Animated.View
          style={[
            styles.tooltipContainer,
            styles[`position_${tooltip.position}`],
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <LinearGradient
              colors={['rgba(255, 107, 53, 0.15)', 'rgba(247, 37, 133, 0.15)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.tooltip}
            >
              {/* Glassmorphism effect */}
              <View style={styles.glassOverlay} />
              
              {/* Content */}
              <View style={styles.tooltipContent}>
                <View style={styles.emojiContainer}>
                  <Text style={styles.emoji}>{tooltip.emoji}</Text>
                  <View style={styles.sparkleIcon}>
                    <Sparkles size={16} color={colors.warning} fill={colors.warning} />
                  </View>
                </View>
                
                <Text style={styles.tooltipTitle}>{tooltip.title}</Text>
                <Text style={styles.tooltipMessage}>{tooltip.message}</Text>
                
                <TouchableOpacity onPress={handleDismiss} style={styles.gotItButton}>
                  <LinearGradient
                    colors={[colors.gradientStart, colors.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gotItGradient}
                  >
                    <Text style={styles.gotItText}>Got it! ✨</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Arrow indicator */}
              <View style={[styles.arrow, styles[`arrow_${tooltip.position}`]]} />
            </LinearGradient>
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

// Helper functions
export async function shouldShowTooltip(step: TooltipStep): Promise<boolean> {
  try {
    const seen = await getSeenTooltips();
    const shouldShow = !seen.includes(step);
    console.log(`📊 Should show tooltip "${step}":`, shouldShow);
    return shouldShow;
  } catch (error) {
    console.error('Failed to check tooltip:', error);
    return true;
  }
}

async function getSeenTooltips(): Promise<TooltipStep[]> {
  try {
    const data = await AsyncStorage.getItem(TOOLTIPS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function resetTooltips() {
  try {
    await AsyncStorage.removeItem(TOOLTIPS_KEY);
    console.log('🗑️ Tooltips reset');
  } catch (error) {
    console.error('Failed to reset tooltips:', error);
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltipContainer: {
    paddingHorizontal: spacing.l,
    width: '100%',
    alignItems: 'center',
  },
  position_top: {
    position: 'absolute',
    top: 140,
  },
  position_center: {
    position: 'absolute',
    top: '40%',
  },
  position_bottom: {
    position: 'absolute',
    bottom: 200,
  },
  tooltip: {
    borderRadius: borderRadius.xl,
    maxWidth: 340,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primary,
    ...shadows.glow,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(45, 51, 59, 0.95)',
    backdropFilter: 'blur(20px)',
  },
  tooltipContent: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.m,
  },
  emojiContainer: {
    position: 'relative',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.s,
    ...shadows.medium,
  },
  emoji: {
    fontSize: 40,
  },
  sparkleIcon: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
  },
  tooltipTitle: {
    ...typography.headline,
    color: colors.text,
    fontWeight: '700',
  },
  tooltipMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  gotItButton: {
    marginTop: spacing.s,
    borderRadius: borderRadius.m,
    overflow: 'hidden',
    ...shadows.primaryGlow,
  },
  gotItGradient: {
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.xl,
  },
  gotItText: {
    ...typography.bodyBold,
    color: '#fff',
    fontSize: 16,
  },
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  arrow_top: {
    bottom: -10,
    borderBottomWidth: 12,
    borderBottomColor: colors.primary,
  },
  arrow_center: {
    bottom: -10,
    borderBottomWidth: 12,
    borderBottomColor: colors.primary,
  },
  arrow_bottom: {
    top: -10,
    borderTopWidth: 12,
    borderTopColor: colors.primary,
  },
});