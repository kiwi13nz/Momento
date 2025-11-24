import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const OWNER_EVENTS_KEY = '@owner_events';

export type OwnerEvent = {
  eventId: string;
  eventCode: string;
  ownerId: string;
  title: string;
  createdAt: string;
};

export async function saveOwnerEvent(event: OwnerEvent) {
  try {
    const existing = await getOwnerEvents();
    const updated = [...existing.filter((e) => e.eventId !== event.eventId), event];
    await AsyncStorage.setItem(OWNER_EVENTS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save owner event:', error);
  }
}

export async function getOwnerEvents(): Promise<OwnerEvent[]> {
  try {
    const data = await AsyncStorage.getItem(OWNER_EVENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get owner events:', error);
    return [];
  }
}

export const StorageService = {
  async uploadPhoto(uri: string, eventId: string): Promise<string> {
    try {
      // Use fetch to get the file as a blob (works on both web and native)
      const response = await fetch(uri);
      const blob = await response.blob();

      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${eventId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('submissions')
        .upload(fileName, blob, {
          contentType: `image/${fileExt}`,
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('submissions')
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  },
};