import { colors } from '@moment/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet } from '@/components/bottom-sheet';
import { showToast } from '@/components/toast';
import { Button, Icon, Text } from '@/components/ui';
import { useSession } from '@/features/auth/use-session';
import { NameSheet } from '@/features/bucket-list/components/name-sheet';
import { SheetOption } from '@/features/bucket-list/components/sheet-option';
import { openBusiness, openListing } from '@/features/business/navigation';
import { exploreStore } from '@/features/explore/store';
import { AvatarStack } from '@/features/groups/components/avatar-stack';
import { ConfirmSheet } from '@/features/groups/components/confirm-sheet';
import { InviteSheet } from '@/features/groups/components/invite-sheet';
import { LikedCard } from '@/features/groups/components/liked-card';
import { MatchDeck } from '@/features/groups/components/match-deck';
import { MembersSheet } from '@/features/groups/components/members-sheet';
import {
  activeMembers,
  likedItems,
  useGroup,
  useGroupLikes,
  useGroupMatches,
  useGroupRecommendations,
  useRefreshGroups,
  useSendMatch,
  type GroupDetail,
} from '@/features/groups/queries';
import { ListingCard } from '@/features/home/components/listing-card';
import { HOME } from '@/features/home/layout';
import { useBucketList } from '@/features/home/use-bucket-list';
import { ComingNext } from '@/features/placeholders/coming-next';
import { api } from '@/lib/api';

const INSET = 20;

type Sheet = 'share' | 'menu' | 'rename' | 'leave' | 'members' | 'invite' | null;

/** Group page (48:4500) with the share sheet (48:4668), ••• menu (48:4832) and rename (48:4986). */
export default function GroupScreen() {
  const { id, invite } = useLocalSearchParams<{ id: string; invite?: string }>();
  const session = useSession();
  const group = useGroup(id);
  if (session === null) return <ComingNext title="Group" note="Log in to see your groups." />;
  if (group.isPending) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.secondary} />
      </View>
    );
  }
  if (group.isError || !group.data) return <ComingNext title="Group" note="This group isn’t available any more." />;
  return <Group group={group.data} me={session?.user.id ?? ''} startWithInvite={invite === '1'} refreshing={group.isRefetching} onRefresh={() => void group.refetch()} />;
}

function Group({ group: g, me, startWithInvite, refreshing, onRefresh }: { group: GroupDetail; me: string; startWithInvite: boolean; refreshing: boolean; onRefresh: () => void }) {
  const insets = useSafeAreaInsets();
  const bucket = useBucketList();
  const refresh = useRefreshGroups();
  const likes = useGroupLikes(g.id);
  const matches = useGroupMatches(g.id, g.is_open_to_match);
  const recs = useGroupRecommendations(g.id);
  const sendMatch = useSendMatch(g.id);
  // Opened from a bucket list's "Invite others": start on Invite.
  const [sheet, setSheet] = useState<Sheet>(startWithInvite ? 'invite' : null);
  const [busy, setBusy] = useState(false);

  const mine = g.members.find((m) => m.user_id === me);
  const isOwner = g.owner_id === me;
  const isAdmin = mine?.role === 'owner' || mine?.role === 'admin';
  const people = activeMembers(g.members);
  const items = likedItems(likes.data ?? []);
  const memberIds = g.members.filter((m) => m.status === 'active' || m.status === 'invited').map((m) => m.user_id);

  const shareLink = async () => {
    setSheet(null);
    await Share.share({ message: `Join “${g.name}” on Moment and plan with us: moment://group/${g.invite_token}` }).catch(() => undefined);
  };

  const rename = async (name: string) => {
    setBusy(true);
    try {
      await api.groups.rename(g.id, name);
      await refresh();
      setSheet(null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Couldn’t rename the group');
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    setBusy(true);
    try {
      await api.groups.setMyStatus(g.id, 'left');
      await refresh();
      setSheet(null);
      router.back();
      showToast(`You left ${g.name}`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Couldn’t leave the group');
    } finally {
      setBusy(false);
    }
  };

  const openToMatch = async () => {
    try {
      await api.groups.updateSettings(g.id, { isOpenToMatch: true });
      await refresh();
      showToast('Your group is open to Group Match');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Couldn’t change the setting');
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inset}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
            <Icon name="close-thin" size={28} color="black" />
          </Pressable>
          <View style={styles.titleRow}>
            <Text variant="h3" color="secondary" numberOfLines={2} style={styles.title} accessibilityRole="header">
              {g.name}
            </Text>
            <Pressable onPress={() => setSheet('share')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Share or invite">
              <Icon name="open-external" size={28} color="secondary" />
            </Pressable>
            <Pressable onPress={() => setSheet('menu')} hitSlop={8} accessibilityRole="button" accessibilityLabel="More">
              <Icon name="more-dots" size={28} color="secondary" />
            </Pressable>
          </View>
          <Pressable onPress={() => setSheet('members')} style={styles.members} accessibilityRole="button" accessibilityLabel={`${people.length} members. Show members`}>
            <AvatarStack people={people} />
            <Text variant="body12" weight="medium" color="secondaryTint2" numberOfLines={1} style={styles.membersText}>
              {people.length} member{people.length === 1 ? '' : 's'}
              {g.description ? ` · ${g.description}` : ''}
            </Text>
          </Pressable>
          <View style={styles.divider} />
        </View>

        {/* Liked by group */}
        <SectionTitle title="Liked by group" />
        {likes.isPending ? (
          <ActivityIndicator style={styles.state} color={colors.secondary} />
        ) : items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text variant="body16" weight="bold" color="secondary">
              Nothing liked yet
            </Text>
            <Text variant="body14" weight="medium" color="secondaryTint2" align="center">
              Tap the heart on any experience and choose “Add to Groups” to save it here.
            </Text>
            <Button
              label="Browse experiences"
              size="small"
              variant="dark"
              onPress={() => {
                exploreStore.reset();
                router.push('/map');
              }}
              style={styles.emptyButton}
            />
          </View>
        ) : (
          <FlatList
            horizontal
            data={items}
            keyExtractor={(i) => i.key}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rail}
            snapToInterval={HOME.card.width + 20}
            decelerationRate="fast"
            renderItem={({ item }) => (
              <LikedCard
                like={item.like}
                people={item.people}
                saved={item.like.listing ? bucket.isSaved(item.like.listing.id) : bucket.isBusinessSaved(item.like.business?.id ?? '')}
                onToggleSaved={() => (item.like.listing ? bucket.toggle(item.like.listing.id) : bucket.toggleBusiness(item.like.business!.id))}
                onPress={() => (item.like.listing ? openListing(item.like.listing) : openBusiness(item.like.business!.slug))}
              />
            )}
          />
        )}

        {/* Group Match */}
        {g.is_open_to_match ? (
          <>
            <SectionTitle title="Group Match" />
            {matches.isPending ? (
              <ActivityIndicator style={styles.state} color={colors.secondary} />
            ) : (matches.data ?? []).length === 0 ? (
              <Text variant="body14" weight="medium" color="secondaryTint2" style={styles.note}>
                No groups to match with{g.destination_city ? ` in ${g.destination_city}` : ''} yet. Check back soon.
              </Text>
            ) : (
              <MatchDeck
                matches={matches.data as Parameters<typeof MatchDeck>[0]['matches']}
                onHeart={(m) => {
                  const sent = m.request_status !== null;
                  sendMatch.mutate({ toGroupId: m.id, sent });
                  if (!sent) showToast(`Match request sent to ${m.name}`);
                }}
              />
            )}
          </>
        ) : (
          isAdmin && (
            <View style={styles.prompt}>
              <View style={styles.promptText}>
                <Text variant="body16" weight="bold" color="secondary">
                  Find groups to plan with
                </Text>
                <Text variant="body12" weight="medium" color="secondaryTint2">
                  Open your group to Group Match to meet groups going{g.destination_city ? ` to ${g.destination_city}` : ' your way'}. Your group becomes public.
                </Text>
              </View>
              <Button label="Turn on" size="small" variant="dark" onPress={() => void openToMatch()} />
            </View>
          )
        )}

        {/* Recommended Group */}
        <SectionTitle title="Recommended Group" />
        {recs.isPending ? (
          <ActivityIndicator style={styles.state} color={colors.secondary} />
        ) : (
          <FlatList
            horizontal
            data={recs.data ?? []}
            keyExtractor={(l) => l.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rail}
            snapToInterval={HOME.card.width + 20}
            decelerationRate="fast"
            renderItem={({ item }) => (
              <ListingCard
                listing={item}
                size="tall"
                saved={bucket.isSaved(item.id)}
                onPress={() => openListing(item)}
                onToggleSaved={() => bucket.toggle(item.id)}
              />
            )}
          />
        )}
      </ScrollView>

      {/* Share (48:4668) */}
      <BottomSheet visible={sheet === 'share'} onRequestClose={() => setSheet(null)} backgroundColor={colors.backgroundMuted} accessibilityLabel="Share">
        <View style={[styles.options, { paddingBottom: insets.bottom + 30 }]}>
          <View style={styles.grabber} />
          {g.sharing_enabled ? (
            <SheetOption icon="share-link" title="Share a link" subtitle="Anyone with the link will be able to join. A.K.A public" onPress={() => void shareLink()} />
          ) : (
            isAdmin && (
              <SheetOption
                icon="share-link"
                title="Share a link"
                subtitle="Turn on Enable Sharing in Group Settings first"
                onPress={() => {
                  setSheet(null);
                  router.push({ pathname: '/group/[id]/settings', params: { id: g.id } });
                }}
              />
            )
          )}
          <SheetOption icon="user-add" title="Invite others" subtitle="Only those you invite will be able to join. A.K.A private" onPress={() => setSheet('invite')} />
        </View>
      </BottomSheet>

      {/* ••• (48:4832) */}
      <BottomSheet visible={sheet === 'menu'} onRequestClose={() => setSheet(null)} backgroundColor={colors.backgroundMuted} accessibilityLabel="Group options">
        <View style={[styles.options, { paddingBottom: insets.bottom + 30 }]}>
          <View style={styles.grabber} />
          {isAdmin && <SheetOption icon="file-edit" title="Edit Group Name" onPress={() => setSheet('rename')} />}
          {isOwner ? (
            <SheetOption
              icon="settings"
              title="Group Settings"
              onPress={() => {
                setSheet(null);
                router.push({ pathname: '/group/[id]/settings', params: { id: g.id } });
              }}
            />
          ) : (
            <SheetOption icon="trash" title="Leave group" onPress={() => setSheet('leave')} />
          )}
        </View>
      </BottomSheet>

      <NameSheet
        visible={sheet === 'rename'}
        title="Rename"
        placeholder="Enter your group name"
        submitLabel="Save"
        initialName={g.name}
        loading={busy}
        onSubmit={(name) => void rename(name)}
        onClose={() => setSheet(null)}
      />
      <ConfirmSheet
        visible={sheet === 'leave'}
        title="Leave this group?"
        body={`You’ll stop seeing ${g.name}. Someone will need to invite you to join again.`}
        loading={busy}
        onConfirm={() => void leave()}
        onClose={() => setSheet(null)}
      />
      <MembersSheet
        visible={sheet === 'members'}
        group={g}
        me={me}
        canManage={isAdmin}
        onRemove={async (userId, name) => {
          try {
            await api.groups.removeMember(g.id, userId);
            await refresh();
            showToast(`${name} was removed`);
          } catch (e) {
            showToast(e instanceof Error ? e.message : 'Couldn’t remove them');
          }
        }}
        onInvite={() => setSheet('invite')}
        onClose={() => setSheet(null)}
      />
      <InviteSheet visible={sheet === 'invite'} groupId={g.id} memberIds={memberIds} onInvited={() => void refresh()} onClose={() => setSheet(null)} />
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <Text variant="h4" weight="extrabold" color="secondary" style={styles.section} accessibilityRole="header">
      {title}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inset: {
    paddingHorizontal: INSET,
  },
  close: {
    alignSelf: 'flex-start',
  },
  titleRow: {
    marginTop: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  title: {
    flex: 1,
  },
  members: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  membersText: {
    flex: 1,
  },
  divider: {
    marginTop: 12,
    height: 1,
    backgroundColor: colors.secondaryTint5,
  },
  section: {
    marginTop: 30,
    marginBottom: 18,
    marginHorizontal: INSET,
    letterSpacing: 0.2,
  },
  rail: {
    paddingHorizontal: INSET,
    gap: 20,
    paddingBottom: 30,
  },
  state: {
    marginVertical: 30,
  },
  note: {
    marginHorizontal: INSET,
  },
  emptyCard: {
    marginHorizontal: INSET,
    padding: 24,
    borderRadius: 15,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: 6,
  },
  emptyButton: {
    marginTop: 10,
  },
  prompt: {
    marginTop: 30,
    marginHorizontal: INSET,
    padding: 16,
    borderRadius: 15,
    backgroundColor: colors.primaryTint6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  promptText: {
    flex: 1,
    gap: 4,
  },
  options: {
    paddingTop: 8,
    paddingHorizontal: INSET,
    gap: 20,
  },
  grabber: {
    alignSelf: 'center',
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.chipBorder,
    marginBottom: 10,
  },
});
