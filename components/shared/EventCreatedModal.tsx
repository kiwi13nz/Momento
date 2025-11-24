import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated, TouchableOpacity, Share } from 'react-native';
import { Sparkles, Copy, Share2, ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { colors, spacing, typography, borderRadius, shadows } from '@/lib/design-tokens';
import { Button } from '@/components/ui/Button';

interface EventCreatedModalProps {
  visible: boolean;
  eventCode: string;
  eventTitle: string;
  onContinue: () => void;
}

export function EventCreatedModal({
  visible,
  eventCode,
  eventTitle,
  onContinue,
}: EventCreatedModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

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
    }
  }, [visible]);

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(eventCode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // You could show a toast here
    console.log('✅ Code copied:', eventCode);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🎉 Join my event "${eventTitle}"!\n\n📱 Code: ${eventCode}\n\nDownload Flick and join now!`,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Success Icon */}
          <View style={styles.iconContainer}>
            <Sparkles size={64} color={colors.primary} fill={colors.primary} />
          </View>

          {/* Title */}
          <Text style={styles.title}>🎉 Event Created!</Text>
          <Text style={styles.subtitle}>Share this code with your friends</Text>

          {/* Event Code */}
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>Event Code</Text>
            <View style={styles.codeBox}>
              <Text style={styles.code}>{eventCode}</Text>
              <TouchableOpacity onPress={handleCopyCode} style={styles.copyButton}>
                <Copy size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Event Name */}
          <View style={styles.eventInfo}>
            <Text style={styles.eventName}>{eventTitle}</Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              onPress={handleShare}
              variant="secondary"
              fullWidth
              icon={<Share2 size={20} color={colors.primary} />}
            >
              Share Code
            </Button>

            <Button
              onPress={onContinue}
              variant="gradient"
              fullWidth
              icon={<ArrowRight size={20} color="#fff" />}
            >
              Go to Event
            </Button>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.l,
  },
  container: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    ...shadows.glow,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.l,
    ...shadows.medium,
  },
  title: {
    ...typography.title,
    color: colors.text,
    marginBottom: spacing.s,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  codeContainer: {
    width: '100%',
    marginBottom: spacing.l,
  },
  codeLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.s,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.l,
    padding: spacing.l,
    borderWidth: 2,
    borderColor: colors.primary,
    gap: spacing.m,
  },
  code: {
    ...typography.display,
    color: colors.primary,
    fontFamily: 'monospace',
    letterSpacing: 8,
  },
  copyButton: {
    padding: spacing.s,
  },
  eventInfo: {
    width: '100%',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.m,
    padding: spacing.m,
    marginBottom: spacing.xl,
  },
  eventName: {
    ...typography.bodyBold,
    color: colors.text,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: spacing.m,
  },
});