import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Modal } from 'react-native';
import { Sparkles, Trophy, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography } from '@/lib/design-tokens';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const FIRST_UPLOAD_KEY = '@has_uploaded_first_photo';

interface ConfettiCelebrationProps {
  visible: boolean;
  onComplete: () => void;
  playerName?: string;
}

interface ConfettiPiece {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  rotate: Animated.Value;
  color: string;
}

export function ConfettiCelebration({ visible, onComplete, playerName }: ConfettiCelebrationProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const confettiPieces = useRef<ConfettiPiece[]>([]);

  useEffect(() => {
    if (visible) {
      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, 200);

      // Generate confetti pieces
      const pieces: ConfettiPiece[] = [];
      const colors = ['#FF6B35', '#F72585', '#06FFA5', '#FFB800', '#6366f1'];
      
      for (let i = 0; i < 50; i++) {
        pieces.push({
          id: i,
          x: new Animated.Value(width / 2),
          y: new Animated.Value(height / 2),
          rotate: new Animated.Value(0),
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
      confettiPieces.current = pieces;

      // Start animations
      startCelebration();
    }
  }, [visible]);

  const startCelebration = () => {
    // Scale in the main content
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate confetti
    confettiPieces.current.forEach((piece, index) => {
      const randomX = Math.random() * width;
      const randomY = height + 100;
      const randomRotation = Math.random() * 720 - 360;

      Animated.parallel([
        Animated.timing(piece.x, {
          toValue: randomX,
          duration: 1500 + Math.random() * 500,
          useNativeDriver: true,
        }),
        Animated.timing(piece.y, {
          toValue: randomY,
          duration: 1500 + Math.random() * 500,
          useNativeDriver: true,
        }),
        Animated.timing(piece.rotate, {
          toValue: randomRotation,
          duration: 1500 + Math.random() * 500,
          useNativeDriver: true,
        }),
      ]).start();
    });

    // Auto-dismiss after animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 0.8,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onComplete();
      });
    }, 2500);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.container}>
        {/* Confetti pieces */}
        {confettiPieces.current.map((piece) => (
          <Animated.View
            key={piece.id}
            style={[
              styles.confetti,
              {
                backgroundColor: piece.color,
                transform: [
                  { translateX: piece.x },
                  { translateY: piece.y },
                  {
                    rotate: piece.rotate.interpolate({
                      inputRange: [0, 360],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}

        {/* Main content */}
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.iconContainer}>
            <Sparkles size={64} color={colors.warning} fill={colors.warning} />
          </View>
          
          <Text style={styles.title}>🎉 First Photo!</Text>
          
          <Text style={styles.message}>
            {playerName ? `Amazing start, ${playerName}!` : 'Amazing start!'}
          </Text>
          
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Trophy size={24} color={colors.primary} />
              <Text style={styles.statText}>Competition ON</Text>
            </View>
            <View style={styles.stat}>
              <Zap size={24} color={colors.warning} />
              <Text style={styles.statText}>Get Reactions</Text>
            </View>
          </View>

          <Text style={styles.subtitle}>
            Now watch the reactions roll in! 🔥
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Helper functions
export async function isFirstUpload(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(FIRST_UPLOAD_KEY);
    return value !== 'true';
  } catch {
    return true;
  }
}

export async function markFirstUploadComplete(): Promise<void> {
  try {
    await AsyncStorage.setItem(FIRST_UPLOAD_KEY, 'true');
  } catch (error) {
    console.error('Failed to mark first upload:', error);
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confetti: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  content: {
    alignItems: 'center',
    gap: spacing.l,
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.m,
  },
  title: {
    ...typography.display,
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    ...typography.headline,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginVertical: spacing.m,
  },
  stat: {
    alignItems: 'center',
    gap: spacing.s,
  },
  statText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.body,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});