// services/api.ts
// All Supabase API calls - single source of truth for data operations

import { supabase } from '@/lib/supabase';
import type { Event, Player, Task, Submission, Photo, Reactions, PlayerScore } from '@/types';

// ADD THIS EXPORT
export { supabase };

// ============================================
// LEADERBOARD CACHE FOR OPTIMIZATION
// ============================================
const leaderboardCache = new Map<string, { data: PlayerScore[]; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

// ============================================
// EVENT SERVICE
// ============================================

export const EventService = {
  async getById(eventId: string) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error) throw error;
    return data as Event;
  },

  async getByCode(code: string) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (error) throw error;
    return data as Event;
  },

  async create(title: string, description: string, code: string, ownerId: string) {
    const { data, error } = await supabase
      .from('events')
      .insert({
        code: code.toUpperCase(),
        title,
        description,
        owner_id: ownerId,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Event;
  },

  async checkCodeExists(code: string): Promise<boolean> {
    const { data } = await supabase
      .from('events')
      .select('code')
      .eq('code', code.toUpperCase())
      .maybeSingle();

    return !!data;
  },

  /**
   * Close event (prevent new uploads, prepare for winner announcement)
   */
  async closeEvent(eventId: string): Promise<void> {
    const { error } = await supabase
      .from('events')
      .update({ closed_at: new Date().toISOString() })
      .eq('id', eventId);

    if (error) throw error;
    console.log('✅ Event closed:', eventId);
  },

  /**
   * Check if event is closed
   */
  async isClosed(eventId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('events')
      .select('closed_at')
      .eq('id', eventId)
      .single();

    if (error) throw error;
    return data.closed_at !== null;
  },
};

// ============================================
// TASK SERVICE
// ============================================

export const TaskService = {
  async getByEventId(eventId: string) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('event_id', eventId)
      .order('order_number');

    if (error) throw error;
    return (data || []) as Task[];
  },

  async createBulk(eventId: string, descriptions: string[]) {
    const tasks = descriptions.map((description, index) => ({
      event_id: eventId,
      description,
      order_number: index,
    }));

    const { error } = await supabase.from('tasks').insert(tasks);
    if (error) throw error;
  },
};

// ============================================
// PLAYER SERVICE
// ============================================

export const PlayerService = {
  async getByEventId(eventId: string) {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('event_id', eventId);

    if (error) throw error;
    return (data || []) as Player[];
  },

  async checkNameExists(eventId: string, name: string): Promise<boolean> {
    const { data } = await supabase
      .from('players')
      .select('name')
      .eq('event_id', eventId)
      .ilike('name', name);

    return (data?.length || 0) > 0;
  },

  async join(eventId: string, name: string) {
    // This method is now deprecated - use SessionService.createSession instead
    // Kept for backward compatibility
    const { data, error } = await supabase
      .from('players')
      .insert({
        event_id: eventId,
        name,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Player;
  },

  /**
   * Create player with auth user link (for invisible auth)
   */
  async createWithAuth(eventId: string, name: string, authUserId: string) {
    const { data, error } = await supabase
      .from('players')
      .insert({
        event_id: eventId,
        name,
        auth_user_id: authUserId,
      })
      .select()
      .single();

    if (error) throw error;
    console.log('✅ Player created with auth:', data);
    return data as Player;
  },

  async getById(playerId: string) {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single();

    if (error) throw error;
    return data as Player;
  },
};

// ============================================
// PHOTO SERVICE
// ============================================

export const PhotoService = {
  async getByEventId(eventId: string): Promise<Photo[]> {
    // Get all tasks for this event
    const tasks = await TaskService.getByEventId(eventId);
    const taskIds = tasks.map((t) => t.id);

    if (taskIds.length === 0) return [];

    // Get all submissions for these tasks
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('*')
      .in('task_id', taskIds)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!submissions) return [];

    // Enrich with player and task data
    const photos = await Promise.all(
      submissions.map(async (submission) => {
        const player = await PlayerService.getById(submission.player_id);
        const task = tasks.find((t) => t.id === submission.task_id);

        // Get aggregated reactions from photo_reactions table
        const reactions = await this.getReactionCounts(submission.id);

        return {
          id: submission.id,
          photo_url: submission.photo_url,
          created_at: submission.created_at,
          reactions,
          player: {
            id: player.id,
            name: player.name,
          },
          task: {
            id: task?.id || '',
            description: task?.description || '',
          },
        } as Photo;
      })
    );

    return photos;
  },

  async getByEventIdPaginated(
    eventId: string,
    page: number = 0,
    limit: number = 20
  ): Promise<Photo[]> {
    // Get all tasks for this event
    const tasks = await TaskService.getByEventId(eventId);
    const taskIds = tasks.map((t) => t.id);

    if (taskIds.length === 0) return [];

    // Get paginated submissions for these tasks
    const offset = page * limit;
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('*')
      .in('task_id', taskIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1); // Supabase uses inclusive range

    if (error) throw error;
    if (!submissions) return [];

    // Enrich with player and task data
    const photos = await Promise.all(
      submissions.map(async (submission) => {
        const player = await PlayerService.getById(submission.player_id);
        const task = tasks.find((t) => t.id === submission.task_id);

        // Get aggregated reactions from photo_reactions table
        const reactions = await this.getReactionCounts(submission.id);

        return {
          id: submission.id,
          photo_url: submission.photo_url,
          created_at: submission.created_at,
          reactions,
          player: {
            id: player.id,
            name: player.name,
          },
          task: {
            id: task?.id || '',
            description: task?.description || '',
          },
        } as Photo;
      })
    );

    return photos;
  },

  /**
   * Get aggregated reaction counts for a photo from photo_reactions table
   */
  async getReactionCounts(submissionId: string): Promise<Reactions> {
    const { data, error } = await supabase
      .from('photo_reactions')
      .select('reaction_type')
      .eq('submission_id', submissionId);

    if (error) {
      console.error('Failed to get reaction counts:', error);
      return {};
    }

    if (!data || data.length === 0) return {};

    // Aggregate counts
    const counts: Reactions = {};
    data.forEach((row) => {
      const type = row.reaction_type as 'heart' | 'fire' | 'hundred';
      counts[type] = (counts[type] || 0) + 1;
    });

    return counts;
  },

  async checkDuplicateSubmission(playerId: string, taskId: string): Promise<boolean> {
    const { data } = await supabase
      .from('submissions')
      .select('id')
      .eq('player_id', playerId)
      .eq('task_id', taskId)
      .maybeSingle();

    return !!data;
  },

  async deleteSubmission(playerId: string, taskId: string): Promise<void> {
    const { error } = await supabase
      .from('submissions')
      .delete()
      .eq('player_id', playerId)
      .eq('task_id', taskId);

    if (error) throw error;
  },

  async upload(taskId: string, playerId: string, photoUrl: string) {
    const { data, error } = await supabase
      .from('submissions')
      .insert({
        task_id: taskId,
        player_id: playerId,
        photo_url: photoUrl,
        reactions: {}, // Legacy field, kept for backward compatibility
      })
      .select()
      .single();

    if (error) throw error;
    return data as Submission;
  },

  /**
   * Toggle reaction (add if not exists, remove if exists)
   * Returns updated reaction counts and whether the reaction was added
   */
  async toggleReaction(
    submissionId: string,
    reactionType: 'heart' | 'fire' | 'hundred'
  ): Promise<{ reactions: Reactions; wasAdded: boolean }> {
    // Check if user already reacted (for determining wasAdded state)
    const { data: existing } = await supabase
      .from('photo_reactions')
      .select('id')
      .eq('submission_id', submissionId)
      .eq('reaction_type', reactionType)
      .maybeSingle();

    const wasAdded = !existing;

    // Call RPC to toggle
    const { data, error } = await supabase.rpc('toggle_reaction', {
      p_submission_id: submissionId,
      p_reaction_type: reactionType,
    });

    if (error) {
      console.error('Failed to toggle reaction:', error);
      throw error;
    }

    return {
      reactions: (data || {}) as Reactions,
      wasAdded
    };
  },

  /**
   * Check if current user has reacted to a photo
   */
  async hasUserReacted(
    submissionId: string,
    reactionType: 'heart' | 'fire' | 'hundred'
  ): Promise<boolean> {
    const { data } = await supabase
      .from('photo_reactions')
      .select('id')
      .eq('submission_id', submissionId)
      .eq('reaction_type', reactionType)
      .maybeSingle();

    return !!data;
  },

  /**
   * Get all reactions by current user (for loading initial state)
   */
  async getUserReactions(submissionIds: string[]): Promise<Map<string, Set<string>>> {
    if (submissionIds.length === 0) return new Map();

    const { data, error } = await supabase
      .from('photo_reactions')
      .select('submission_id, reaction_type')
      .in('submission_id', submissionIds);

    if (error) {
      console.error('Failed to get user reactions:', error);
      return new Map();
    }

    // Build map: submissionId -> Set of reaction types
    const reactionsMap = new Map<string, Set<string>>();

    data?.forEach((row) => {
      if (!reactionsMap.has(row.submission_id)) {
        reactionsMap.set(row.submission_id, new Set());
      }
      reactionsMap.get(row.submission_id)!.add(row.reaction_type);
    });

    return reactionsMap;
  },

  async getPlayerSubmissions(playerId: string, taskIds: string[]) {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('player_id', playerId)
      .in('task_id', taskIds);

    if (error) throw error;
    return (data || []) as Submission[];
  },
};

// ============================================
// LEADERBOARD SERVICE
// ============================================

export const LeaderboardService = {
  /**
   * Get leaderboard scores with caching for optimization
   */
  async getScores(eventId: string, forceRefresh = false): Promise<PlayerScore[]> {
    // Check cache first
    const cached = leaderboardCache.get(eventId);
    const now = Date.now();

    if (!forceRefresh && cached && (now - cached.timestamp) < CACHE_TTL) {
      console.log('📊 Using cached leaderboard');
      return cached.data;
    }

    // Fetch fresh data
    console.log('📊 Fetching fresh leaderboard data');
    const scores = await this._fetchScores(eventId);

    // Update cache
    leaderboardCache.set(eventId, { data: scores, timestamp: now });

    return scores;
  },

  /**
   * Clear cache for an event (call after event closes)
   */
  clearCache(eventId: string) {
    leaderboardCache.delete(eventId);
    console.log('🗑️ Leaderboard cache cleared for event:', eventId);
  },

  /**
   * Internal method to fetch scores from database
   */
  async _fetchScores(eventId: string): Promise<PlayerScore[]> {
    const players = await PlayerService.getByEventId(eventId);
    const tasks = await TaskService.getByEventId(eventId);
    const taskIds = tasks.map((t) => t.id);

    if (taskIds.length === 0) {
      return players.map((player) => ({
        player_id: player.id,
        player_name: player.name,
        reaction_count: 0,
        photo_count: 0,
        rank: 0,
      }));
    }

    const scores = await Promise.all(
      players.map(async (player) => {
        // Get player's submissions
        const { data: submissions } = await supabase
          .from('submissions')
          .select('id')
          .eq('player_id', player.id)
          .in('task_id', taskIds);

        if (!submissions || submissions.length === 0) {
          return {
            player_id: player.id,
            player_name: player.name,
            reaction_count: 0,
            photo_count: 0,
            rank: 0,
          };
        }

        const submissionIds = submissions.map((s) => s.id);

        // Get total reactions from photo_reactions table
        const { count: reactionCount } = await supabase
          .from('photo_reactions')
          .select('*', { count: 'exact', head: true })
          .in('submission_id', submissionIds);

        return {
          player_id: player.id,
          player_name: player.name,
          reaction_count: reactionCount || 0,
          photo_count: submissions.length,
          rank: 0, // Will be calculated after sorting
        };
      })
    );

    // Sort by reactions first, then by photo count
    const sorted = scores.sort((a, b) => {
      if (b.reaction_count !== a.reaction_count) {
        return b.reaction_count - a.reaction_count;
      }
      return b.photo_count - a.photo_count;
    });

    // Assign ranks
    return sorted.map((score, index) => ({
      ...score,
      rank: index + 1,
    }));
  },
};

// ============================================
// STORAGE SERVICE
// ============================================

export const StorageService = {
  async uploadPhoto(eventId: string, playerId: string, uri: string): Promise<string> {
    const response = await fetch(uri);
    const blob = await response.blob();

    const fileExt = uri.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `${eventId}/${playerId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('submissions')
      .upload(filePath, blob, {
        contentType: `image/${fileExt}`,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('submissions')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  },
};