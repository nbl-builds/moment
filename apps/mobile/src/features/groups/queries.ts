import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/features/auth/use-session';
import { api } from '@/lib/api';

export type MyGroupRow = Awaited<ReturnType<typeof api.groups.listMine>>[number];
export type GroupDetail = Awaited<ReturnType<typeof api.groups.get>>;
export type GroupLike = Awaited<ReturnType<typeof api.groups.likes>>[number];
type MatchRow = Awaited<ReturnType<typeof api.groups.matches>>[number];
/** Generated RPC types mark every column non-null; these can be null. */
export type GroupMatch = Omit<MatchRow, 'request_status' | 'cover_url' | 'description' | 'destination_city'> & {
  request_status: MatchRow['request_status'] | null;
  cover_url: string | null;
  description: string | null;
  destination_city: string | null;
};
export type Person = { id: string; display_name: string; avatar_url: string | null };

export const groupKeys = {
  all: ['groups'] as const,
  mine: (userId: string | undefined) => ['groups', 'mine', userId] as const,
  detail: (id: string) => ['groups', 'detail', id] as const,
  likes: (id: string) => ['groups', 'likes', id] as const,
  matches: (id: string) => ['groups', 'matches', id] as const,
  recs: (id: string) => ['groups', 'recs', id] as const,
};

export function useMyGroups() {
  const userId = useSession()?.user.id;
  return useQuery({ queryKey: groupKeys.mine(userId), queryFn: () => api.groups.listMine(), enabled: Boolean(userId) });
}

export function useGroup(id: string | undefined) {
  const userId = useSession()?.user.id;
  return useQuery({ queryKey: [...groupKeys.detail(id ?? ''), userId], queryFn: () => api.groups.get(id as string), enabled: Boolean(id && userId) });
}

export function useGroupLikes(id: string | undefined) {
  return useQuery({ queryKey: groupKeys.likes(id ?? ''), queryFn: () => api.groups.likes(id as string), enabled: Boolean(id) });
}

export function useGroupMatches(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: groupKeys.matches(id ?? ''),
    queryFn: async (): Promise<GroupMatch[]> => api.groups.matches(id as string),
    enabled: Boolean(id) && enabled,
  });
}

export function useGroupRecommendations(id: string | undefined) {
  return useQuery({ queryKey: groupKeys.recs(id ?? ''), queryFn: () => api.groups.recommendations(id as string, 10), enabled: Boolean(id) });
}

/** Active members (owner first), as avatars. */
export function activeMembers(members: GroupDetail['members'] | MyGroupRow['group']['members']) {
  const order = { owner: 0, admin: 1, member: 2 } as const;
  return members
    .filter((m) => m.status === 'active' && m.profile)
    .sort((a, b) => order[a.role] - order[b.role])
    .map((m) => m.profile as Person);
}

/** Group a group's likes by item: one card per experience/business with everyone who liked it. */
export function likedItems(likes: GroupLike[]) {
  const items = new Map<string, { key: string; like: GroupLike; people: Person[] }>();
  for (const l of likes) {
    const key = l.listing?.id ?? l.business?.id;
    if (!key) continue;
    const item = items.get(key) ?? { key, like: l, people: [] };
    if (l.profile && !item.people.some((p) => p.id === l.profile!.id)) item.people.push(l.profile as Person);
    items.set(key, item);
  }
  return [...items.values()];
}

/** Invalidate everything about groups after a change. */
export function useRefreshGroups() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: groupKeys.all });
}

export function useSendMatch(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ toGroupId, sent }: { toGroupId: string; sent: boolean }) =>
      sent ? api.groups.withdrawMatch(groupId, toGroupId) : api.groups.sendMatch(groupId, toGroupId),
    // Fill or empty the heart right away.
    onMutate: async ({ toGroupId, sent }) => {
      await queryClient.cancelQueries({ queryKey: groupKeys.matches(groupId) });
      const prev = queryClient.getQueryData<GroupMatch[]>(groupKeys.matches(groupId));
      queryClient.setQueryData<GroupMatch[]>(groupKeys.matches(groupId), (old) =>
        old?.map((m) => (m.id === toGroupId ? { ...m, request_status: sent ? null : 'pending' } : m)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => queryClient.setQueryData(groupKeys.matches(groupId), ctx?.prev),
    onSettled: () => queryClient.invalidateQueries({ queryKey: groupKeys.matches(groupId) }),
  });
}
