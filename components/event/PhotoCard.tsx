import React, { useRef, useState } from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  TouchableOpacity,
} from 'react-native';
import { X } from 'lucide-react-native';
import { colors, spacing, typography } from '@/lib/design-tokens';
import { ReactionBar } from './ReactionBar';
import type { Photo } from '@/types';

interface PhotoCardProps {
  photo: Photo;
  onClose: () => void;
  onReact?: (photoId: string, reaction: 'heart' | 'fire' | 'hundred') => void;
  canReact?: boolean;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function PhotoCard({ photo, onClose, onReact, canReact = false }: PhotoCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          const newScale = 1 - gestureState.dy / SCREEN_HEIGHT;
          scale.setValue(Math.max(0.7, newScale));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          onClose();
        } else {
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <X size={28} color="#fff" />
      </TouchableOpacity>

      <Animated.View
        style={[styles.imageContainer, { transform: [{ scale }] }]}
        {...panResponder.panHandlers}
      >
        <Image
          source={{ uri: photo.photo_url }}
          style={styles.image}
          resizeMode="contain"
          onLoad={() => setImageLoaded(true)}
        />
      </Animated.View>

      {imageLoaded && (
        <>
          <View style={styles.header}>
            <View style={styles.playerInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {photo.player.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.playerName}>{photo.player.name}</Text>
                <Text style={styles.taskDescription}>{photo.task.description}</Text>
              </View>
            </View>
          </View>

          {canReact && onReact && (
            <View style={styles.footer}>
              <ReactionBar
  photoId={photo.id}
  reactions={photo.reactions}
  onReact={(reaction) => onReact(photo.id, reaction)}
/>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: spacing.m,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: spacing.s,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  header: {
    position: 'absolute',
    top: 60,
    left: spacing.m,
    right: 80,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.headline,
    color: '#fff',
  },
  playerName: {
    ...typography.bodyBold,
    color: colors.text,
  },
  taskDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  footer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});