import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthService } from './auth';
import { PlayerService } from './api';

const SESSION_KEY = '@player_sessions';
const SESSION_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

export type PlayerSession = {
  eventId: string;
  playerId: string;
  playerName: string;
  authUserId: string; // NEW: Link to auth user
  joinedAt: string;
  expiresAt: string;
};

export const SessionService = {
  /**
   * Create new session with invisible auth
   * This is called when a user joins an event
   */
  async createSession(eventId: string, playerName: string): Promise<PlayerSession> {
    try {
      console.log('🔐 Creating session with invisible auth...');
      
      // 1. Create anonymous Supabase auth user (invisible to user)
      const authUser = await AuthService.signInAnonymously();
      
      // 2. Create player record linked to auth user
      const player = await PlayerService.createWithAuth(eventId, playerName, authUser.id);
      
      // 3. Save session locally
      const now = new Date();
      const expiresAt = new Date(now.getTime() + SESSION_EXPIRY);
      
      const session: PlayerSession = {
        eventId,
        playerId: player.id,
        playerName,
        authUserId: authUser.id,
        joinedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };
      
      await this.saveSessionToStorage(session);
      
      console.log('✅ Session created successfully:', {
        playerId: player.id,
        authUserId: authUser.id,
        expiresAt: expiresAt.toISOString(),
      });
      
      return session;
    } catch (error) {
      console.error('❌ Failed to create session:', error);
      throw error;
    }
  },

  /**
   * Save session to AsyncStorage
   */
  async saveSessionToStorage(session: PlayerSession): Promise<void> {
    try {
      const sessions = await this.getAllSessions();
      
      // Remove old session for this event if exists
      const filteredSessions = sessions.filter((s) => s.eventId !== session.eventId);
      filteredSessions.push(session);
      
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(filteredSessions));
    } catch (error) {
      console.error('Failed to save session to storage:', error);
    }
  },

  /**
   * Legacy method for backward compatibility
   * Use createSession instead for new code
   */
  async saveSession(eventId: string, playerId: string, playerName: string): Promise<void> {
    try {
      // Check if user is already authenticated
      const isAuth = await AuthService.isAuthenticated();
      
      if (!isAuth) {
        // Create new auth session
        await this.createSession(eventId, playerName);
      } else {
        // User already has auth session, just save local session
        const authUser = await AuthService.getCurrentUser();
        if (!authUser) throw new Error('No auth user found');
        
        const now = new Date();
        const expiresAt = new Date(now.getTime() + SESSION_EXPIRY);
        
        const session: PlayerSession = {
          eventId,
          playerId,
          playerName,
          authUserId: authUser.id,
          joinedAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
        };
        
        await this.saveSessionToStorage(session);
      }
    } catch (error) {
      console.error('Failed to save legacy session:', error);
    }
  },

  /**
   * Get session for specific event
   */
  async getSession(eventId: string): Promise<PlayerSession | null> {
    try {
      const sessions = await this.getAllSessions();
      const session = sessions.find((s) => s.eventId === eventId);

      if (!session) {
        console.log('ℹ️ No session found for event:', eventId);
        return null;
      }

      // Check if expired
      const now = new Date();
      const expiresAt = new Date(session.expiresAt);

      if (now > expiresAt) {
        console.log('⏰ Session expired for event:', eventId);
        await this.clearSession(eventId);
        return null;
      }

      // Verify auth session is still valid
      const isAuth = await AuthService.isAuthenticated();
      if (!isAuth) {
        console.log('🔓 Auth session expired, clearing local session');
        await this.clearSession(eventId);
        return null;
      }

      console.log('✅ Valid session found:', session);
      return session;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  },

  async getAllSessions(): Promise<PlayerSession[]> {
    try {
      const data = await AsyncStorage.getItem(SESSION_KEY);
      const sessions: PlayerSession[] = data ? JSON.parse(data) : [];
      
      // Filter out expired sessions automatically
      const now = new Date();
      const validSessions = sessions.filter((s) => {
        const expiresAt = new Date(s.expiresAt);
        return now <= expiresAt;
      });

      // Save cleaned sessions back if we removed any
      if (validSessions.length !== sessions.length) {
        console.log(`🧹 Cleaned up ${sessions.length - validSessions.length} expired sessions`);
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(validSessions));
      }

      console.log(`✅ Loaded ${validSessions.length} active sessions`);
      return validSessions;
    } catch (error) {
      console.error('Failed to get all sessions:', error);
      return [];
    }
  },

  async clearSession(eventId: string) {
    try {
      const sessions = await this.getAllSessions();
      const filtered = sessions.filter((s) => s.eventId !== eventId);
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(filtered));
      console.log('🗑️ Cleared session for event:', eventId);
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  },

  async clearAllSessions() {
    try {
      await AsyncStorage.removeItem(SESSION_KEY);
      await AuthService.signOut();
      console.log('🗑️ Cleared all sessions and signed out');
    } catch (error) {
      console.error('Failed to clear all sessions:', error);
    }
  },
};