import { Redirect, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

// Entry route: signed out -> onboarding; signed in but sign up unfinished ->
// "Finish signing up"; otherwise Home. The splash covers the short check.
export default function Index() {
  const [target, setTarget] = useState<Href | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let next: Href = '/onboarding';
      try {
        if (await api.auth.getSession()) next = (await api.auth.needsSignUp()) ? '/finish-sign-up' : '/home';
      } catch {
        // Offline or the session could not be read: start from onboarding.
      }
      if (!cancelled) setTarget(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return target ? <Redirect href={target} /> : null;
}
