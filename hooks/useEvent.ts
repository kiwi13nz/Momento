import { useState, useEffect } from 'react';
import { EventService, TaskService } from '@/services/api';
import type { Event, Task } from '@/types';

export function useEvent(eventId: string) {
  const [event, setEvent] = useState<Event | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadEvent = async () => {
      try {
        setLoading(true);
        const eventData = await EventService.getById(eventId);
        const tasksData = await TaskService.getByEventId(eventId);
        setEvent(eventData);
        setTasks(tasksData);
      } catch (err) {
        console.error('Failed to load event:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      loadEvent();
    }
  }, [eventId]);

  return { event, tasks, loading, error };
}