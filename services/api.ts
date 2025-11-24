// All Supabase API calls - single source of truth for data operations

import { supabase } from '@/lib/supabase';
import type { Event, Player, Task, Submission, Photo, Reactions, PlayerScore } from '@/types';

// ADD THIS EXPORT
export { supabase };

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

        return {
          id: submission.id,
          photo_url: submission.photo_url,
          created_at: submission.created_at,
          reactions: submission.reactions || {},
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
        reactions: {},
      })
      .select()
      .single();

    if (error) throw error;
    return data as Submission;
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

        return {
          id: submission.id,
          photo_url: submission.photo_url,
          created_at: submission.created_at,
          reactions: submission.reactions || {},
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

  async addReaction(submissionId: string, reactionType: 'heart' | 'fire' | 'hundred') {
    // Get current submission
    const { data: submission } = await supabase
      .from('submissions')
      .select('reactions')
      .eq('id', submissionId)
      .single();

    const currentReactions = (submission?.reactions as Reactions) || {};
    const newCount = (currentReactions[reactionType] || 0) + 1;
    const updatedReactions = {
      ...currentReactions,
      [reactionType]: newCount,
    };

    const { error } = await supabase
      .from('submissions')
      .update({ reactions: updatedReactions })
      .eq('id', submissionId);

    if (error) throw error;
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
  async getScores(eventId: string): Promise<PlayerScore[]> {
    const players = await PlayerService.getByEventId(eventId);
    const tasks = await TaskService.getByEventId(eventId);
    const taskIds = tasks.map((t) => t.id);

    const scores = await Promise.all(
      players.map(async (player) => {
        const { data: submissions } = await supabase
          .from('submissions')
          .select('reactions')
          .eq('player_id', player.id)
          .in('task_id', taskIds);

        const reactionCount = (submissions || []).reduce((total, sub) => {
          const reactions = (sub.reactions as Reactions) || {};
          return total + (reactions.heart || 0) + (reactions.fire || 0) + (reactions.hundred || 0);
        }, 0);

        return {
          player_id: player.id,
          player_name: player.name,
          reaction_count: reactionCount,
          photo_count: submissions?.length || 0,
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