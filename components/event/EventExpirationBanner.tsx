import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clock } from 'lucide-react-native';
import { colors, spacing, typography, borderRadius } from '@/lib/design-tokens';

interface EventExpirationBannerProps {
    createdAt: string; // ISO date string from event.created_at
}

export function EventExpirationBanner({ createdAt }: EventExpirationBannerProps) {
    const [timeRemaining, setTimeRemaining] = useState('');

    useEffect(() => {
        const updateTimer = () => {
            const created = new Date(createdAt);
            const expiresAt = new Date(created.getTime() + 72 * 60 * 60 * 1000); // 72 hours later
            const now = new Date();
            const diff = expiresAt.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeRemaining('Expired');
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const days = Math.floor(hours / 24);

            // Show hours if less than 48h, otherwise show days
            if (hours < 48) {
                setTimeRemaining(`Event expires in ${hours}h`);
            } else {
                setTimeRemaining(`Event expires in ${days}d`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [createdAt]);

    return (
        <View style={styles.banner}>
            <Clock size={16} color={colors.warning} />
            <Text style={styles.text}>{timeRemaining}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.s,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.s,
        borderRadius: borderRadius.m,
        borderLeftWidth: 3,
        borderLeftColor: colors.warning,
        marginHorizontal: spacing.m,
        marginBottom: spacing.m,
    },
    text: {
        ...typography.caption,
        color: colors.warning,
        fontWeight: '600',
    },
});
