import { QueryClient } from '@tanstack/react-query';

/** One cache for the app. Screens refetch on pull to refresh. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});
