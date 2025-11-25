import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/lib/design-tokens';

interface BadgeProps {
    count: number;
    position?: 'top-right' | 'inline';
}

/**
 * Reusable count badge (used for notifications, reactions, etc.)
 * Displays count with 99+ cap
 */
export function Badge({ count, position = 'top-right' }: BadgeProps) {
    if (count <= 0) return null;

    return (
        <View style={[styles.badge, position === 'top-right' && styles.badgeAbsolute]}>
            <Text style={styles.badgeText}>
                {count > 99 ? '99+' : count}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        backgroundColor: colors.error,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: colors.background,
    },
    badgeAbsolute: {
        position: 'absolute',
        top: -8,
        right: -8,
        zIndex: 1,
    },
    badgeText: {
        ...typography.small,
        color: '#fff',
        fontWeight: '700',
        fontSize: 11,
    },
});
