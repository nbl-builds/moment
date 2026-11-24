import { Redirect, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { isGuestMode } from '@/features/auth/guest-mode';
import { api } from '@/lib/api';

// Entry route: signed out -> onboarding (or Home if they chose to browse as a guest); signed in but sign up unfinished ->
// "Finish signing up"; otherwise Home. The splash covers the short check.
export default function Index() {
  const [target, setTarget] = useState<Href | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let next: Href = '/onboarding';
      try {
        if (await api.auth.getSession()) next = (await api.auth.needsSignUp()) ? '/finish-sign-up' : '/home';
        // "Skip for now" earlier: back to Home as a guest.
        else if (await isGuestMode()) next = '/home';
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
