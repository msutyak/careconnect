import React, { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '@/features/auth/auth-store';
import { LoadingScreen } from '@/components/ui';

export default function Index() {
  const { session, profile, isInitialized } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) return;

    if (!session) {
      router.replace('/(auth)/welcome');
      return;
    }

    if (!profile || !profile.onboarding_completed) {
      if (profile?.role === 'caregiver') {
        router.replace('/(auth)/onboarding/caregiver-step1');
      } else {
        router.replace('/(auth)/onboarding/recipient-step1');
      }
      return;
    }

    if (profile.role === 'caregiver') {
      router.replace('/(caregiver)/dashboard');
    } else {
      router.replace('/(recipient)/home');
    }
  }, [isInitialized, session, profile]);

  return <LoadingScreen />;
}
