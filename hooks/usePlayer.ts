import { useState, useEffect } from 'react';
import { PhotoService } from '@/services/api';
import type { Submission } from '@/types';

export function usePlayer(playerId: string | null, eventId: string) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [completionRate, setCompletionRate] = useState(0);

  useEffect(() => {
    const loadPlayerData = async () => {
      if (!playerId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Get all tasks for this event
        const { data: tasks } = await (await import('@/lib/supabase')).supabase
          .from('tasks')
          .select('id')
          .eq('event_id', eventId);

        if (!tasks || tasks.length === 0) {
          setLoading(false);
          return;
        }

        const taskIds = tasks.map((t) => t.id);

        // Get player's submissions
        const playerSubmissions = await PhotoService.getPlayerSubmissions(
          playerId,
          taskIds
        );

        setSubmissions(playerSubmissions);
        setCompletionRate(playerSubmissions.length / tasks.length);
      } catch (err) {
        console.error('Failed to load player data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPlayerData();
  }, [playerId, eventId]);

  return { submissions, loading, completionRate };
}