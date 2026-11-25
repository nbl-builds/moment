import { colors, formatPrice, LAUNCH_CITY_CENTRES, type LaunchCity } from '@moment/shared';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { router, Stack } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { MapFallback } from '@/components/map-fallback';
import { MAPS_AVAILABLE } from '@/lib/env';
import Animated, { interpolate, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showToast } from '@/components/toast';
import { Icon, Text } from '@/components/ui';
import { openBusiness, openListing } from '@/features/business/navigation';
import { boxOf, clusterPoints, movedEnough, type Region } from '@/features/explore/cluster';
import { MapPin } from '@/features/explore/map-pin';
import { ResultsPanel, STRIP_HEIGHT } from '@/features/explore/panel';
import { exploreStore, useExplore, type ExploreMode } from '@/features/explore/store';
import { ListingCard } from '@/features/home/components/listing-card';
import { ServiceBusinessCard } from '@/features/home/components/service-business-card';
import { useBucketList } from '@/features/home/use-bucket-list';
import { useUserPlace } from '@/features/home/use-user-place';
import { GroupChip } from '@/features/search/components/group-chip';
import { activeFilterCount, CATEGORY_GROUPS, encodeFilters } from '@/features/search/filters';
import { api } from '@/lib/api';

const INSET = 20;
/** Figma: the header (search + chips) ends at y170 in the 926 frame; 44 of it is the status bar. */
const HEADER_BELOW_STATUS = 126;
const DEFAULT_DELTA = 0.18;
const CHIP_ORDER = ['adventure', 'tours', 'food', 'wellness', 'beauty', 'entertainment', 'art'];

type ExperienceResult = Awaited<ReturnType<typeof api.catalog.exploreListings>>[number];
type BusinessResult = Awaited<ReturnType<typeof api.catalog.exploreBusinesses>>[number];
type Result = { mode: 'experiences'; item: ExperienceResult } | { mode: 'businesses'; item: BusinessResult };

/**
 * Explore (48:2341 / 52:10292 map, 52:9860 / 52:10435 list): full screen
 * from the tab bar's Explore button. Experiences ("Hosts") or service
 * businesses on a map, filtered like Search, with the same results in a list.
 */
export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const queryClient = useQueryClient();
  const { place } = useUserPlace();
  const { mode, filters } = useExplore();
  const bucket = useBucketList();
  const mapRef = useRef<MapView>(null);

  const start = useMemo<Region>(() => {
    const centre = place.coords ?? LAUNCH_CITY_CENTRES[(place.city as LaunchCity) ?? 'Islamabad'] ?? LAUNCH_CITY_CENTRES.Islamabad;
    return { latitude: centre.lat, longitude: centre.lng, latitudeDelta: DEFAULT_DELTA, longitudeDelta: DEFAULT_DELTA };
    // The first place we know is where the map opens; later moves are the user's.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [region, setRegion] = useState<Region>(start);
  const [searched, setSearched] = useState<Region>(start);
  const [selected, setSelected] = useState<string | null>(null);
  // Without a map (Android builds with no Google Maps key) the list opens expanded.
  const [expanded, setExpanded] = useState(!MAPS_AVAILABLE);
  const progress = useSharedValue(MAPS_AVAILABLE ? 0 : 1);

  const categories = useQuery({ queryKey: ['categories', 'all'], queryFn: () => api.catalog.listCategories() });
  const kind = mode === 'experiences' ? 'experience' : 'service';
  const kindSlugs = new Set((categories.data ?? []).filter((c) => c.kind === kind).map((c) => c.slug));
  const chips = CATEGORY_GROUPS.filter((g) => g.slugs.some((s) => kindSlugs.has(s))).sort(
    (a, b) => CHIP_ORDER.indexOf(a.key) - CHIP_ORDER.indexOf(b.key),
  );
  const pickedSlugs = CATEGORY_GROUPS.filter((g) => filters.categoryGroups.includes(g.key)).flatMap((g) => g.slugs);
  const pickedIds = (categories.data ?? []).filter((c) => pickedSlugs.includes(c.slug)).map((c) => c.id);

  const results = useQuery({
    queryKey: ['explore', mode, boxOf(searched), filters, pickedIds, place.coords?.lat, place.coords?.lng],
    queryFn: async (): Promise<Result[]> => {
      const box = boxOf(searched);
      if (mode === 'experiences') {
        const items = await api.catalog.exploreListings({
          box,
          categoryIds: pickedIds,
          query: filters.query ?? undefined,
          minPrice: filters.minPrice ?? undefined,
          maxPrice: filters.maxPrice ?? undefined,
          minRating: filters.minRating ?? undefined,
          user: place.coords,
        });
        return items.map((item) => ({ mode: 'experiences', item }));
      }
      const items = await api.catalog.exploreBusinesses({
        box,
        categorySlugs: pickedSlugs,
        query: filters.query ?? undefined,
        minRating: filters.minRating ?? undefined,
        user: place.coords,
      });
      return items.map((item) => ({ mode: 'businesses', item }));
    },
    enabled: categories.isSuccess || filters.categoryGroups.length === 0,
    placeholderData: keepPreviousData,
  });
  const list = results.data ?? [];
  const points = list.map((r) => ({ id: r.item.id, lat: r.item.lat, lng: r.item.lng }));
  const clusters = clusterPoints(points, region);
  const selectedResult = list.find((r) => r.item.id === selected) ?? null;
  const showSearchHere = movedEnough(region, searched);

  // A new mode or filter clears the selection (reset during render, not in an effect).
  const [selectionFor, setSelectionFor] = useState({ mode, filters });
  if (selectionFor.mode !== mode || selectionFor.filters !== filters) {
    setSelectionFor({ mode, filters });
    setSelected(null);
  }

  const headerBottom = insets.top + HEADER_BELOW_STATUS;
  const travel = height - headerBottom;

  const close = () => {
    exploreStore.reset();
    router.back();
  };

  const switchMode = () => {
    const next: ExploreMode = mode === 'experiences' ? 'businesses' : 'experiences';
    // Keep only the categories that exist in the other mode (Food has no service businesses).
    const nextSlugs = new Set((categories.data ?? []).filter((c) => c.kind === (next === 'experiences' ? 'experience' : 'service')).map((c) => c.slug));
    const valid = CATEGORY_GROUPS.filter((g) => g.slugs.some((x) => nextSlugs.has(x))).map((g) => g.key);
    const kept = filters.categoryGroups.filter((k) => valid.includes(k));
    if (kept.length !== filters.categoryGroups.length) exploreStore.setFilters({ ...filters, categoryGroups: kept });
    exploreStore.setMode(next);
  };

  const toggleChip = (key: string) =>
    exploreStore.setFilters({
      ...filters,
      categoryGroups: filters.categoryGroups.includes(key) ? filters.categoryGroups.filter((k) => k !== key) : [...filters.categoryGroups, key],
    });

  const locate = async () => {
    let { status } = await Location.getForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) status = (await Location.requestForegroundPermissionsAsync()).status;
    let centre: { lat: number; lng: number } | null = null;
    if (status === Location.PermissionStatus.GRANTED) {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
      if (pos) centre = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      void queryClient.invalidateQueries({ queryKey: ['device-location'] });
    }
    if (!centre) {
      const city = (place.city as LaunchCity) ?? 'Islamabad';
      centre = LAUNCH_CITY_CENTRES[city] ?? LAUNCH_CITY_CENTRES.Islamabad;
      showToast(`Location is off. Showing ${place.city ?? 'Islamabad'}.`);
    }
    const next = { latitude: centre.lat, longitude: centre.lng, latitudeDelta: 0.08, longitudeDelta: 0.08 };
    mapRef.current?.animateToRegion(next, 500);
    setSearched(next);
  };

  const zoomInto = (lat: number, lng: number) => {
    const next = { latitude: lat, longitude: lng, latitudeDelta: region.latitudeDelta / 3, longitudeDelta: region.longitudeDelta / 3 };
    mapRef.current?.animateToRegion(next, 400);
  };

  const openResult = (r: Result) =>
    r.mode === 'experiences' ? openListing(r.item) : openBusiness(r.item.slug);

  const controlsStyle = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0, 0.4], [1, 0], 'clamp') }));
  const filterCount = activeFilterCount(filters);

  return (
    <View style={styles.screen}>
      {/* Map drags must not trigger the stack's swipe-back; the X closes Explore. */}
      <Stack.Screen options={{ gestureEnabled: false, fullScreenGestureEnabled: false }} />
      {MAPS_AVAILABLE ? (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={start}
          onRegionChangeComplete={(r) => setRegion(r)}
          onPress={(e) => {
            // iOS also reports marker taps here.
            if (e.nativeEvent.action !== 'marker-press') setSelected(null);
          }}
          showsUserLocation={Boolean(place.coords)}
          showsPointsOfInterests={false}
          showsBuildings={false}
          showsCompass={false}
          toolbarEnabled={false}
          userInterfaceStyle="light"
          mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
          mapPadding={{ top: headerBottom, right: 0, bottom: STRIP_HEIGHT + insets.bottom, left: 0 }}
          accessibilityLabel={`Map with ${list.length} ${mode === 'experiences' ? 'experiences' : 'businesses'}`}
        >
          {clusters.map((c) =>
            c.kind === 'pin' ? (
              <Marker
                // Remount when selected so the snapshot redraws (tracksViewChanges is off for speed).
                key={`${c.key}-${c.point.id === selected ? 'on' : 'off'}`}
                coordinate={{ latitude: c.lat, longitude: c.lng }}
                anchor={{ x: 0.5, y: 1 }}
                onPress={(e) => {
                  e.stopPropagation();
                  setSelected(c.point.id);
                }}
                tracksViewChanges={false}
                accessibilityLabel={resultTitle(list.find((r) => r.item.id === c.point.id))}
                zIndex={c.point.id === selected ? 2 : 1}
              >
                <MapPin selected={c.point.id === selected} />
              </Marker>
            ) : (
              <Marker
                key={c.key}
                coordinate={{ latitude: c.lat, longitude: c.lng }}
                onPress={(e) => {
                  e.stopPropagation();
                  zoomInto(c.lat, c.lng);
                }}
                tracksViewChanges={false}
                accessibilityLabel={`${c.points.length} places here. Zoom in`}
              >
                <View style={styles.cluster}>
                  <Text variant="subText14" weight="bold" color="white">
                    {c.points.length}
                  </Text>
                </View>
              </Marker>
            ),
          )}
        </MapView>
      ) : (
        <MapFallback hint="Browse the list below; the map comes to Android soon." style={{ paddingBottom: 200 }} />
      )}

      {/* Map controls: search this area, selected card, locate, mode switch */}
      <Animated.View style={[StyleSheet.absoluteFill, { pointerEvents: expanded ? 'none' : 'box-none' }, controlsStyle]}>
        {showSearchHere && (
          <Pressable
            onPress={() => setSearched(region)}
            style={[styles.searchHere, { top: headerBottom + 14 }]}
            accessibilityRole="button"
          >
            {results.isFetching ? <ActivityIndicator size="small" color={colors.white} /> : <Icon name="search" size={16} color="white" />}
            <Text variant="subText14" weight="semibold" color="white">
              Search this area
            </Text>
          </Pressable>
        )}
        <View style={[styles.bottomControls, { bottom: STRIP_HEIGHT + insets.bottom + 10, pointerEvents: 'box-none' }]}>
          <Pressable onPress={() => void locate()} style={styles.locate} accessibilityRole="button" accessibilityLabel="Show my location">
            <Icon name="locate" size={24} color="secondary" />
          </Pressable>
          {selectedResult ? (
            <ResultCard result={selectedResult} onPress={() => openResult(selectedResult)} onClose={() => setSelected(null)} />
          ) : (
            <View style={styles.modeWrap}>
              <Pressable
                onPress={switchMode}
                style={styles.mode}
                accessibilityRole="button"
                accessibilityLabel={`Showing ${mode === 'experiences' ? 'hosts and experiences' : 'businesses'}. ${modeHint(mode)}`}
              >
                <Icon name="arrow-up-down" size={24} color="white" />
                <Text variant="subText14" weight="medium" color="white">
                  {mode === 'experiences' ? 'Hosts' : 'Businesses'}
                </Text>
              </Pressable>
              <View style={styles.hint}>
                <Text variant="subText10" color="white">
                  {modeHint(mode)}
                </Text>
              </View>
            </View>
          )}
        </View>
      </Animated.View>

      {/* Results list and the bottom strip */}
      <View style={[styles.panelArea, { top: headerBottom, pointerEvents: 'box-none' }]}>
        <ResultsPanel
          expanded={expanded}
          onExpandedChange={setExpanded}
          travel={travel}
          bottomInset={insets.bottom}
          progress={progress}
          lockedNote={MAPS_AVAILABLE ? undefined : 'Map coming soon'}
        >
          <FlatList
            data={list}
            keyExtractor={(r) => r.item.id}
            contentContainerStyle={{ paddingTop: 20, paddingBottom: STRIP_HEIGHT + insets.bottom + 20, paddingHorizontal: INSET, gap: 20 }}
            ListEmptyComponent={
              results.isPending ? (
                <ActivityIndicator style={styles.empty} color={colors.secondary} />
              ) : (
                <Text variant="body14" weight="medium" color="secondaryTint2" align="center" style={styles.empty}>
                  Nothing here yet. Move the map or change the filters.
                </Text>
              )
            }
            renderItem={({ item: r }) =>
              r.mode === 'experiences' ? (
                <ListingCard
                  listing={r.item}
                  size="wide"
                  distanceKm={r.item.distance_km ?? undefined}
                  saved={bucket.isSaved(r.item.id)}
                  onPress={() => openResult(r)}
                  onToggleSaved={() => bucket.toggle(r.item.id)}
                />
              ) : (
                <ServiceBusinessCard
                  business={r.item}
                  size="wideShort"
                  saved={bucket.isBusinessSaved(r.item.id)}
                  onPress={() => openResult(r)}
                  onToggleSaved={() => bucket.toggleBusiness(r.item.id)}
                />
              )
            }
          />
        </ResultsPanel>
      </View>

      {/* Header: close, search, filters, category chips */}
      <View style={[styles.header, { paddingTop: insets.top + 6, height: headerBottom }]}>
        <View style={styles.searchRow}>
          <Pressable onPress={close} style={styles.close} accessibilityRole="button" accessibilityLabel="Close Explore">
            <Icon name="close-thin" size={24} color="secondary" />
          </Pressable>
          <Pressable
            onPress={() => router.push({ pathname: '/search', params: { from: 'explore' } })}
            style={styles.search}
            accessibilityRole="search"
            accessibilityLabel={filters.query ? `Search: ${filters.query}` : 'Search. Where are you going?'}
          >
            <Icon name="search" size={24} color="secondaryTint3" />
            <View style={styles.searchText}>
              <Text variant="body14" weight="medium" color="secondary" numberOfLines={1}>
                {filters.query ?? 'Search'}
              </Text>
              <Text variant="body10" color="secondaryTint1" numberOfLines={1}>
                {filters.query ? 'Tap to change' : 'Where are you going?'}
              </Text>
            </View>
            {filters.query && (
              <Pressable
                onPress={() => exploreStore.setFilters({ ...filters, query: null })}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Icon name="close" size={18} color="secondaryTint3" />
              </Pressable>
            )}
            <Pressable
              onPress={() => router.push({ pathname: '/filters', params: { filters: encodeFilters(filters), from: 'explore' } })}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={filterCount ? `Filters, ${filterCount} on` : 'Filters'}
            >
              <Icon name="sliders" size={24} color="secondary" />
              {filterCount > 0 && <View style={styles.filterDot} />}
            </Pressable>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipRow}>
          {chips.map((g) => {
            const on = filters.categoryGroups.includes(g.key);
            return (
              <GroupChip key={g.key} label={g.label} icon={g.icon} selected={on} onPress={() => toggleChip(g.key)} onRemove={on ? () => toggleChip(g.key) : undefined} />
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const modeHint = (mode: ExploreMode) => (mode === 'experiences' ? 'Tap to switch to business services' : 'Tap to switch to experiences');

function resultTitle(r: Result | undefined) {
  if (!r) return 'Place';
  return r.mode === 'experiences' ? r.item.title : r.item.name;
}

/** Compact card for the tapped pin, above the bottom panel (no Figma frame). */
function ResultCard({ result: r, onPress, onClose }: { result: Result; onPress: () => void; onClose: () => void }) {
  const photo = api.media.url(r.mode === 'experiences' ? r.item.media[0]?.url : r.item.cover_url);
  const title = resultTitle(r);
  const rating = Number(r.item.rating_avg);
  const price = r.mode === 'experiences' ? formatPrice(r.item.price_amount, { currency: r.item.currency }) : `From ${formatPrice(r.item.from_price)}`;
  const sub = r.mode === 'experiences' ? (r.item.price_unit === 'per_booking' ? 'per booking' : 'per person') : r.item.category_name;
  const km = r.item.distance_km;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={`${title}, ${price}. Opens details`}>
      <View style={styles.cardPhoto}>{photo && <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" />}</View>
      <View style={styles.cardText}>
        <Text variant="body15" weight="bold" color="secondary" numberOfLines={2}>
          {title}
        </Text>
        <View style={styles.cardMeta}>
          {r.item.rating_count > 0 && (
            <>
              <Icon name="star" size={14} />
              <Text variant="body12" weight="semibold" color="secondaryTint2">
                {rating.toFixed(1)}
              </Text>
            </>
          )}
          {km !== null && km !== undefined && (
            <Text variant="body12" weight="medium" color="secondaryTint2">
              {' '}
              · {Number(km).toFixed(1)} km
            </Text>
          )}
        </View>
        <Text variant="subText14" weight="extrabold" color="price">
          {price}{' '}
          <Text variant="body10" color="secondaryTint2">
            {sub}
          </Text>
        </Text>
      </View>
      <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close card" style={styles.cardClose}>
        <Icon name="close" size={18} color="secondaryTint3" />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.backgroundMuted,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: INSET,
    gap: 16,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    gap: 11,
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchText: {
    flex: 1,
  },
  filterDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.badge,
  },
  chipRow: {
    marginTop: 12,
  },
  chips: {
    paddingHorizontal: INSET,
    paddingTop: 8,
    gap: 16,
  },
  panelArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  searchHere: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary,
  },
  bottomControls: {
    position: 'absolute',
    left: INSET,
    right: INSET,
    alignItems: 'center',
    gap: 14,
  },
  locate: {
    alignSelf: 'flex-end',
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeWrap: {
    alignItems: 'center',
    gap: 4,
  },
  mode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 15,
    backgroundColor: colors.secondary,
  },
  hint: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: colors.scrim,
  },
  cluster: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 8,
    backgroundColor: colors.secondary,
    borderWidth: 3,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 12,
    padding: 10,
    borderRadius: 15,
    backgroundColor: colors.surface,
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  pressed: {
    opacity: 0.9,
  },
  cardPhoto: {
    width: 84,
    height: 84,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.secondaryTint6,
  },
  cardText: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
    paddingRight: 18,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  cardClose: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  empty: {
    marginTop: 40,
    marginHorizontal: 20,
  },
});
