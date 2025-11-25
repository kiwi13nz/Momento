import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@has_seen_onboarding';

export const OnboardingService = {
    async hasSeenOnboarding(): Promise<boolean> {
        try {
            const value = await AsyncStorage.getItem(ONBOARDING_KEY);
            console.log('📖 Checking onboarding status:', value);
            return value === 'true';
        } catch (error) {
            console.error('Failed to check onboarding:', error);
            return false;
        }
    },

    async completeOnboarding(): Promise<void> {
        try {
            await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
            console.log('✅ Onboarding completed and saved');
        } catch (error) {
            console.error('Failed to save onboarding state:', error);
            throw error;
        }
    },

    async resetOnboarding(): Promise<void> {
        try {
            await AsyncStorage.removeItem(ONBOARDING_KEY);
            console.log('🗑️ Onboarding reset');
        } catch (error) {
            console.error('Failed to reset onboarding:', error);
        }
    }
};
