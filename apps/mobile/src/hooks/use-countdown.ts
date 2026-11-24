import { useEffect, useState } from 'react';

/**
 * Seconds left on a resend cooldown. Starts on mount unless `startOnMount` is
 * false; `restart()` starts it again.
 */
export function useCountdown(seconds: number, { startOnMount = true }: { startOnMount?: boolean } = {}) {
  const [endsAt, setEndsAt] = useState(() => (startOnMount ? Date.now() + seconds * 1000 : 0));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return {
    remaining: Math.max(0, Math.ceil((endsAt - now) / 1000)),
    restart: () => {
      const t = Date.now();
      setNow(t);
      setEndsAt(t + seconds * 1000);
    },
  };
}
