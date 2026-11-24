import { colors } from '@moment/shared';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon, Text } from '@/components/ui';
import { ListingCard } from '@/features/home/components/listing-card';
import { Skeleton } from '@/features/home/components/skeleton';
import { HOME } from '@/features/home/layout';
import { useBucketList } from '@/features/home/use-bucket-list';
import { useUserPlace } from '@/features/home/use-user-place';
import { activeFilterChips, decodeFilters, EMPTY_FILTERS, encodeFilters, type SearchFilterState } from '@/features/search/filters';
import { searchWithFilters, type SearchResult } from '@/features/search/search';
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
const BADGE = 20;

export default function SearchResultsScreen() {
  const params = useLocalSearchParams<{ filters?: string }>();
  const filters = useMemo(() => decodeFilters(params.filters), [params.filters]);
  const insets = useSafeAreaInsets();
  const { place, ready } = useUserPlace();
  const bucket = useBucketList();

  const categories = useQuery({ queryKey: ['categories', 'all'], queryFn: () => api.catalog.listCategories() });

  const results = useInfiniteQuery({
    queryKey: ['search', encodeFilters(filters), place.coords?.lat, place.coords?.lng],
    queryFn: ({ pageParam }) => searchWithFilters(filters, categories.data ?? [], place.coords, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset ?? undefined,
    enabled: categories.isSuccess && ready,
  });

  const items = results.data?.pages.flatMap((p) => p.items) ?? [];
  const distanceKm = (id: string) => results.data?.pages.find((p) => p.distances.has(id))?.distances.get(id);
  const chips = activeFilterChips(filters);

  const setFilters = (next: SearchFilterState) => router.setParams({ filters: encodeFilters(next) });
  const openFilters = () => router.push({ pathname: '/search', params: { filters: encodeFilters(filters), from: 'results' } });

  const header = (
    <View>
      <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close search">
        <Icon name="close" size={28} color="secondary" />
      </Pressable>
      <View style={styles.titleRow}>
        <Text variant="h3" color="secondary">
          Search Results
        </Text>
        <Pressable onPress={openFilters} hitSlop={10} accessibilityRole="button" accessibilityLabel="Edit filters">
          <Icon name="filter" />
        </Pressable>
      </View>
      <View style={styles.rule} />
      {chips.length > 0 && (
        <View style={styles.chips}>
          {chips.map((chip) => (
            <View key={chip.key} style={styles.chip}>
              <Text variant="body14" color="secondary">
                {chip.label}
              </Text>
              <Pressable
                onPress={() => setFilters(chip.clear(filters))}
                hitSlop={10}
                style={styles.badge}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${chip.label}`}
              >
                <Icon name="close" size={16} color="white" />
              </Pressable>
            </View>
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
      onPress={() => router.push({ pathname: '/listing/[id]', params: { id: item.id } })}
      onToggleSaved={() => bucket.toggle(item.id)}
    />
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={items}
        keyExtractor={(l) => l.id}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={{ height: GAP.cards }} />}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + GAP.top, paddingBottom: insets.bottom + 24 }]}
        onEndReached={() => results.hasNextPage && !results.isFetchingNextPage && results.fetchNextPage()}
        onEndReachedThreshold={0.6}
        refreshing={results.isRefetching && !results.isFetchingNextPage}
        onRefresh={() => results.refetch()}
        ListEmptyComponent={
          results.isPending || categories.isPending ? (
            <View style={styles.skeletons}>
              <Skeleton width="100%" height={HOME.card.wide.height} radius={HOME.card.radius} />
              <Skeleton width="100%" height={HOME.card.wide.height} radius={HOME.card.radius} />
            </View>
          ) : results.isError || categories.isError ? (
            <View style={styles.state}>
              <Text variant="h4" color="secondary" align="center">
                Couldn’t load results
              </Text>
              <Text variant="body14" color="secondaryTint2" align="center">
                Check your connection and try again.
              </Text>
              <Button label="Try again" size="small" variant="dark" onPress={() => results.refetch()} style={styles.stateButton} />
            </View>
          ) : (
            <View style={styles.state}>
              <Text variant="h4" color="secondary" align="center">
                No matches yet
              </Text>
              <Text variant="body14" color="secondaryTint2" align="center">
                Try removing a filter or searching another city.
              </Text>
              {chips.length > 0 && (
                <Button label="Clear filters" size="small" variant="dark" onPress={() => setFilters(EMPTY_FILTERS)} style={styles.stateButton} />
              )}
            </View>
          )
        }
        ListFooterComponent={results.isFetchingNextPage ? <ActivityIndicator style={styles.more} color={colors.secondary} /> : undefined}
      />
    </View>
  );
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
    marginTop: GAP.ruleToChips,
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 20,
    rowGap: 14,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.secondaryTint5,
  },
  // Figma: a 20pt dark circle with a white cross, over the chip's top-right corner.
  badge: {
    position: 'absolute',
    top: -8,
    right: -12,
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
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
