import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

export const AuthService = {
  /**
   * Create anonymous auth user (invisible to user)
   * Returns auth user object
   */
  async signInAnonymously(): Promise<User> {
    try {
      console.log('🔐 Creating anonymous auth session...');
      
      const { data, error } = await supabase.auth.signInAnonymously();
      
      if (error) throw error;
      if (!data.user) throw new Error('No user returned from anonymous sign-in');
      
      console.log('✅ Anonymous auth session created:', data.user.id);
      return data.user;
    } catch (error) {
      console.error('❌ Anonymous sign-in failed:', error);
      throw error;
    }
  },

  /**
   * Get current session
   */
  async getSession(): Promise<Session | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      return session;
    } catch (error) {
      console.error('❌ Failed to get session:', error);
      return null;
    }
  },

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) throw error;
      return user;
    } catch (error) {
      console.error('❌ Failed to get current user:', error);
      return null;
    }
  },

  /**
   * Sign out (clear session)
   */
  async signOut(): Promise<void> {
    try {
      console.log('🔓 Signing out...');
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      console.log('✅ Signed out successfully');
    } catch (error) {
      console.error('❌ Sign out failed:', error);
      throw error;
    }
  },

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession();
    return !!session;
  },

  /**
   * Refresh session (called automatically by Supabase)
   */
  async refreshSession(): Promise<Session | null> {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) throw error;
      return session;
    } catch (error) {
      console.error('❌ Failed to refresh session:', error);
      return null;
    }
  },
};