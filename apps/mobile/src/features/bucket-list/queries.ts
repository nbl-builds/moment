import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { showToast } from '@/components/toast';
import { useSession } from '@/features/auth/use-session';
import { api } from '@/lib/api';

// Bucket lists through React Query. Every change updates the cache first
// (hearts, list rows, the open list) and rolls back if the server says no.

export type BucketListRow = Awaited<ReturnType<typeof api.bucketList.lists>>[number];
export type BucketListDetail = Awaited<ReturnType<typeof api.bucketList.getList>>;
type Saved = Awaited<ReturnType<typeof api.bucketList.savedIds>>;

/** What a heart saves: an experience or service, or a whole business. */
export type SaveTarget = { kind: 'listing' | 'business'; id: string };
const itemFor = (t: SaveTarget) => (t.kind === 'listing' ? { listingId: t.id } : { businessId: t.id });

export const bucketKeys = {
  all: (userId: string | undefined) => ['bucket', userId] as const,
  saved: (userId: string | undefined) => ['bucket', userId, 'saved'] as const,
  lists: (userId: string | undefined) => ['bucket', userId, 'lists'] as const,
  list: (userId: string | undefined, listId: string) => ['bucket', userId, 'list', listId] as const,
};

function useUserId() {
  return useSession()?.user.id;
}

/** Which lists hold each listing (hearts and picker ticks). Empty for guests. */
export function useSavedListings() {
  const userId = useUserId();
  const saved = useQuery({
    queryKey: bucketKeys.saved(userId),
    queryFn: () => api.bucketList.savedIds(),
    enabled: Boolean(userId),
  });
  const mapFor = (t: SaveTarget) => (t.kind === 'listing' ? saved.data?.listings : saved.data?.businesses);
  return {
    signedIn: Boolean(userId),
    isSaved: (listingId: string) => (saved.data?.listings.get(listingId)?.length ?? 0) > 0,
    listsFor: (listingId: string) => saved.data?.listings.get(listingId) ?? [],
    /** Same for a listing or a business. */
    isTargetSaved: (t: SaveTarget) => (mapFor(t)?.get(t.id)?.length ?? 0) > 0,
    listsForTarget: (t: SaveTarget) => mapFor(t)?.get(t.id) ?? [],
    /** Anything saved anywhere yet (the first save shows a sheet instead of a toast). */
    hasAnySaved: () => (saved.data?.listings.size ?? 0) + (saved.data?.businesses.size ?? 0) > 0,
    isReady: saved.isSuccess,
  };
}

export function useBucketLists() {
  const userId = useUserId();
  return useQuery({
    queryKey: bucketKeys.lists(userId),
    queryFn: () => api.bucketList.lists(),
    enabled: Boolean(userId),
  });
}

export function useBucketListDetail(listId: string) {
  const userId = useUserId();
  return useQuery({
    queryKey: bucketKeys.list(userId, listId),
    queryFn: () => api.bucketList.getList(listId),
    enabled: Boolean(userId) && Boolean(listId),
  });
}

// ---------------------------------------------------------------------------
// Optimistic helpers
// ---------------------------------------------------------------------------

function editSaved(
  qc: QueryClient,
  userId: string | undefined,
  edit: (map: Map<string, string[]>) => void,
  kind: SaveTarget['kind'] = 'listing',
) {
  qc.setQueryData<Saved>(bucketKeys.saved(userId), (prev) => {
    if (!prev) return prev;
    const key = kind === 'listing' ? 'listings' : 'businesses';
    const map = new Map(prev[key]);
    edit(map);
    return { ...prev, [key]: map };
  });
}

function editLists(qc: QueryClient, userId: string | undefined, edit: (rows: BucketListRow[]) => BucketListRow[]) {
  qc.setQueryData<BucketListRow[]>(bucketKeys.lists(userId), (prev) => (prev ? edit(prev) : prev));
}

/** Snapshot everything under the user's bucket keys, to roll back on error. */
async function snapshot(qc: QueryClient, userId: string | undefined) {
  await qc.cancelQueries({ queryKey: bucketKeys.all(userId) });
  return qc.getQueriesData({ queryKey: bucketKeys.all(userId) });
}

function restore(qc: QueryClient, data: Awaited<ReturnType<typeof snapshot>> | undefined) {
  data?.forEach(([key, value]) => qc.setQueryData(key, value));
}

const failed = (message: string) => () => showToast(message);

export function useBucketMutations() {
  const qc = useQueryClient();
  const userId = useUserId();
  const settle = () => qc.invalidateQueries({ queryKey: bucketKeys.all(userId) });

  const addToList = useMutation({
    mutationFn: ({ listId, target }: { listId: string; target: SaveTarget }) =>
      api.bucketList.addItem({ bucketListId: listId, ...itemFor(target) }),
    onMutate: async ({ listId, target }) => {
      const prev = await snapshot(qc, userId);
      editSaved(qc, userId, (m) => m.set(target.id, [...new Set([...(m.get(target.id) ?? []), listId])]), target.kind);
      editLists(qc, userId, (rows) => rows.map((r) => (r.id === listId ? { ...r, itemCount: r.itemCount + 1 } : r)));
      return prev;
    },
    onError: (_e, _v, prev) => {
      restore(qc, prev);
      failed('Could not save to your bucket list')();
    },
    onSettled: settle,
  });

  const removeFromList = useMutation({
    mutationFn: ({ listId, target }: { listId: string; target: SaveTarget }) =>
      target.kind === 'listing' ? api.bucketList.removeListing(listId, target.id) : api.bucketList.removeBusiness(listId, target.id),
    onMutate: async ({ listId, target }) => {
      const prev = await snapshot(qc, userId);
      const listingId = target.id;
      editSaved(
        qc,
        userId,
        (m) => {
          const left = (m.get(target.id) ?? []).filter((id) => id !== listId);
          if (left.length) m.set(target.id, left);
          else m.delete(target.id);
        },
        target.kind,
      );
      editLists(qc, userId, (rows) => rows.map((r) => (r.id === listId ? { ...r, itemCount: Math.max(0, r.itemCount - 1) } : r)));
      qc.setQueryData<BucketListDetail>(bucketKeys.list(userId, listId), (d) =>
        d ? { ...d, items: d.items.filter((i) => i.listing?.id !== listingId) } : d,
      );
      return prev;
    },
    onError: (_e, _v, prev) => {
      restore(qc, prev);
      failed('Could not update your bucket list')();
    },
    onSettled: settle,
  });

  /** "Give it a name" -> Create Now: makes the list and saves the listing in it. */
  const createAndAdd = useMutation({
    mutationFn: async ({ name, target }: { name: string; target: SaveTarget }) => {
      const list = await api.bucketList.createList({ name });
      await api.bucketList.addItem({ bucketListId: list.id, ...itemFor(target) });
      return list;
    },
    onMutate: async ({ target }) => {
      const prev = await snapshot(qc, userId);
      editSaved(qc, userId, (m) => m.set(target.id, [...(m.get(target.id) ?? []), 'pending']), target.kind);
      return prev;
    },
    onError: (_e, _v, prev) => {
      restore(qc, prev);
      failed('Could not create the list')();
    },
    onSettled: settle,
  });

  const renameList = useMutation({
    mutationFn: ({ listId, name }: { listId: string; name: string }) => api.bucketList.renameList(listId, { name }),
    onMutate: async ({ listId, name }) => {
      const prev = await snapshot(qc, userId);
      editLists(qc, userId, (rows) => rows.map((r) => (r.id === listId ? { ...r, name } : r)));
      qc.setQueryData<BucketListDetail>(bucketKeys.list(userId, listId), (d) => (d ? { ...d, name } : d));
      return prev;
    },
    onError: (_e, _v, prev) => {
      restore(qc, prev);
      failed('Could not rename the list')();
    },
    onSettled: settle,
  });

  const deleteList = useMutation({
    mutationFn: (listId: string) => api.bucketList.deleteList(listId),
    onMutate: async (listId) => {
      const prev = await snapshot(qc, userId);
      editLists(qc, userId, (rows) => rows.filter((r) => r.id !== listId));
      const dropList = (m: Map<string, string[]>) => {
        for (const [id, lists] of m) {
          const left = lists.filter((l) => l !== listId);
          if (left.length) m.set(id, left);
          else m.delete(id);
        }
      };
      editSaved(qc, userId, dropList, 'listing');
      editSaved(qc, userId, dropList, 'business');
      return prev;
    },
    onError: (_e, _v, prev) => {
      restore(qc, prev);
      failed('Could not delete the list')();
    },
    onSettled: settle,
  });

  return { addToList, removeFromList, createAndAdd, renameList, deleteList };
}
