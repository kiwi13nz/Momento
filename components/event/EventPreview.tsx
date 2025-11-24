import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView } from 'react-native';
import { Users, Camera } from 'lucide-react-native';
import { colors, spacing, typography, borderRadius, shadows } from '@/lib/design-tokens';
import type { Event, Photo } from '@/types';

interface EventPreviewProps {
  event: Event;
  playerCount: number;
  photoCount: number;
  recentPhotos: Photo[];
}

export function EventPreview({ event, playerCount, photoCount, recentPhotos }: EventPreviewProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{event.title}</Text>
      {event.description && (
        <Text style={styles.description}>{event.description}</Text>
      )}

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Users size={20} color={colors.primary} />
          <Text style={styles.statText}>{playerCount} players</Text>
        </View>
        <View style={styles.stat}>
          <Camera size={20} color={colors.primary} />
          <Text style={styles.statText}>{photoCount} photos</Text>
        </View>
      </View>

      {recentPhotos.length > 0 && (
        <View style={styles.photosSection}>
          <Text style={styles.photosLabel}>Recent photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
            {recentPhotos.slice(0, 5).map((photo) => (
              <Image
                key={photo.id}
                source={{ uri: photo.photo_url }}
                style={styles.photoThumb}
              />
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.l,
    padding: spacing.l,
    ...shadows.large,
  },
  title: {
    ...typography.title,
    color: colors.text,
    marginBottom: spacing.s,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.m,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.l,
    marginBottom: spacing.l,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  statText: {
    ...typography.bodyBold,
    color: colors.text,
  },
  photosSection: {
    gap: spacing.m,
  },
  photosLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  photoScroll: {
    marginHorizontal: -spacing.l,
    paddingHorizontal: spacing.l,
  },
  photoThumb: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.m,
    marginRight: spacing.s,
    backgroundColor: colors.surfaceLight,
  },
});