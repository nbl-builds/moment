import type { Session } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

/**
 * The current session: `undefined` while loading, `null` for guests.
 * Updates on sign in and sign out.
 */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    api.auth
      .getSession()
      .then((s) => active && setSession(s))
      .catch(() => active && setSession(null));
    const unsubscribe = api.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return session;
}

/** The signed-in user's public profile and private details, or null for guests. */
export function useMyProfile() {
  const session = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['me', userId],
    queryFn: () => api.profile.getMe(),
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
  });
}
