// hooks/useSession.ts
import { useState, useEffect } from 'react';
import { SessionService, type PlayerSession } from '@/services/session';

export function useSession(eventId: string) {
    const [session, setSession] = useState<PlayerSession | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadSession = async () => {
            try {
                setLoading(true);
                const existingSession = await SessionService.getSession(eventId);
                setSession(existingSession);
            } catch (error) {
                console.error('Failed to load session:', error);
            } finally {
                setLoading(false);
            }
        };

        if (eventId) {
            loadSession();
        }
    }, [eventId]);

    return {
        session,
        loading,
    };
}
