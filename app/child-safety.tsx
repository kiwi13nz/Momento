import React from 'react';
import { ScrollView, View, Text, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { colors, spacing, typography } from '@/lib/design-tokens';
import { Mail, AlertTriangle, Shield } from 'lucide-react-native';

export default function ChildSafetyScreen() {
    const handleEmailPress = () => {
        Linking.openURL('mailto:juansaintromain@gmail.com?subject=Child Safety Concern');
    };

    return (
        <>
            <Stack.Screen
                options={{
                    title: 'Child Safety Standards',
                    headerStyle: { backgroundColor: colors.background },
                    headerTintColor: colors.text,
                }}
            />
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <Shield size={48} color={colors.primary} />
                    </View>
                    <Text style={styles.title}>Flick – Child Safety Standards</Text>
                    <Text style={styles.lastUpdated}>Last updated: November 28, 2025</Text>
                </View>

                <View style={styles.commitmentBox}>
                    <AlertTriangle size={24} color={colors.warning} />
                    <Text style={styles.commitmentText}>
                        At Flick, we are committed to protecting all users and preventing any form of child sexual abuse and exploitation (CSAE). We maintain strict policies, monitoring practices, and reporting procedures to ensure that our platform is safe, compliant, and aligned with international child protection standards.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>1. Zero-Tolerance Policy</Text>
                    <Text style={styles.body}>Flick prohibits:</Text>
                    {[
                        'Child sexual abuse material (CSAM)',
                        'Any sexualized depiction of minors',
                        'Grooming, solicitation, or exploitation',
                        'Sharing personal information of minors',
                        'Any activity that endangers or targets a minor'
                    ].map((item, index) => (
                        <View key={index} style={styles.bulletPoint}>
                            <Text style={styles.bullet}>•</Text>
                            <Text style={styles.body}>{item}</Text>
                        </View>
                    ))}
                    <Text style={[styles.body, styles.emphasisText]}>
                        Violations result in immediate account termination and mandatory reporting to authorities.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>2. User-Generated Content Monitoring</Text>
                    <Text style={styles.body}>All user-generated content must comply with the following:</Text>
                    {[
                        'No explicit, harmful, or exploitative content involving minors',
                        'No uploading, sharing, or distributing illegal material',
                        'No attempts to contact minors in an inappropriate way'
                    ].map((item, index) => (
                        <View key={index} style={styles.bulletPoint}>
                            <Text style={styles.bullet}>•</Text>
                            <Text style={styles.body}>{item}</Text>
                        </View>
                    ))}
                    <Text style={styles.body}>
                        Content may be reviewed automatically and manually to detect violations.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>3. Reporting Harmful Content</Text>
                    <Text style={styles.body}>
                        Users can report any suspicious or harmful behaviour directly within the app.
                    </Text>
                    <Text style={styles.body}>
                        Reports are reviewed promptly, and appropriate actions are taken, which may include:
                    </Text>
                    {[
                        'Removing content',
                        'Blocking accounts',
                        'Escalating to law enforcement'
                    ].map((item, index) => (
                        <View key={index} style={styles.bulletPoint}>
                            <Text style={styles.bullet}>•</Text>
                            <Text style={styles.body}>{item}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>4. Cooperation with Law Enforcement</Text>
                    <Text style={styles.body}>
                        Flick complies with all applicable regional and national laws regarding CSAM.
                    </Text>
                    <Text style={styles.body}>
                        We will report confirmed CSAM incidents to the appropriate authorities, including:
                    </Text>
                    {[
                        'National law enforcement agencies',
                        'Cybertip hotlines where applicable'
                    ].map((item, index) => (
                        <View key={index} style={styles.bulletPoint}>
                            <Text style={styles.bullet}>•</Text>
                            <Text style={styles.body}>{item}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>5. Protection of Minors</Text>
                    <Text style={[styles.body, styles.emphasisText]}>
                        Flick is intended for users aged 18 and older. We do not knowingly permit minors to create accounts or participate in the platform.
                    </Text>
                    <Text style={styles.body}>
                        If a minor is discovered on the platform, the account will be terminated.
                    </Text>
                </View>

                <View style={[styles.section, styles.contactSection]}>
                    <Text style={styles.sectionTitle}>6. Contact for Child Safety Concerns</Text>
                    <Text style={styles.body}>
                        If you need to report a child safety issue or have questions about our policies, contact us:
                    </Text>
                    <TouchableOpacity
                        style={styles.emailButton}
                        onPress={handleEmailPress}
                        activeOpacity={0.7}
                    >
                        <Mail size={20} color={colors.primary} />
                        <Text style={styles.emailText}>juansaintromain@gmail.com</Text>
                    </TouchableOpacity>
                </View>

                <View style={[styles.section, styles.lastSection]}>
                    <Text style={styles.sectionTitle}>7. Updates to These Standards</Text>
                    <Text style={styles.body}>
                        Flick may update these standards as required to comply with evolving safety regulations. We will notify users of significant changes through the app.
                    </Text>
                </View>

                <View style={styles.footer}>
                    <Shield size={32} color={colors.primary} />
                    <Text style={styles.footerText}>
                        Your safety is our priority. Thank you for helping us maintain a safe community.
                    </Text>
                </View>
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: spacing.l,
        paddingBottom: spacing.xxxl,
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%',
    },
    header: {
        marginBottom: spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: colors.surfaceLight,
        paddingBottom: spacing.l,
        alignItems: 'center',
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.m,
    },
    title: {
        ...typography.title,
        color: colors.text,
        marginBottom: spacing.s,
        textAlign: 'center',
    },
    lastUpdated: {
        ...typography.body,
        color: colors.textSecondary,
        fontStyle: 'italic',
    },
    commitmentBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.m,
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: spacing.l,
        marginBottom: spacing.xl,
        borderLeftWidth: 4,
        borderLeftColor: colors.warning,
    },
    commitmentText: {
        ...typography.body,
        color: colors.text,
        flex: 1,
        lineHeight: 24,
    },
    section: {
        marginBottom: spacing.xl,
    },
    lastSection: {
        marginBottom: spacing.xxl,
    },
    contactSection: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: spacing.l,
        borderWidth: 2,
        borderColor: colors.primary,
    },
    sectionTitle: {
        ...typography.headline,
        color: colors.primary,
        marginBottom: spacing.m,
    },
    body: {
        ...typography.body,
        color: colors.textSecondary,
        lineHeight: 24,
        marginBottom: spacing.s,
    },
    emphasisText: {
        fontWeight: '700',
        color: colors.text,
        backgroundColor: colors.surface,
        padding: spacing.m,
        borderRadius: 8,
        marginTop: spacing.s,
    },
    bulletPoint: {
        flexDirection: 'row',
        marginBottom: spacing.s,
        paddingLeft: spacing.s,
    },
    bullet: {
        color: colors.primary,
        marginRight: spacing.s,
        fontSize: 16,
        lineHeight: 24,
    },
    emailButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.m,
        backgroundColor: colors.backgroundLight,
        borderRadius: 12,
        padding: spacing.m,
        marginTop: spacing.m,
        borderWidth: 2,
        borderColor: colors.primary,
    },
    emailText: {
        ...typography.bodyBold,
        color: colors.primary,
        fontSize: 16,
    },
    footer: {
        alignItems: 'center',
        gap: spacing.m,
        paddingTop: spacing.xl,
        borderTopWidth: 1,
        borderTopColor: colors.surfaceLight,
    },
    footerText: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
});