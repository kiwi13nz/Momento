import React from 'react';
import { ScrollView, View, Text, StyleSheet, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { colors, spacing, typography } from '@/lib/design-tokens';

export default function PrivacyPolicyScreen() {
    return (
        <>
            <Stack.Screen
                options={{
                    title: 'Privacy Policy',
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
                    <Text style={styles.title}>Privacy Policy for Flick</Text>
                    <Text style={styles.lastUpdated}>Last updated: November 28, 2025</Text>
                </View>

                <Text style={styles.intro}>
                    This Privacy Policy describes how Flick ("we", "us", or "our") collects, uses, and discloses your information when you use our mobile application (the "App").
                </Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>1. Information We Collect</Text>

                    <Text style={styles.subTitle}>1.1 Information You Provide</Text>
                    <View style={styles.bulletPoint}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.body}>
                            <Text style={styles.bold}>Account Information:</Text> When you use the App, we may collect your User ID and authentication details provided through our backend service.
                        </Text>
                    </View>
                    <View style={styles.bulletPoint}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.body}>
                            <Text style={styles.bold}>User Content:</Text> We collect the photos and images you explicitly choose to upload or capture using the App.
                        </Text>
                    </View>

                    <Text style={styles.subTitle}>1.2 Information Automatically Collected</Text>
                    <View style={styles.bulletPoint}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.body}>
                            <Text style={styles.bold}>Device Information:</Text> We may collect information about your mobile device, including device model, operating system version, and unique device identifiers.
                        </Text>
                    </View>
                    <View style={styles.bulletPoint}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.body}>
                            <Text style={styles.bold}>Usage Data:</Text> We collect data about how you interact with the App, such as features used and time spent.
                        </Text>
                    </View>
                    <View style={styles.bulletPoint}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.body}>
                            <Text style={styles.bold}>Crash Data:</Text> We use Sentry to collect error logs and crash reports to improve App stability. This may include stack traces and device state information at the time of a crash.
                        </Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
                    <Text style={styles.body}>We use the information we collect to:</Text>
                    {[
                        'Provide, maintain, and improve the App.',
                        'Enable photo sharing and event participation features.',
                        'Authenticate users and secure your account.',
                        'Send push notifications (if you opt-in) regarding app activity.',
                        'Monitor and analyze trends, usage, and activities in connection with the App.',
                        'Detect, investigate, and prevent fraudulent transactions and other illegal activities.'
                    ].map((item, index) => (
                        <View key={index} style={styles.bulletPoint}>
                            <Text style={styles.bullet}>•</Text>
                            <Text style={styles.body}>{item}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>3. App Permissions</Text>
                    <Text style={styles.body}>The App requires the following permissions to function:</Text>
                    {[
                        { title: 'Camera', desc: 'Used to capture photos directly within the App for events.' },
                        { title: 'Photo Library (Read/Write)', desc: "Used to upload existing photos and save captured/edited photos to your device's gallery." },
                        { title: 'Notifications', desc: 'Used to send you alerts about event updates and app activity.' }
                    ].map((item, index) => (
                        <View key={index} style={styles.bulletPoint}>
                            <Text style={styles.bullet}>•</Text>
                            <Text style={styles.body}>
                                <Text style={styles.bold}>{item.title}:</Text> {item.desc}
                            </Text>
                        </View>
                    ))}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>4. Third-Party Services</Text>
                    <Text style={styles.body}>We use the following third-party services which may collect information used to identify you:</Text>
                    {[
                        { name: 'Supabase', url: 'https://supabase.com/privacy' },
                        { name: 'Sentry', url: 'https://sentry.io/privacy/' },
                        { name: 'Expo', url: 'https://expo.dev/privacy' }
                    ].map((item, index) => (
                        <View key={index} style={styles.bulletPoint}>
                            <Text style={styles.bullet}>•</Text>
                            <Text style={styles.body}>
                                <Text style={styles.bold}>{item.name}:</Text> Privacy policy at {item.url}
                            </Text>
                        </View>
                    ))}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>5. Data Retention</Text>
                    <Text style={styles.body}>
                        We retain your personal information and content for as long as necessary to provide the services you have requested, or for other essential purposes such as complying with our legal obligations, resolving disputes, and enforcing our policies.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>6. Security</Text>
                    <Text style={styles.body}>
                        We take reasonable measures to help protect information about you from loss, theft, misuse, and unauthorized access, disclosure, alteration, and destruction. However, no internet or electronic storage system is 100% secure.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>7. Children's Privacy</Text>
                    <Text style={styles.body}>
                        Our App is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>8. Changes to This Privacy Policy</Text>
                    <Text style={styles.body}>
                        We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
                    </Text>
                </View>

                <View style={[styles.section, styles.lastSection]}>
                    <Text style={styles.sectionTitle}>9. Contact Us</Text>
                    <Text style={styles.body}>If you have any questions about this Privacy Policy, please contact us at:</Text>
                    <View style={styles.bulletPoint}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.body}>
                            <Text style={styles.bold}>Email:</Text> [INSERT YOUR SUPPORT EMAIL HERE]
                        </Text>
                    </View>
                    <View style={styles.bulletPoint}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.body}>
                            <Text style={styles.bold}>Website:</Text> [INSERT YOUR WEBSITE URL HERE]
                        </Text>
                    </View>
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
    },
    title: {
        ...typography.title,
        color: colors.text,
        marginBottom: spacing.s,
    },
    lastUpdated: {
        ...typography.body,
        color: colors.textSecondary,
        fontStyle: 'italic',
    },
    intro: {
        ...typography.body,
        color: colors.text,
        marginBottom: spacing.xl,
    },
    section: {
        marginBottom: spacing.xl,
    },
    lastSection: {
        marginBottom: spacing.xxl,
    },
    sectionTitle: {
        ...typography.headline,
        color: colors.primary,
        marginBottom: spacing.m,
    },
    subTitle: {
        ...typography.bodyBold,
        color: colors.text,
        marginTop: spacing.s,
        marginBottom: spacing.s,
    },
    body: {
        ...typography.body,
        color: colors.textSecondary,
        lineHeight: 24,
    },
    bold: {
        fontWeight: '700',
        color: colors.text,
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
});
