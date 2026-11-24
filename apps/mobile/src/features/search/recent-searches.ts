import AsyncStorage from '@react-native-async-storage/async-storage';

// Search screen "Recent searches": kept on this device only, newest first.

const KEY = 'moment.recentSearches';
const MAX = 8;
export const RECENT_SEARCHES_QUERY_KEY = ['recent-searches'] as const;

export async function getRecentSearches(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((s): s is string => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

async function save(list: string[]) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Not critical: the list just won't remember this one.
  }
}

export async function addRecentSearch(text: string): Promise<string[]> {
  const term = text.trim();
  const list = await getRecentSearches();
  if (!term) return list;
  const next = [term, ...list.filter((s) => s.toLowerCase() !== term.toLowerCase())].slice(0, MAX);
  await save(next);
  return next;
}

export async function removeRecentSearch(text: string): Promise<string[]> {
  const next = (await getRecentSearches()).filter((s) => s !== text);
  await save(next);
  return next;
}

export async function clearRecentSearches(): Promise<string[]> {
  await save([]);
  return [];
}
