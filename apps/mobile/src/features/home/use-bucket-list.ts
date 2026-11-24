import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { showToast } from '@/components/toast';
import { useLoginSheet } from '@/features/auth/login-sheet-provider';
import { useSession } from '@/features/auth/use-session';
import { api } from '@/lib/api';

type SavedIds = Awaited<ReturnType<typeof api.bucketList.savedIds>>;

/**
 * Hearts on listing cards: which listings are in the bucket list, and a toggle.
 * Guests get the login sheet instead.
 */
export function useBucketList() {
  const session = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const { openLoginSheet } = useLoginSheet();
  const key = ['bucket-list-ids', userId];

  const saved = useQuery({
    queryKey: key,
    queryFn: () => api.bucketList.savedIds(),
    enabled: Boolean(userId),
  });

  const toggle = useMutation({
    mutationFn: async (listingId: string) => {
      const itemId = saved.data?.listings.get(listingId);
      if (itemId) await api.bucketList.remove(itemId);
      else await api.bucketList.add({ listingId });
    },
    // Flip the heart straight away; roll back if the server says no.
    onMutate: async (listingId) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<SavedIds>(key);
      if (previous) {
        const listings = new Map(previous.listings);
        if (listings.has(listingId)) listings.delete(listingId);
        else listings.set(listingId, 'pending');
        queryClient.setQueryData<SavedIds>(key, { ...previous, listings });
      }
      return { previous };
    },
    onError: (_error, _listingId, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      showToast('Could not update your bucket list');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return {
    isSaved: (listingId: string) => Boolean(saved.data?.listings.has(listingId)),
    toggle: (listingId: string) => {
      if (!userId) {
        openLoginSheet();
        return;
      }
      toggle.mutate(listingId);
    },
  };
}
