import React, { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/features/auth/auth-store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setSession, setInitialized, refreshProfile } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        refreshProfile();
      }
      setInitialized(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        refreshProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return <>{children}</>;
}
