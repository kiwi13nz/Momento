import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { OnboardingService } from '@/services/onboarding';
import { initSentry } from '@/services/analytics';
import { supabase } from '@/lib/supabase';
import { SessionService } from '@/services/session';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initSentry();
  }, []);

  useEffect(() => {
    checkOnboarding();
  }, []);

  useEffect(() => {
    console.log('🔐 Setting up auth state listener');

    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state changed:', event);

      if (event === 'SIGNED_OUT') {
        console.log('🔓 User signed out, clearing sessions');
        try {
          await SessionService.clearAllSessions();
        } catch (error) {
          console.error('Failed to clear sessions:', error);
        }
      }
    });

    return () => {
      console.log('🔌 Cleaning up auth state listener');
      data?.subscription?.unsubscribe?.();
    };
  }, []);

  const checkOnboarding = async () => {
    const seen = await OnboardingService.hasSeenOnboarding();

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
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(event)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>

      <StatusBar style="light" />
    </ErrorBoundary>
  );
}
