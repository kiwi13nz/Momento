import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Share,
  Platform,
  Linking,
} from 'react-native';
import { X, Instagram, MessageCircle, Share2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography, borderRadius, shadows } from '@/lib/design-tokens';
import { Button } from '@/components/ui/Button';
import ViewShot from 'react-native-view-shot';

interface ShareToStoryModalProps {
  visible: boolean;
  photoUrl: string;
  eventCode: string;
  eventTitle: string;
  onClose: () => void;
}

export function ShareToStoryModal({
  visible,
  photoUrl,
  eventCode,
  eventTitle,
  onClose,
}: ShareToStoryModalProps) {
  const [generatingImage, setGeneratingImage] = useState(false);
  const viewShotRef = React.useRef<ViewShot>(null);

  const handleShareToInstagram = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Note: Instagram Story sharing requires expo-sharing and proper setup
    // For MVP, we'll just open Instagram
    try {
      const url = 'instagram://story-camera';
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL('https://www.instagram.com/');
      }
    } catch (error) {
      console.error('Failed to open Instagram:', error);
    }
  };

  const handleShareCode = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      await Share.share({
        message: `🎉 I just uploaded to "${eventTitle}"!\n\nJoin me with code: ${eventCode}\n\nDownload Flick and let's compete! 🏆`,
      });
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const handleWhatsApp = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const message = encodeURIComponent(
      `🎉 Join my Flick event "${eventTitle}"!\n\nCode: ${eventCode}\n\nDownload Flick and join now!`
    );
    
    try {
      const url = `whatsapp://send?text=${message}`;
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        await handleShareCode();
      }
    } catch (error) {
      await handleShareCode();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>🎉 Photo Uploaded!</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Preview */}
          <View style={styles.preview}>
            <Image source={{ uri: photoUrl }} style={styles.previewImage} />
            <View style={styles.codeOverlay}>
              <Text style={styles.codeLabel}>Join with code:</Text>
              <Text style={styles.code}>{eventCode}</Text>
            </View>
          </View>

          {/* Share Options */}
          <View style={styles.shareOptions}>
            <Text style={styles.shareTitle}>Share with friends</Text>
            
            <TouchableOpacity
              style={styles.shareOption}
              onPress={handleShareToInstagram}
            >
              <Instagram size={24} color="#E4405F" />
              <Text style={styles.shareOptionText}>Instagram Story</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shareOption}
              onPress={handleWhatsApp}
            >
              <MessageCircle size={24} color="#25D366" />
              <Text style={styles.shareOptionText}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shareOption}
              onPress={handleShareCode}
            >
              <Share2 size={24} color={colors.primary} />
              <Text style={styles.shareOptionText}>More Options</Text>
            </TouchableOpacity>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Button onPress={onClose} fullWidth variant="ghost">
              Skip for Now
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.l,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.l,
    marginBottom: spacing.l,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    marginHorizontal: spacing.l,
    marginBottom: spacing.l,
    borderRadius: borderRadius.l,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.large,
  },
  previewImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: colors.surface,
  },
  codeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: spacing.m,
    alignItems: 'center',
  },
  codeLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  code: {
    ...typography.title,
    color: colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 4,
  },
  shareOptions: {
    paddingHorizontal: spacing.l,
    gap: spacing.s,
  },
  shareTitle: {
    ...typography.bodyBold,
    color: colors.text,
    marginBottom: spacing.s,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.m,
    padding: spacing.m,
  },
  shareOptionText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  actions: {
    paddingHorizontal: spacing.l,
    marginTop: spacing.l,
  },
});