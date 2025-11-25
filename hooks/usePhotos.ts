// hooks/usePhotos.ts
import { useState, useEffect, useCallback } from 'react';
import { PhotoService, supabase } from '@/services/api';
import { RateLimiter } from '@/services/rate-limiter';
import type { Photo, Reactions } from '@/types';

// Rate limiter: 30 reactions per minute
const reactionLimiter = RateLimiter.create('reaction', 30, 60000);

export function usePhotos(eventId: string) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [userReactions, setUserReactions] = useState<Map<string, Set<string>>>(new Map());

  // Load photos
  const loadPhotos = useCallback(async () => {
    try {
      setLoading(true);
      const data = await PhotoService.getByEventId(eventId);
      setPhotos(data);

      // Load user's reactions for all photos
      const submissionIds = data.map((p) => p.id);
      const reactions = await PhotoService.getUserReactions(submissionIds);
      setUserReactions(reactions);
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  // Subscribe to real-time updates (optimized)
  useEffect(() => {
    loadPhotos();

    // Single subscription per event for photo_reactions table
    const channel = supabase
      .channel(`event-reactions:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'photo_reactions',
        },
        async (payload) => {
          console.log('Real-time reaction update:', payload);

          // Update specific photo's reactions
          if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
            const submissionId = (payload.new || payload.old as any).submission_id;

            // Fetch updated counts for this photo
            const reactions = await PhotoService.getReactionCounts(submissionId);

            setPhotos((prev) =>
              prev.map((photo) =>
                photo.id === submissionId
                  ? { ...photo, reactions }
                  : photo
              )
            );

            // Update userReactions if current user made the change
            if (payload.eventType === 'INSERT') {
              const { submission_id, reaction_type } = payload.new;
              setUserReactions((prev) => {
                const newMap = new Map(prev);
                if (!newMap.has(submission_id)) {
                  newMap.set(submission_id, new Set());
                }
                newMap.get(submission_id)!.add(reaction_type);
                return newMap;
              });
            } else if (payload.eventType === 'DELETE') {
              const { submission_id, reaction_type } = payload.old;
              setUserReactions((prev) => {
                const newMap = new Map(prev);
                if (newMap.has(submission_id)) {
                  newMap.get(submission_id)!.delete(reaction_type);
                }
                return newMap;
              });
            }
          }
        }
      )
      .subscribe();

    // Subscribe to new submissions
    const submissionsChannel = supabase
      .channel(`event-submissions:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'submissions',
        },
        () => {
          console.log('New submission detected, refreshing...');
          loadPhotos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(submissionsChannel);
    };
  }, [eventId, loadPhotos]);

  // Toggle reaction (add or remove)
  const toggleReaction = async (
    photoId: string,
    reactionType: 'heart' | 'fire' | 'hundred'
  ): Promise<boolean> => {
    // Check rate limit
    if (!reactionLimiter.tryAcquire()) {
      console.log('⏱️ Rate limit hit for reactions');
      return false;
    }

    try {
      // Optimistic update
      const wasActive = userReactions.get(photoId)?.has(reactionType) || false;

      setPhotos((prev) =>
        prev.map((photo) => {
          if (photo.id !== photoId) return photo;

          const newReactions = { ...photo.reactions };
          const currentCount = newReactions[reactionType] || 0;

          if (wasActive) {
            // Removing reaction
            newReactions[reactionType] = Math.max(0, currentCount - 1);
          } else {
            // Adding reaction
            newReactions[reactionType] = currentCount + 1;
          }

          return { ...photo, reactions: newReactions };
        })
      );

      // Update userReactions optimistically
      setUserReactions((prev) => {
        const newMap = new Map(prev);
        if (!newMap.has(photoId)) {
          newMap.set(photoId, new Set());
        }
        const photoReactions = newMap.get(photoId)!;

        if (wasActive) {
          photoReactions.delete(reactionType);
        } else {
          photoReactions.add(reactionType);
        }

        return newMap;
      });

      // Call API
      const { reactions: serverReactions, wasAdded } = await PhotoService.toggleReaction(
        photoId,
        reactionType
      );

      // Update with server truth
      setPhotos((prev) =>
        prev.map((photo) =>
          photo.id === photoId ? { ...photo, reactions: serverReactions } : photo
        )
      );

      return wasAdded;
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
      // Revert optimistic update on error
      loadPhotos();
      return false;
    }
  };

  // Check if user has reacted
  const hasUserReacted = (photoId: string, reactionType: 'heart' | 'fire' | 'hundred'): boolean => {
    return userReactions.get(photoId)?.has(reactionType) || false;
  };

  return {
    photos,
    loading,
    refreshPhotos: loadPhotos,
    toggleReaction,
    hasUserReacted,
  };
}