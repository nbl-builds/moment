import { useSyncExternalStore } from 'react';
import { EMPTY_FILTERS, type SearchFilterState } from '@/features/search/filters';

// Explore's search text and filters. Search and Filters, opened from Explore
// with `from=explore`, write here and go back instead of opening results.

export type ExploreMode = 'experiences' | 'businesses';

interface ExploreState {
  mode: ExploreMode;
  filters: SearchFilterState;
}

let state: ExploreState = { mode: 'experiences', filters: EMPTY_FILTERS };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const exploreStore = {
  get: () => state,
  setMode(mode: ExploreMode) {
    state = { ...state, mode };
    emit();
  },
  setFilters(filters: SearchFilterState) {
    state = { ...state, filters };
    emit();
  },
  /** Fresh Explore: experiences mode, no filters (each time it opens from the tab bar). */
  reset() {
    state = { mode: 'experiences', filters: EMPTY_FILTERS };
    emit();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useExplore() {
  return useSyncExternalStore(exploreStore.subscribe, exploreStore.get);
}
