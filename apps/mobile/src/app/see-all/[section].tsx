import { colors } from '@moment/shared';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon, Text } from '@/components/ui';
import { HostCard } from '@/features/home/components/host-card';
import { ListingCard } from '@/features/home/components/listing-card';
import { Skeleton } from '@/features/home/components/skeleton';
import { HOME } from '@/features/home/layout';
import { useBucketList } from '@/features/home/use-bucket-list';
import type { HostCardData, ListingCardData } from '@/features/home/use-home-data';
import { useUserPlace } from '@/features/home/use-user-place';
import { GroupChip } from '@/features/search/components/group-chip';
import { CATEGORY_GROUPS, hostCategoryLabel } from '@/features/search/filters';
import { isSeeAllKey, SEE_ALL_SECTIONS, type SeeAllKey } from '@/features/see-all/sections';
import { api } from '@/lib/api';

// Figma: "Popular Activites" (18:1085, chip selected 20:1354), "Top Hosts"
// (20:1479), "Just For You" (20:1676) and "Explore" (20:1897). Measured in the
// 428 x 926 frame below the 44pt status bar.
const GAP = {
  top: 16,
  closeToTitle: 30,
  titleToRule: 5,
  ruleToChips: 20,
  chipsToList: 20,
  chips: 16,
  cards: 20,
} as const;
const INSET = 20;
/** Figma's row starts Adventure, Tours, Food, Health & Wellness; the rest follow. */
const CHIP_ORDER = ['adventure', 'tours', 'food', 'wellness'];
const CHIPS = [...CATEGORY_GROUPS].sort(
  (a, b) => (CHIP_ORDER.indexOf(a.key) + 1 || 99) - (CHIP_ORDER.indexOf(b.key) + 1 || 99),
);

/** A Home section's full list, with category chips that filter it in place. */
export default function SeeAllScreen() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  const key: SeeAllKey = isSeeAllKey(section) ? section : 'popular';
  const config = SEE_ALL_SECTIONS[key];
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { place, ready } = useUserPlace();
  const bucket = useBucketList();
  const [group, setGroup] = useState<string | null>(null);
  const city = place.city ?? undefined;

  const categories = useQuery({ queryKey: ['categories', 'all'], queryFn: () => api.catalog.listCategories() });
  const list = useQuery({
    queryKey: ['see-all', key, city],
    queryFn: (): Promise<ListingCardData[] | HostCardData[]> =>
      config.kind === 'hosts' ? config.load() : config.load(city),
    enabled: ready,
  });
  const listings = config.kind === 'listings' ? ((list.data ?? []) as ListingCardData[]) : [];
  const hosts = config.kind === 'hosts' ? ((list.data ?? []) as HostCardData[]) : [];

  const ids = listings.map((l) => l.id);
  const distances = useQuery({
    queryKey: ['see-all', 'distances', place.coords?.lat, place.coords?.lng, ids],
    queryFn: () => api.catalog.listingDistances(place.coords as { lat: number; lng: number }, ids),
    enabled: Boolean(place.coords) && ids.length > 0,
  });

  // Chip filter: listings by category, hosts by what most of their experiences are.
  const selected = CATEGORY_GROUPS.find((g) => g.key === group) ?? null;
  const slugOf = (categoryId: string | null) => categories.data?.find((c) => c.id === categoryId)?.slug;
  const shownListings = selected ? listings.filter((l) => selected.slugs.includes(slugOf(l.category_id) ?? '')) : listings;
  const shownHosts = selected
    ? hosts.filter((h) => h.listings.some((l) => selected.slugs.includes(slugOf(l.listing?.category_id ?? null) ?? '')))
    : hosts;

  const hostWidth = (width - INSET * 2 - HOME.hostGrid.gap) / 2;
  const isPending = list.isPending || categories.isPending;
  const isError = list.isError || categories.isError;

  const header = (
    <View>
      <View style={styles.inset}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
          <Icon name="close" size={28} color="secondary" />
        </Pressable>
        <Text variant="h3" color="secondary" style={styles.title} accessibilityRole="header">
          {config.title}
        </Text>
        <View style={styles.rule} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipRow}>
        {CHIPS.map((g) => (
          <GroupChip
            key={g.key}
            label={g.label}
            icon={g.icon}
            selected={group === g.key}
            onPress={() => setGroup(group === g.key ? null : g.key)}
            onRemove={group === g.key ? () => setGroup(null) : undefined}
          />
        ))}
      </ScrollView>
    </View>
  );

  const empty = isPending ? (
    <View style={[styles.inset, styles.skeletons]}>
      {config.kind === 'hosts' ? (
        <View style={styles.hostRow}>
          <Skeleton width={hostWidth} height={236} radius={15} />
          <Skeleton width={hostWidth} height={236} radius={15} />
        </View>
      ) : (
        [0, 1].map((i) => <Skeleton key={i} width="100%" height={HOME.card[config.card].height} radius={HOME.card.radius} />)
      )}
    </View>
  ) : isError ? (
    <View style={styles.state}>
      <Text variant="h4" color="secondary" align="center">
        Couldn’t load {config.title.toLowerCase()}
      </Text>
      <Text variant="body14" color="secondaryTint2" align="center">
        Check your connection and try again.
      </Text>
      <Button
        label="Try again"
        size="small"
        variant="dark"
        onPress={() => (categories.isError ? categories.refetch() : list.refetch())}
        style={styles.stateButton}
      />
    </View>
  ) : (
    <View style={styles.state}>
      <Text variant="h4" color="secondary" align="center">
        {selected ? `No ${selected.label} here yet` : 'Nothing here yet'}
      </Text>
      <Text variant="body14" color="secondaryTint2" align="center">
        {selected
          ? 'Try another category.'
          : key === 'recent'
            ? 'Experiences you open show up here.'
            : 'Check back soon for new experiences.'}
      </Text>
      {selected && <Button label="Show all" size="small" variant="dark" onPress={() => setGroup(null)} style={styles.stateButton} />}
    </View>
  );

  const common = {
    ListHeaderComponent: header,
    ListEmptyComponent: empty,
    ItemSeparatorComponent: Separator,
    keyExtractor: (item: { id: string }) => item.id,
    contentContainerStyle: { paddingTop: insets.top + GAP.top, paddingBottom: insets.bottom + 24 },
    refreshing: list.isRefetching,
    onRefresh: () => void list.refetch(),
  };

  return (
    <View style={styles.screen}>
      {config.kind === 'hosts' ? (
        <FlatList
          {...common}
          data={shownHosts}
          numColumns={2}
          columnWrapperStyle={[styles.inset, styles.hostRow]}
          renderItem={({ item, index }) => (
            <HostCard
              host={item}
              index={index}
              variant="grid"
              width={hostWidth}
              category={hostCategoryLabel(item, categories.data ?? [])}
              onPress={() => router.push({ pathname: '/host/[id]', params: { id: item.id } })}
            />
          )}
        />
      ) : (
        <FlatList
          {...common}
          data={shownListings}
          renderItem={({ item }) => (
            <View style={styles.inset}>
              <ListingCard
                listing={item}
                size={config.card}
                distanceKm={distances.data?.get(item.id)}
                saved={bucket.isSaved(item.id)}
                onPress={() => router.push({ pathname: '/listing/[id]', params: { id: item.id } })}
                onToggleSaved={() => bucket.toggle(item.id)}
              />
            </View>
          )}
        />
      )}
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
  inset: {
    paddingHorizontal: INSET,
  },
  close: {
    alignSelf: 'flex-start',
  },
  title: {
    marginTop: GAP.closeToTitle,
  },
  rule: {
    marginTop: GAP.titleToRule,
    height: 1,
    backgroundColor: colors.divider,
  },
  // The chip row scrolls sideways to the screen edge; 8pt of it is room for the x badge.
  chipRow: {
    marginTop: GAP.ruleToChips - 8,
    marginBottom: GAP.chipsToList,
  },
  chips: {
    paddingHorizontal: INSET,
    gap: GAP.chips,
  },
  hostRow: {
    flexDirection: 'row',
    gap: HOME.hostGrid.gap,
  },
  skeletons: {
    gap: GAP.cards,
  },
  state: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  stateButton: {
    marginTop: 14,
    alignSelf: 'center',
  },
});
