import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

// Views of experience and business pages, counted for the business's Insights.
// Signed-in viewers are de-duplicated by account on the server; guests by a
// random key made once per install (no personal data).

const KEY = 'moment.installKey';
let cached: string | null = null;

async function installKey(): Promise<string> {
  if (cached) return cached;
  try {
    const stored = await AsyncStorage.getItem(KEY);
    if (stored) return (cached = stored);
  } catch {
    // Storage unavailable: fall back to a key for this launch.
  }
  const key = `i-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  cached = key;
  AsyncStorage.setItem(KEY, key).catch(() => undefined);
  return key;
}

/** Fire and forget: never blocks or fails the screen. */
export function trackView(target: { listingId?: string; businessId?: string }) {
  void installKey()
    .then((sessionKey) => api.catalog.recordView({ ...target, sessionKey }))
    .catch(() => undefined);
}
