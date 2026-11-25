import { colors, formatShortDateTime } from '@moment/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet } from '@/components/bottom-sheet';
import { showToast } from '@/components/toast';
import { Icon, Text } from '@/components/ui';
import { ListThumbnail } from '@/features/bucket-list/components/list-thumbnail';
import { NameSheet } from '@/features/bucket-list/components/name-sheet';
import { BUCKET } from '@/features/bucket-list/layout';
import { useUserPlace } from '@/features/home/use-user-place';
import { api } from '@/lib/api';
import { groupKeys, useMyGroups } from '../queries';

export type GroupTarget = { listingId: string } | { businessId: string };

/**
 * "Add to Groups" from a heart (no Figma frame; same layout as "Your
 * Bucketlist" 24:1225): tick groups to save the item to, or create one.
 */
export function GroupPickerSheet({ target, onBack, onClose }: { target: GroupTarget | null; onBack: () => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { place } = useUserPlace();
  const groups = useMyGroups();
  const [naming, setNaming] = useState(false);
  const [creating, setCreating] = useState(false);
  const key = ['groups', 'liked-ids', target] as const;
  const liked = useQuery({ queryKey: key, queryFn: () => api.groups.likedGroupIds(target as GroupTarget), enabled: Boolean(target) });

  const active = (groups.data ?? []).filter((r) => r.status === 'active');
  const view = (id: string) => {
    onClose();
    router.push({ pathname: '/group/[id]', params: { id } });
  };

  const toggle = async (groupId: string, name: string) => {
    if (!target) return;
    const was = liked.data?.includes(groupId) ?? false;
    queryClient.setQueryData<string[]>(key, (old = []) => (was ? old.filter((g) => g !== groupId) : [...old, groupId]));
    try {
      if (was) await api.groups.unlike(groupId, target);
      else {
        await api.groups.like(groupId, target);
        showToast(`Saved to ${name}`, { label: 'View', onPress: () => view(groupId) });
      }
      void queryClient.invalidateQueries({ queryKey: groupKeys.likes(groupId) });
    } catch (e) {
      void liked.refetch();
      showToast(e instanceof Error ? e.message : 'Couldn’t save to the group');
    }
  };

  const create = async (name: string) => {
    if (!target) return;
    setCreating(true);
    try {
      const group = await api.groups.create({
        name,
        visibility: 'private',
        isOpenToMatch: false,
        maxMembers: 12,
        interestTagIds: [],
        destinationCity: place.city ?? undefined,
      });
      await api.groups.like(group.id, target);
      await queryClient.invalidateQueries({ queryKey: groupKeys.all });
      setNaming(false);
      onClose();
      showToast(`Saved to ${name}`, { label: 'View', onPress: () => view(group.id) });
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Couldn’t create the group');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <BottomSheet visible={target !== null && !naming} onRequestClose={onClose} accessibilityLabel="Your Groups" backgroundColor={colors.backgroundMuted}>
        <View style={[styles.picker, { paddingBottom: insets.bottom + BUCKET.sheetBottom + 16 }]}>
          <View style={styles.header}>
            <Pressable onPress={onBack} hitSlop={10} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
              <Icon name="chevron-left" size={28} color="black" />
            </Pressable>
            <Text variant="h4" color="secondary" align="center" accessibilityRole="header">
              Your Groups
            </Text>
          </View>
          <Pressable
            onPress={() => setNaming(true)}
            style={({ pressed }) => [styles.create, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Create a new group"
          >
            <Icon name="plus" size={28} color="secondary" />
            <Text variant="subText16" weight="bold" color="secondary">
              Create a new group
            </Text>
          </Pressable>
          <View style={styles.rows}>
            {groups.isPending && <ActivityIndicator color={colors.secondary} style={styles.loading} />}
            {active.map((r) => {
              const on = liked.data?.includes(r.group.id) ?? false;
              return (
                <Pressable
                  key={r.group.id}
                  onPress={() => void toggle(r.group.id, r.group.name)}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={r.group.name}
                >
                  <ListThumbnail url={r.group.cover_url} size={BUCKET.picker.thumb} radius={12} />
                  <View style={styles.rowText}>
                    <Text variant="body18" weight="bold" color="secondary" numberOfLines={1}>
                      {r.group.name}
                    </Text>
                    <Text variant="body12" weight="medium" color="secondaryTint2">
                      {formatShortDateTime(r.group.created_at)}
                    </Text>
                  </View>
                  {on && (
                    <View style={styles.tick}>
                      <Icon name="check" size={18} color="secondary" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </BottomSheet>
      <NameSheet
        visible={naming}
        title="Give it a name"
        placeholder="Enter your group name"
        submitLabel="Create Now"
        loading={creating}
        onSubmit={(name) => void create(name)}
        onClose={() => setNaming(false)}
      />
    </>
  );
}

const P = BUCKET.picker;

const styles = StyleSheet.create({
  picker: {
    paddingTop: P.headerTop,
    paddingHorizontal: BUCKET.inset,
  },
  header: {
    justifyContent: 'center',
    minHeight: 28,
  },
  back: {
    position: 'absolute',
    left: 0,
  },
  create: {
    marginTop: 24,
    height: 60,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.chipBorder,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  rows: {
    marginTop: 16,
    gap: 12,
  },
  loading: {
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 10,
    borderRadius: 15,
    backgroundColor: colors.surface,
  },
  rowText: {
    flex: 1,
  },
  tick: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
