import AsyncStorage from '@react-native-async-storage/async-storage';

const REACTIONS_KEY = '@user_reactions';

export type UserReactions = {
  [photoId: string]: {
    heart?: boolean;
    fire?: boolean;
    hundred?: boolean;
  };
};

// In-memory cache to prevent race conditions
let reactionCache: UserReactions = {};
let cacheLoaded = false;

export const ReactionsService = {
  async loadCache() {
    if (cacheLoaded) return;
    
    try {
      const data = await AsyncStorage.getItem(REACTIONS_KEY);
      reactionCache = data ? JSON.parse(data) : {};
      cacheLoaded = true;
    } catch (error) {
      console.error('Failed to load reactions cache:', error);
      reactionCache = {};
    }
  },

  async getUserReactions(): Promise<UserReactions> {
    await this.loadCache();
    return { ...reactionCache };
  },

  hasReacted(photoId: string, reaction: 'heart' | 'fire' | 'hundred'): boolean {
    return reactionCache[photoId]?.[reaction] === true;
  },

  async toggleReaction(
    photoId: string,
    reaction: 'heart' | 'fire' | 'hundred'
  ): Promise<boolean> {
    await this.loadCache();

    if (!reactionCache[photoId]) {
      reactionCache[photoId] = {};
    }

    const currentState = reactionCache[photoId][reaction] || false;
    const newState = !currentState;
    
    reactionCache[photoId][reaction] = newState;

    // Save to storage (async, don't wait)
    AsyncStorage.setItem(REACTIONS_KEY, JSON.stringify(reactionCache)).catch(
      console.error
    );

    return newState;
  },

  // Clear reactions for a photo (for testing)
  async clearReactions(photoId: string) {
    await this.loadCache();
    delete reactionCache[photoId];
    await AsyncStorage.setItem(REACTIONS_KEY, JSON.stringify(reactionCache));
  },
};