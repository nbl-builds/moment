import { colors, formatShortDateTime } from '@moment/shared';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showToast } from '@/components/toast';
import { useCollapsibleTabBarScroll, useTabBarContentInset } from '@/components/tab-bar';
import { Button, Icon, Text, textStyle } from '@/components/ui';
import { useLoginSheet } from '@/features/auth/login-sheet-provider';
import { useSession } from '@/features/auth/use-session';
import { AvatarStack } from '@/features/groups/components/avatar-stack';
import { hasSeenGroupsIntro } from '@/features/groups/intro-seen';
import { activeMembers, useMyGroups, useRefreshGroups, type MyGroupRow } from '@/features/groups/queries';
import { Skeleton } from '@/features/home/components/skeleton';
import { api } from '@/lib/api';

const INSET = 20;

/**
 * Groups tab (48:3071 empty, 48:3142 list). "+" and "Create group" open the
 * Moment Groups intro the first time, New Group after that.
 */
export default function GroupsTab() {
  const insets = useSafeAreaInsets();
  const bottomInset = useTabBarContentInset();
  const onScroll = useCollapsibleTabBarScroll();
  const session = useSession();
  const { openLoginSheet } = useLoginSheet();
  const groups = useMyGroups();
  const refresh = useRefreshGroups();
  const [query, setQuery] = useState('');

  const create = async () => {
    if (!session) return openLoginSheet();
    router.push((await hasSeenGroupsIntro()) ? '/group/new' : '/group/intro');
  };

  const answerInvite = (row: MyGroupRow) =>
    Alert.alert(`Join ${row.group.name}?`, 'You were invited to plan together in this group.', [
      { text: 'Not now', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          await api.groups.setMyStatus(row.group.id, 'left').catch(() => undefined);
          void refresh();
        },
      },
      {
        text: 'Join',
        onPress: async () => {
          try {
            await api.groups.setMyStatus(row.group.id, 'active');
            await refresh();
            router.push({ pathname: '/group/[id]', params: { id: row.group.id } });
          } catch (e) {
            showToast(e instanceof Error ? e.message : 'Couldn’t join the group');
          }
        },
      },
    ]);

  const rows = (groups.data ?? []).filter((r) => r.group.name.toLowerCase().includes(query.trim().toLowerCase()));

  let body;
  if (session !== null && (session === undefined || groups.isPending)) {
    body = (
      <View style={styles.list}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} width="100%" height={100} radius={15} />
        ))}
      </View>
    );
  } else if (!session || (groups.data ?? []).length === 0) {
    body = (
      <View style={styles.empty}>
        <Image source={require('../../../assets/illustrations/groups-empty.svg')} style={styles.mug} contentFit="contain" accessible={false} />
        <Text variant="h4" color="secondary" align="center" style={styles.emptyTitle}>
          No groups... yet!
        </Text>
        <Text variant="body14" weight="medium" color="secondaryTint2" align="center" style={styles.emptyNote}>
          Find things to do in the feed and dive in to a world of unforgettable experiences.
        </Text>
        <Button label="Create group" variant="outline" size="small" onPress={() => void create()} style={styles.emptyButton} />
      </View>
    );
  } else {
    body = (
      <>
        <View style={styles.search}>
          <Icon name="search" size={20} color="secondary" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search groups"
            placeholderTextColor={colors.secondary}
            style={styles.searchInput}
            returnKeyType="search"
            accessibilityLabel="Search groups"
          />
        </View>
        <View style={styles.list}>
          {rows.length === 0 ? (
            <Text variant="body14" weight="medium" color="secondaryTint2" align="center" style={styles.noMatch}>
              No groups match “{query.trim()}”.
            </Text>
          ) : (
            rows.map((row) => (
              <GroupRow
                key={row.group.id}
                row={row}
                onPress={() => (row.status === 'invited' ? answerInvite(row) : router.push({ pathname: '/group/[id]', params: { id: row.group.id } }))}
              />
            ))
          )}
        </View>
      </>
    );
  }

  return (
    <View style={styles.screen}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top + 56, paddingBottom: bottomInset }}
        refreshControl={<RefreshControl refreshing={groups.isRefetching} onRefresh={() => void groups.refetch()} />}
      >
        <View style={styles.header}>
          <Text variant="h3" color="secondary" accessibilityRole="header">
            Groups
          </Text>
          <Pressable onPress={() => void create()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Create a group">
            <Icon name="plus" size={28} color="secondary" />
          </Pressable>
        </View>
        <View style={styles.divider} />
        {body}
      </Animated.ScrollView>
    </View>
  );
}

function GroupRow({ row, onPress }: { row: MyGroupRow; onPress: () => void }) {
  const g = row.group;
  const cover = api.media.url(g.cover_url);
  const people = activeMembers(g.members);
  const invited = row.status === 'invited';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${g.name}, ${people.length} members${invited ? ', you are invited' : ''}${g.sharing_enabled ? ', link sharing on' : ''}`}
    >
      <View style={styles.cover}>{cover && <Image source={cover} style={StyleSheet.absoluteFill} contentFit="cover" />}</View>
      <View style={styles.rowText}>
        <Text variant="h4" color="secondary" numberOfLines={1}>
          {g.name}
        </Text>
        <Text variant="subText12" color="secondaryTint2" style={styles.date}>
          {invited ? 'You’re invited · Tap to join' : formatShortDateTime(g.created_at)}
        </Text>
        <View style={styles.avatars}>
          <AvatarStack people={people} />
        </View>
      </View>
      {g.sharing_enabled && <Icon name="eye-privacy" size={24} style={styles.eye} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  header: {
    marginHorizontal: INSET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  divider: {
    marginTop: 11,
    marginHorizontal: INSET,
    height: 1,
    backgroundColor: colors.divider,
  },
  search: {
    marginTop: 20,
    marginHorizontal: INSET,
    height: 49,
    borderRadius: 12,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 17,
    gap: 17,
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchInput: {
    ...textStyle('subText14'),
    flex: 1,
    color: colors.secondary,
    paddingVertical: 0,
  },
  list: {
    marginTop: 30,
    marginHorizontal: INSET,
    gap: 16,
  },
  noMatch: {
    marginTop: 20,
  },
  row: {
    height: 100,
    borderRadius: 15,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 22,
  },
  pressed: {
    opacity: 0.9,
  },
  cover: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.secondaryTint5,
  },
  rowText: {
    flex: 1,
    alignSelf: 'stretch',
  },
  date: {
    marginTop: 7,
  },
  avatars: {
    marginTop: 'auto',
  },
  eye: {
    alignSelf: 'center',
    marginRight: 12,
  },
  empty: {
    marginTop: 176,
    marginHorizontal: 61,
    alignItems: 'center',
  },
  mug: {
    width: 100,
    height: 102,
  },
  emptyTitle: {
    marginTop: 21,
  },
  emptyNote: {
    marginTop: 10,
  },
  emptyButton: {
    marginTop: 19,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.black,
    borderRadius: 12,
  },
});
