import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { hasSeenOnboarding } from './onboarding';
import { initSentry } from '@/services/analytics';
import { supabase } from '@/lib/supabase';
import { SessionService } from '@/services/session';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);

  // Initialize Sentry on mount
  useEffect(() => {
    initSentry();
  }, []);

  useEffect(() => {
    checkOnboarding();
  }, []);

  useEffect(() => {
    console.log('🔐 Setting up auth state listener');
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state changed:', event);
        
        if (event === 'SIGNED_OUT') {
          console.log('🔓 User signed out, clearing sessions');
          try {
            await SessionService.clearAllSessions();
          } catch (error) {
            console.error('Failed to clear sessions:', error);
          }
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 Token refreshed successfully');
        } else if (event === 'SIGNED_IN') {
          console.log('✅ User signed in');
        } else if (event === 'USER_UPDATED') {
          console.log('👤 User profile updated');
        }
      }
    );

    return () => {
      console.log('🔌 Cleaning up auth state listener');
      subscription.unsubscribe();
    };
  }, []);

  const checkOnboarding = async () => {
    const seen = await hasSeenOnboarding();
    
    const currentRoute = segments.join('/');
    if (!seen && !currentRoute.includes('onboarding')) {
      router.replace('/onboarding');
    }
    
    setIsReady(true);
  };

  if (!isReady) return null;

  return (
    <ErrorBoundary>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0A0E27' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="index" />
        <Stack.Screen name="create-event" />
        <Stack.Screen name="join-event" />
        <Stack.Screen name="notifications" />
        <Stack.Screen
          name="(event)/[id]"
          options={{
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="(event)/upload"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
      <StatusBar style="light" />
    </ErrorBoundary>
  );
}