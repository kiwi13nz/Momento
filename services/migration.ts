import { supabase } from '@/lib/supabase';
import { AuthService } from './auth';
import { SessionService } from './session';

export const MigrationService = {
  /**
   * Migrate existing player to use auth system
   * Called when an old player tries to use the app
   */
  async migratePlayerToAuth(playerId: string, eventId: string, playerName: string): Promise<void> {
    try {
      console.log('🔄 Migrating player to auth system:', playerId);
      
      // Check if player already has auth
      const { data: player } = await supabase
        .from('players')
        .select('auth_user_id')
        .eq('id', playerId)
        .single();
      
      if (player?.auth_user_id) {
        console.log('✅ Player already migrated');
        return;
      }
      
      // Create anonymous auth user
      const authUser = await AuthService.signInAnonymously();
      
      // Link auth user to existing player record
      const { error } = await supabase
        .from('players')
        .update({ auth_user_id: authUser.id })
        .eq('id', playerId);
      
      if (error) throw error;
      
      // Update local session
      await SessionService.saveSession(eventId, playerId, playerName);
      
      console.log('✅ Player migrated successfully:', playerId);
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  /**
   * Check if a player needs migration
   */
  async needsMigration(playerId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('players')
        .select('auth_user_id')
        .eq('id', playerId)
        .single();
      
      return !data?.auth_user_id;
    } catch (error) {
      console.error('Failed to check migration status:', error);
      return false;
    }
  },
};