import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated, TouchableOpacity } from 'react-native';
import { AlertTriangle, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography, borderRadius, shadows } from '@/lib/design-tokens';
import { Button } from '@/components/ui/Button';

interface ConfirmEventModalProps {
    visible: boolean;
    validTasksCount: number;
    totalTasksCount: number;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmEventModal({
    visible,
    validTasksCount,
    totalTasksCount,
    onConfirm,
    onCancel,
}: ConfirmEventModalProps) {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            scaleAnim.setValue(0);
            fadeAnim.setValue(0);
        }
    }, [visible]);

    const handleConfirm = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onConfirm();
    };

    const handleCancel = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onCancel();
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
            <View style={styles.overlay}>
                <Animated.View
                    style={[
                        styles.container,
                        {
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    {/* Close button */}
                    <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
                        <X size={24} color={colors.textSecondary} />
                    </TouchableOpacity>

                    {/* Warning Icon */}
                    <View style={styles.iconContainer}>
                        <AlertTriangle size={64} color={colors.warning} />
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>Incomplete Challenges</Text>

                    {/* Message */}
                    <View style={styles.messageContainer}>
                        <Text style={styles.message}>
                            You filled <Text style={styles.highlight}>{validTasksCount}</Text> of{' '}
                            <Text style={styles.highlight}>{totalTasksCount}</Text> challenges.
                        </Text>
                        <Text style={styles.submessage}>
                            Create event with {validTasksCount} challenge{validTasksCount !== 1 ? 's' : ''}?
                        </Text>
                    </View>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <Button
                            onPress={handleConfirm}
                            variant="gradient"
                            fullWidth
                            size="large"
                        >
                            {`Create with ${validTasksCount}`}
                        </Button>

                        <Button
                            onPress={handleCancel}
                            variant="ghost"
                            fullWidth
                        >
                            Go Back
                        </Button>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.l,
    },
    container: {
        backgroundColor: colors.background,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.warning,
        ...shadows.large,
    },
    closeButton: {
        position: 'absolute',
        top: spacing.m,
        right: spacing.m,
        padding: spacing.s,
        zIndex: 1,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.l,
        borderWidth: 3,
        borderColor: colors.warning,
    },
    title: {
        ...typography.title,
        color: colors.text,
        marginBottom: spacing.m,
        textAlign: 'center',
    },
    messageContainer: {
        width: '100%',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.m,
        padding: spacing.l,
        marginBottom: spacing.xl,
        gap: spacing.s,
    },
    message: {
        ...typography.body,
        color: colors.text,
        textAlign: 'center',
        lineHeight: 24,
    },
    highlight: {
        ...typography.bodyBold,
        color: colors.warning,
        fontSize: 18,
    },
    submessage: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: spacing.s,
    },
    actions: {
        width: '100%',
        gap: spacing.m,
    },
});
