import { colors } from '@moment/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { openListing } from '@/features/business/navigation';
import { useState } from 'react';
import { FlatList, Pressable, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet } from '@/components/bottom-sheet';
import { showToast } from '@/components/toast';
import { Button, Icon, Text } from '@/components/ui';
import { NameSheet } from '@/features/bucket-list/components/name-sheet';
import { SheetOption } from '@/features/bucket-list/components/sheet-option';
import { BUCKET } from '@/features/bucket-list/layout';
import { useBucketListDetail, useBucketMutations, type BucketListDetail } from '@/features/bucket-list/queries';
import { ListingCard } from '@/features/home/components/listing-card';
import { Skeleton } from '@/features/home/components/skeleton';
import { HOME } from '@/features/home/layout';
import { useBucketList } from '@/features/home/use-bucket-list';
import { useUserPlace } from '@/features/home/use-user-place';
import { api } from '@/lib/api';

type Item = BucketListDetail['items'][number];
type Sheet = 'share' | 'menu' | 'rename' | 'delete' | null;

const GAP = { top: 16, closeToTitle: 30, titleToRule: 5, ruleToList: 20, cards: 20 } as const;

/** Link to a list; opening it in the app comes later (see docs/ROADMAP.md). */
const shareLink = (token: string) => `moment://bucket-list/${token}`;

/**
 * One bucket list (Figma 24:2120): its experiences as cards, share (24:2226)
 * and ••• (24:2474) with Rename (25:1517) and Delete (25:1723).
 */
export default function BucketListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const list = useBucketListDetail(id);
  const { renameList, deleteList } = useBucketMutations();
  const bucket = useBucketList();
  const { place } = useUserPlace();
  const queryClient = useQueryClient();

  /** "Invite others": the list becomes a group (same name, cover and items), then Invite opens. */
  const inviteOthers = async () => {
    const data = list.data;
    if (!data) return;
    try {
      const group = await api.groups.create({
        name: data.name.length >= 2 ? data.name : `${data.name} group`,
        visibility: 'private',
        isOpenToMatch: false,
        maxMembers: 12,
        interestTagIds: [],
        destinationCity: place.city ?? undefined,
        coverUrl: data.items.find((i) => i.listing)?.listing?.media[0]?.url ?? data.items.find((i) => i.business)?.business?.cover_url ?? undefined,
      });
      await Promise.all(
        data.items.map((i) =>
          i.listing ? api.groups.like(group.id, { listingId: i.listing.id }) : i.business ? api.groups.like(group.id, { businessId: i.business.id }) : null,
        ),
      );
      await queryClient.invalidateQueries({ queryKey: ['groups'] });
      router.push({ pathname: '/group/[id]', params: { id: group.id, invite: '1' } });
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Couldn’t create the group');
    }
  };
  const [sheet, setSheet] = useState<Sheet>(null);
  const close = () => setSheet(null);

  const items = (list.data?.items ?? []).filter((i): i is Item & { listing: NonNullable<Item['listing']> } => Boolean(i.listing));
  const ids = items.map((i) => i.listing.id);
  const distances = useQuery({
    queryKey: ['bucket-distances', place.coords?.lat, place.coords?.lng, ids],
    queryFn: () => api.catalog.listingDistances(place.coords as { lat: number; lng: number }, ids),
    enabled: Boolean(place.coords) && ids.length > 0,
  });

  const name = list.data?.name ?? '';

  const share = async () => {
    close();
    if (!list.data) return;
    try {
      await Share.share({ message: `${name} on Moment: ${shareLink(list.data.share_token)}` });
    } catch {
      showToast('Could not open sharing');
    }
  };

  const remove = () => {
    close();
    deleteList.mutate(id);
    router.back();
    showToast(`Deleted ${name}`);
  };

  const header = (
    <View>
      <Pressable onPress={() => router.back()} hitSlop={10} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
        <Icon name="close" size={28} color="secondary" />
      </Pressable>
      <View style={styles.titleRow}>
        <Text variant="h3" color="secondary" numberOfLines={1} style={styles.title} accessibilityRole="header">
          {name}
        </Text>
        <Pressable onPress={() => setSheet('share')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Share list" disabled={!list.data}>
          <Icon name="share" size={28} color="black" />
        </Pressable>
        <Pressable onPress={() => setSheet('menu')} hitSlop={8} accessibilityRole="button" accessibilityLabel="More options" disabled={!list.data}>
          <Icon name="more" size={28} color="black" />
        </Pressable>
      </View>
      <View style={styles.rule} />
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <ListingCard
            listing={item.listing}
            size="wide"
            distanceKm={distances.data?.get(item.listing.id)}
            saved={bucket.isSaved(item.listing.id)}
            onPress={() => openListing(item.listing!)}
            onToggleSaved={() => bucket.toggle(item.listing.id)}
          />
        )}
        ListHeaderComponent={header}
        ListHeaderComponentStyle={styles.headerGap}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + GAP.top, paddingBottom: insets.bottom + 24 }]}
        refreshing={list.isRefetching}
        onRefresh={() => void list.refetch()}
        ListEmptyComponent={
          list.isPending ? (
            <Skeleton width="100%" height={HOME.card.wide.height} radius={HOME.card.radius} />
          ) : list.isError ? (
            <View style={styles.state}>
              <Text variant="h4" color="secondary" align="center">
                Couldn’t load this list
              </Text>
              <Button label="Try again" size="small" variant="dark" onPress={() => void list.refetch()} style={styles.stateButton} />
            </View>
          ) : (
            <View style={styles.state}>
              <Text variant="h4" color="secondary" align="center">
                Nothing saved here yet
              </Text>
              <Text variant="body14" color="secondaryTint2" align="center">
                Tap the heart on any experience to add it to this list.
              </Text>
              <Button
                label="Browse experiences"
                size="small"
                variant="dark"
                onPress={() => router.push({ pathname: '/see-all/[section]', params: { section: 'explore' } })}
                style={styles.stateButton}
              />
            </View>
          )
        }
      />

      {/* Share sheet (24:2226) */}
      <BottomSheet visible={sheet === 'share'} onRequestClose={close} accessibilityLabel="Share" backgroundColor={colors.backgroundMuted}>
        <View style={[styles.options, { paddingBottom: insets.bottom + BUCKET.sheetBottom }]}>
          <SheetOption icon="share-link" title="Share a link" subtitle="Anyone with the link will be able to view" onPress={() => void share()} />
          <SheetOption
            icon="user-add"
            title="Invite others"
            subtitle="Inviting others will automatically convert to groups"
            onPress={() => {
              close();
              void inviteOthers();
            }}
          />
        </View>
      </BottomSheet>

      {/* ••• menu (24:2474) */}
      <BottomSheet visible={sheet === 'menu'} onRequestClose={close} accessibilityLabel="List options" backgroundColor={colors.backgroundMuted}>
        <View style={[styles.options, { paddingBottom: insets.bottom + BUCKET.sheetBottom }]}>
          <SheetOption icon="file-edit" title="Edit" onPress={() => setSheet('rename')} />
          <SheetOption icon="trash" title="Delete" onPress={() => setSheet('delete')} />
        </View>
      </BottomSheet>

      {/* Rename (25:1517) */}
      <NameSheet
        visible={sheet === 'rename'}
        title="Rename"
        placeholder="Enter your new name"
        submitLabel="Save"
        initialName={name}
        onSubmit={(next) => {
          close();
          if (next !== name) renameList.mutate({ listId: id, name: next });
        }}
        onClose={close}
      />

      {/* Delete confirm (25:1723) */}
      <BottomSheet visible={sheet === 'delete'} onRequestClose={close} accessibilityLabel="Delete this bucketlist?" backgroundColor={colors.backgroundMuted}>
        <View style={[styles.confirm, { paddingBottom: insets.bottom + 18 }]}>
          <Text variant="h3" color="secondary" align="center" style={styles.confirmTitle} accessibilityRole="header">
            Are you sure you want to delete this bucketlist?
          </Text>
          <Text variant="body15" weight="medium" color="secondaryTint2" align="center" style={styles.confirmBody}>
            You won’t be able to get back the list view again once you delete.
          </Text>
          <Button label="Yes, Delete" variant="danger" onPress={remove} style={styles.deleteButton} />
          <Button label="No, Wait" variant="muted" onPress={close} style={styles.waitButton} />
        </View>
      </BottomSheet>
    </View>
  );
}

function Separator() {
  return <View style={{ height: GAP.cards }} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: BUCKET.inset,
  },
  close: {
    alignSelf: 'flex-start',
  },
  // Figma: share at x 333 and ••• at x 381 (28pt each, 20pt apart), level with the title.
  titleRow: {
    marginTop: GAP.closeToTitle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  title: {
    flex: 1,
  },
  rule: {
    marginTop: GAP.titleToRule,
    height: 1,
    backgroundColor: colors.divider,
  },
  headerGap: {
    marginBottom: GAP.ruleToList,
  },
  state: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  stateButton: {
    marginTop: 14,
    alignSelf: 'center',
  },
  options: {
    paddingTop: BUCKET.sheetTop,
    paddingHorizontal: BUCKET.inset,
    gap: BUCKET.option.gap,
  },
  // Figma 25:1723: title 28pt below the top, body 11pt below, buttons 33pt and 32pt apart.
  confirm: {
    paddingTop: 28,
    paddingHorizontal: BUCKET.inset,
  },
  confirmTitle: {
    alignSelf: 'center',
    maxWidth: 306,
  },
  confirmBody: {
    marginTop: 11,
    alignSelf: 'center',
    maxWidth: 267,
  },
  deleteButton: {
    marginTop: 33,
  },
  waitButton: {
    marginTop: 32,
  },
});
