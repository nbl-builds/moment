import { colors } from '@moment/shared';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon, Text } from '@/components/ui';
import { HostCard } from '@/features/home/components/host-card';
import { ListingCard } from '@/features/home/components/listing-card';
import { Skeleton } from '@/features/home/components/skeleton';
import { HOME } from '@/features/home/layout';
import { useBucketList } from '@/features/home/use-bucket-list';
import { useUserPlace } from '@/features/home/use-user-place';
import type { HostCardData } from '@/features/home/use-home-data';
import { FilterButton } from '@/features/search/components/filter-button';
import { GroupChip } from '@/features/search/components/group-chip';
import {
  activeFilterChips,
  activeFilterCount,
  decodeFilters,
  EMPTY_FILTERS,
  encodeFilters,
  hostCategoryLabel,
  type SearchFilterState,
} from '@/features/search/filters';
import { searchHosts } from '@/features/search/mock';
import { searchWithFilters, type SearchResult } from '@/features/search/search';
import { openHost, openListing } from '@/features/business/navigation';
import { api } from '@/lib/api';

// Figma: "Search Results" (22:2173). Measured in the 428 x 926 frame below the 44pt status bar.
const GAP = {
  top: 16,
  closeToTitle: 30,
  titleToRule: 5,
  ruleToChips: 20,
  chipsToList: 21,
  cards: 20,
} as const;
const INSET = 20;

export default function SearchResultsScreen() {
  const params = useLocalSearchParams<{ filters?: string }>();
  const filters = useMemo(() => decodeFilters(params.filters), [params.filters]);
  const insets = useSafeAreaInsets();
  const { place, ready } = useUserPlace();
  const bucket = useBucketList();

  const categories = useQuery({ queryKey: ['categories', 'all'], queryFn: () => api.catalog.listCategories() });

  const { width } = useWindowDimensions();
  const hostMode = filters.hostedOnly;

  const results = useInfiniteQuery({
    queryKey: ['search', encodeFilters(filters), place.coords?.lat, place.coords?.lng],
    queryFn: ({ pageParam }) => searchWithFilters(filters, categories.data ?? [], place.coords, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset ?? undefined,
    enabled: categories.isSuccess && ready && !hostMode,
  });
  // Filters > Host on: hosts instead of experiences (mock search, see features/search/mock.ts).
  const hosts = useQuery({
    queryKey: ['search-hosts', encodeFilters(filters)],
    queryFn: () => searchHosts(filters, categories.data ?? []),
    enabled: categories.isSuccess && hostMode,
  });
  const active = hostMode ? hosts : results;

  const items = results.data?.pages.flatMap((p) => p.items) ?? [];
  const hostWidth = (width - INSET * 2 - HOME.hostGrid.gap) / 2;
  const distanceKm = (id: string) => results.data?.pages.find((p) => p.distances.has(id))?.distances.get(id);
  const chips = activeFilterChips(filters);

  const setFilters = (next: SearchFilterState) => router.setParams({ filters: encodeFilters(next) });
  const openFilters = () => router.push({ pathname: '/filters', params: { filters: encodeFilters(filters), from: 'results' } });

  const header = (
    <View>
      <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close search">
        <Icon name="close" size={28} color="secondary" />
      </Pressable>
      <View style={styles.titleRow}>
        <Text variant="h3" color="secondary">
          Search Results
        </Text>
        <FilterButton count={activeFilterCount(filters)} onPress={openFilters} />
      </View>
      <View style={styles.rule} />
      {chips.length > 0 && (
        <View style={styles.chips}>
          {chips.map((chip) => (
            <GroupChip key={chip.key} label={chip.label} onRemove={() => setFilters(chip.clear(filters))} />
          ))}
        </View>
      )}
      <View style={styles.listGap} />
    </View>
  );

  const renderItem = ({ item }: { item: SearchResult }) => (
    <ListingCard
      listing={item}
      size="wide"
      distanceKm={distanceKm(item.id)}
      saved={bucket.isSaved(item.id)}
      onPress={() => openListing(item)}
      onToggleSaved={() => bucket.toggle(item.id)}
    />
  );

  const renderHost = ({ item, index }: { item: HostCardData; index: number }) => (
    <HostCard
      host={item}
      index={index}
      variant="grid"
      width={hostWidth}
      category={hostCategoryLabel(item, categories.data ?? [])}
      onPress={() => openHost(item)}
    />
  );

  // Shared by the listing list and the host grid.
  const common = {
    keyExtractor: (item: { id: string }) => item.id,
    ListHeaderComponent: header,
    ItemSeparatorComponent: Separator,
    contentContainerStyle: [styles.content, { paddingTop: insets.top + GAP.top, paddingBottom: insets.bottom + 24 }],
    refreshing: active.isRefetching && !results.isFetchingNextPage,
    onRefresh: () => void active.refetch(),
    ListEmptyComponent:
        active.isPending || categories.isPending ? (
          <View style={styles.skeletons}>
            <Skeleton width="100%" height={HOME.card.wide.height} radius={HOME.card.radius} />
            <Skeleton width="100%" height={HOME.card.wide.height} radius={HOME.card.radius} />
          </View>
        ) : active.isError || categories.isError ? (
          <View style={styles.state}>
            <Text variant="h4" color="secondary" align="center">
              Couldn’t load results
            </Text>
            <Text variant="body14" color="secondaryTint2" align="center">
              Check your connection and try again.
            </Text>
            <Button label="Try again" size="small" variant="dark" onPress={() => (categories.isError ? categories.refetch() : active.refetch())} style={styles.stateButton} />
          </View>
        ) : (
          <View style={styles.state}>
            <Text variant="h4" color="secondary" align="center">
              {hostMode ? 'No hosts match' : 'No matches yet'}
            </Text>
            <Text variant="body14" color="secondaryTint2" align="center">
              Try removing a filter or searching another city.
            </Text>
            {chips.length > 0 && (
              <Button label="Clear filters" size="small" variant="dark" onPress={() => setFilters({ ...EMPTY_FILTERS, query: activeFilterCount(filters) > 0 ? filters.query : null })} style={styles.stateButton} />
            )}
          </View>
        ),
  };

  return (
    <View style={styles.screen}>
      {hostMode ? (
        <FlatList key="hosts" data={hosts.data ?? []} renderItem={renderHost} numColumns={2} columnWrapperStyle={styles.hostRow} {...common} />
      ) : (
        <FlatList
          key="listings"
          data={items}
          renderItem={renderItem}
          {...common}
          onEndReached={() => results.hasNextPage && !results.isFetchingNextPage && results.fetchNextPage()}
          onEndReachedThreshold={0.6}
          ListFooterComponent={results.isFetchingNextPage ? <ActivityIndicator style={styles.more} color={colors.secondary} /> : undefined}
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
  content: {
    paddingHorizontal: INSET,
  },
  titleRow: {
    marginTop: GAP.closeToTitle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rule: {
    marginTop: GAP.titleToRule,
    height: 1,
    backgroundColor: colors.divider,
  },
  chips: {
    marginTop: GAP.ruleToChips - 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 20,
    rowGap: 6,
  },
  hostRow: {
    gap: HOME.hostGrid.gap,
  },
  listGap: {
    height: GAP.chipsToList,
  },
  skeletons: {
    gap: GAP.cards,
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
  more: {
    marginTop: 20,
  },
});
