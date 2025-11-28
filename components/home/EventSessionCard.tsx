import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Clock, Play, Bell } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography, borderRadius } from '@/lib/design-tokens';
import { Card } from '@/components/ui/Card';
import type { PlayerSession } from '@/services/session';
import { supabase } from '@/lib/supabase';

interface EventSessionCardProps {
    session: PlayerSession;
    onPress: () => void;
}

interface EventData {
    title: string;
    created_at: string;
}

// ✅ CORRECT EXPORT - Named export, not default
export function EventSessionCard({ session, onPress }: EventSessionCardProps) {
    const [eventData, setEventData] = useState<EventData | null>(null);
    const [timeRemaining, setTimeRemaining] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch event data
    useEffect(() => {
        async function fetchEvent() {
            try {
                const { data, error } = await supabase
                    .from('events')
                    .select('title, created_at')
                    .eq('id', session.eventId)
                    .single();

                if (!error && data) {
                    setEventData(data);
                }
            } catch (error) {
                console.error('Failed to fetch event data:', error);
            }
        }

        fetchEvent();
    }, [session.eventId]);

    // Calculate time remaining
    useEffect(() => {
        if (!eventData?.created_at) return;

        const updateTimer = () => {
            const created = new Date(eventData.created_at);
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
        const interval = setInterval(updateTimer, 60000);

        return () => clearInterval(interval);
    }, [eventData]);

    // Fetch unread notifications count with real-time updates
    useEffect(() => {
        async function fetchUnreadCount() {
            try {
                const { count, error } = await supabase
                    .from('notifications')
                    .select('*', { count: 'exact', head: true })
                    .eq('player_id', session.playerId)
                    .eq('read', false);

                if (!error && count !== null) {
                    setUnreadCount(count);
                }
            } catch (error) {
                console.error('Failed to fetch notification count:', error);
            }
        }

        fetchUnreadCount();

        // Subscribe to real-time notification changes
        const channel = supabase
            .channel(`event-session-notifs-${session.playerId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `player_id=eq.${session.playerId}`,
                },
                () => {
                    fetchUnreadCount();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session.playerId]);

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
    };

    const handleNotificationPress = (e: any) => {
        e.stopPropagation();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
    };

    return (
        <Card style={styles.card} pressable onPress={handlePress}>
            <View style={styles.content}>
                <View style={styles.leftSection}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {session.playerName.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <View style={styles.info}>
                        <Text style={styles.eventTitle} numberOfLines={1}>
                            {eventData?.title || 'Loading...'}
                        </Text>
                        <Text style={styles.playerName}>{session.playerName}</Text>
                        {timeRemaining && (
                            <View style={styles.expirationRow}>
                                <Clock size={14} color={colors.warning} />
                                <Text style={styles.expirationText}>{timeRemaining}</Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.rightSection}>
                    {unreadCount > 0 && (
                        <TouchableOpacity
                            style={styles.notificationBell}
                            onPress={handleNotificationPress}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Bell size={20} color={colors.primary} fill={colors.primary} />
                            <View style={styles.notificationBadge}>
                                <Text style={styles.notificationBadgeText}>
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}

                    <Play size={24} color={colors.primary} fill={colors.primary} />
                </View>
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    card: {
        padding: spacing.m,
        backgroundColor: colors.surface,
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    leftSection: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.m,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        ...typography.headline,
        color: '#fff',
    },
    info: {
        flex: 1,
    },
    eventTitle: {
        ...typography.bodyBold,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    playerName: {
        ...typography.caption,
        color: colors.textSecondary,
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
    notificationBell: {
        position: 'relative',
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    notificationBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: colors.error,
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: colors.surface,
    },
    notificationBadgeText: {
        ...typography.small,
        color: '#fff',
        fontWeight: '700',
        fontSize: 10,
    },
});