import AsyncStorage from '@react-native-async-storage/async-storage';

const OWNER_EVENTS_KEY = '@rally_owner_events';

export type OwnerEvent = {
  eventId: string;
  eventCode: string;
  ownerId: string;
  title: string;
  createdAt: string;
};

export const saveOwnerEvent = async (event: OwnerEvent): Promise<void> => {
  try {
    const existing = await getOwnerEvents();
    const updated = [event, ...existing];
    await AsyncStorage.setItem(OWNER_EVENTS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving owner event:', error);
  }
};

export const getOwnerEvents = async (): Promise<OwnerEvent[]> => {
  try {
    const data = await AsyncStorage.getItem(OWNER_EVENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting owner events:', error);
    return [];
  }
};

export const removeOwnerEvent = async (eventId: string): Promise<void> => {
  try {
    const existing = await getOwnerEvents();
    const updated = existing.filter(e => e.eventId !== eventId);
    await AsyncStorage.setItem(OWNER_EVENTS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error removing owner event:', error);
  }
};