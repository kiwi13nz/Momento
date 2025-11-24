import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { PhotoService } from '@/services/api';
import { supabase } from '@/lib/supabase';
import type { Photo } from '@/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

const PHOTOS_PER_PAGE = 20;

export function usePhotos(eventId: string) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  // Load photos on mount
  useEffect(() => {
    loadPhotos();
  }, [eventId]);

  // ✅ FIXED: Safe subscription with mounted flag
  useFocusEffect(
    useCallback(() => {
      console.log('📡 Setting up real-time subscription');
      let channel: RealtimeChannel | null = null;
      let mounted = true; // ✅ Track if component is still mounted

      const setupSubscription = async () => {
        if (!mounted) return; // ✅ Don't setup if already unmounted
        channel = await setupRealtimeSubscription();
      };

      setupSubscription();

      return () => {
        mounted = false; // ✅ Mark as unmounted first
        console.log('🔌 Cleaning up real-time subscription');
        if (channel) {
          supabase.removeChannel(channel);
        }
      };
    }, [eventId])
  );

  const loadPhotos = async () => {
    try {
      setLoading(true);
      const data = await PhotoService.getByEventIdPaginated(eventId, 0, PHOTOS_PER_PAGE);
      setPhotos(data);
      setHasMore(data.length === PHOTOS_PER_PAGE);
      setPage(0);
    } catch (err) {
      console.error('Failed to load photos:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = async (): Promise<RealtimeChannel | null> => {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id')
      .eq('event_id', eventId);

    if (!tasks || tasks.length === 0) return null;

    const taskIds = tasks.map((t) => t.id);

    const channel = supabase
      .channel(`photos-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'submissions',
          filter: `task_id=in.(${taskIds.join(',')})`,
        },
        () => {
          console.log('📸 New photo uploaded, refreshing...');
          loadPhotos();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'submissions',
          filter: `task_id=in.(${taskIds.join(',')})`,
        },
        (payload) => {
          console.log('♻️ Photo updated:', payload.new.id);
          setPhotos((prev) =>
            prev.map((photo) =>
              photo.id === payload.new.id
                ? { ...photo, reactions: payload.new.reactions }
                : photo
            )
          );
        }
      )
      .subscribe();

    return channel;
  };

  const loadMore = async () => {
    if (!hasMore || loading) return;

    try {
      setLoading(true);
      const nextPage = page + 1;
      const newPhotos = await PhotoService.getByEventIdPaginated(
        eventId,
        nextPage,
        PHOTOS_PER_PAGE
      );

      if (newPhotos.length > 0) {
        setPhotos((prev) => [...prev, ...newPhotos]);
        setPage(nextPage);
        setHasMore(newPhotos.length === PHOTOS_PER_PAGE);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to load more photos:', err);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    try {
      const data = await PhotoService.getByEventIdPaginated(eventId, 0, PHOTOS_PER_PAGE);
      setPhotos(data);
      setHasMore(data.length === PHOTOS_PER_PAGE);
      setPage(0);
    } catch (err) {
      console.error('Failed to refresh photos:', err);
      setError(err as Error);
    }
  };

  return { photos, loading, error, refresh, loadMore, hasMore };
}