import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clock, Users, Camera, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography } from '@/lib/design-tokens';
import { Card } from '@/components/ui/Card';
import type { OwnerEvent } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

interface OwnerEventCardProps {
    event: OwnerEvent;
    onPress: () => void;
}

interface EventStats {
    playerCount: number;
    photoCount: number;
}

export function OwnerEventCard({ event, onPress }: OwnerEventCardProps) {
    const [timeRemaining, setTimeRemaining] = useState('');
    const [stats, setStats] = useState<EventStats>({ playerCount: 0, photoCount: 0 });

    // Calculate time remaining
    useEffect(() => {
        const updateTimer = () => {
            const created = new Date(event.createdAt);
            const expiresAt = new Date(created.getTime() + 72 * 60 * 60 * 1000);
            const diff = expiresAt.getTime() - Date.now();

            if (diff <= 0) {
                setTimeRemaining('Expired');
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            if (hours < 48) {
                setTimeRemaining(`${hours}h left`);
            } else {
                const days = Math.floor(hours / 24);
                setTimeRemaining(`${days}d left`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [event.createdAt]);

    // Fetch event stats (player count, photo count)
    useEffect(() => {
        async function fetchStats() {
            try {
                // Get player count
                const { count: playerCount, error: playerError } = await supabase
                    .from('players')
                    .select('*', { count: 'exact', head: true })
                    .eq('event_id', event.eventId);

                // Get photo count
                const { count: photoCount, error: photoError } = await supabase
                    .from('submissions')
                    .select('*', { count: 'exact', head: true })
                    .eq('task_id', await getTaskIdsForEvent(event.eventId));

                if (!playerError && !photoError) {
                    setStats({
                        playerCount: playerCount || 0,
                        photoCount: photoCount || 0,
                    });
                }
            } catch (error) {
                console.error('Failed to fetch event stats:', error);
            }
        }

        fetchStats();
    }, [event.eventId]);

    // Helper to get task IDs for the event
    async function getTaskIdsForEvent(eventId: string): Promise<string[]> {
        const { data } = await supabase
            .from('tasks')
            .select('id')
            .eq('event_id', eventId);

        return data ? data.map((t) => t.id) : [];
    }

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
    };

    return (
        <Card style={styles.card} pressable onPress={handlePress}>
            <View style={styles.content}>
                <View style={styles.leftSection}>
                    <View style={styles.info}>
                        <Text style={styles.eventTitle} numberOfLines={1}>
                            {event.title}
                        </Text>
                        {timeRemaining && (
                            <View style={styles.expirationRow}>
                                <Clock size={14} color={colors.warning} />
                                <Text style={styles.expirationText}>{timeRemaining}</Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.rightSection}>
                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <Users size={16} color={colors.textSecondary} />
                            <Text style={styles.statText}>{stats.playerCount}</Text>
                        </View>
                        <View style={styles.stat}>
                            <Camera size={16} color={colors.textSecondary} />
                            <Text style={styles.statText}>{stats.photoCount}</Text>
                        </View>
                    </View>
                    <ChevronRight size={24} color={colors.textSecondary} />
                </View>
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    card: {
        padding: spacing.m,
        backgroundColor: colors.surface,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    leftSection: {
        flex: 1,
    },
    info: {
        flex: 1,
    },
    eventTitle: {
        ...typography.bodyBold,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    expirationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    expirationText: {
        ...typography.small,
        color: colors.warning,
        fontWeight: '600',
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.m,
    },
    statsRow: {
        flexDirection: 'row',
        gap: spacing.m,
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    statText: {
        ...typography.caption,
        color: colors.textSecondary,
        fontWeight: '600',
    },
});
