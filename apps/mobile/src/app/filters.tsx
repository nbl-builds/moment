import { colors } from '@moment/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { exploreStore } from '@/features/explore/store';
import { BottomSheet } from '@/components/bottom-sheet';
import { PickerSheet } from '@/components/picker-sheet';
import { RangeCalendar } from '@/components/range-calendar';
import { Button, Icon, Input, RangeSlider, Slider, Text, Toggle } from '@/components/ui';
import { useUserPlace } from '@/features/home/use-user-place';
import {
  CATEGORY_GROUPS,
  datesLabel,
  decodeFilters,
  DESTINATION_OPTIONS,
  destinationLabel,
  destinationValue,
  parseDestination,
  DISTANCE,
  distanceLabel,
  EMPTY_FILTERS,
  encodeFilters,
  LANGUAGES,
  languageLabel,
  PRICE,
  priceLabel,
  RATING,
  ratingLabel,
  type SearchFilterState,
} from '@/features/search/filters';

// Figma: "Search Filter" (20:3702) / "Search Filter Long" (22:1336), with the
// "Select Location" (22:1475), "Select Date" (22:1789) and "Select Language"
// (22:2017) sheets. Measured in the 428 x 926 frame below the 44pt status bar.
const GAP = {
  top: 16,
  closeToTitle: 30,
  titleToRule: 5,
  card: 20,
  cardPadding: 20,
  chipGap: 14,
  field: 20,
  sliderToValue: 10,
  labelToSlider: 10,
  applyAboveSafeArea: 11,
} as const;
const INSET = 20;
const CARD_RADIUS = 15;

type Sheet = 'location' | 'date' | 'language' | null;

/**
 * Filters. Opened from Home (filter icon), Search (filter icon, keeps the
 * typed text) and Search Results (filter icon, prefilled). Apply shows the results.
 */
export default function FiltersScreen() {
  const params = useLocalSearchParams<{ filters?: string; from?: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [f, setF] = useState<SearchFilterState>(() => decodeFilters(params.filters));
  const [sheet, setSheet] = useState<Sheet>(null);
  const { place } = useUserPlace();
  const hasLocation = place.coords !== null;

  const update = (patch: Partial<SearchFilterState>) => setF((s) => ({ ...s, ...patch }));
  const toggleGroup = (key: string) =>
    update({ categoryGroups: f.categoryGroups.includes(key) ? f.categoryGroups.filter((k) => k !== key) : [...f.categoryGroups, key] });

  const apply = () => {
    // From Explore: filter the map and list in place.
    if (params.from === 'explore') {
      exploreStore.setFilters(f);
      router.back();
      return;
    }
    const href = { pathname: '/search-results', params: { filters: encodeFilters(f) } } as const;
    // From Search Results: go back to it with the new filters. From Home: show results in place of Filters.
    if (params.from === 'results') router.dismissTo(href);
    else router.replace(href);
  };

  const dirty = encodeFilters({ ...f, query: null }) !== encodeFilters(EMPTY_FILTERS);
  // Three chips per row inside the card (Figma: 106pt each, 14pt apart).
  const chipWidth = (width - INSET * 2 - GAP.cardPadding * 2 - GAP.chipGap * 2) / 3;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + GAP.top, paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close filters">
            <Icon name="close" size={28} color="secondary" />
          </Pressable>
          {/* Reset keeps the search text: it clears the filters only. */}
          <Pressable
            onPress={() => setF({ ...EMPTY_FILTERS, query: f.query })}
            disabled={!dirty}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityState={{ disabled: !dirty }}
          >
            <Text variant="body14" weight="semibold" color={dirty ? 'secondary' : 'textDisabled'}>
              Reset
            </Text>
          </Pressable>
        </View>
        <Text variant="h3" color="secondary" style={styles.title}>
          Filters
        </Text>
        <View style={styles.rule} />

        <View style={[styles.card, styles.hostCard]}>
          <Text variant="body18" weight="bold" color="secondary">
            Host
          </Text>
          <Toggle value={f.hostedOnly} onChange={(v) => update({ hostedOnly: v })} accessibilityLabel="Show hosts instead of experiences" />
        </View>

        <View style={[styles.card, styles.padded]}>
          <Text variant="body18" weight="bold" color="secondary">
            Pick Category
          </Text>
          <View style={styles.chips}>
            {CATEGORY_GROUPS.map((g, i) => {
              const selected = f.categoryGroups.includes(g.key);
              const wide = i === CATEGORY_GROUPS.length - 1;
              return (
                <Pressable
                  key={g.key}
                  onPress={() => toggleGroup(g.key)}
                  style={[styles.chip, wide ? styles.chipWide : { width: chipWidth }, selected && styles.chipSelected]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={g.label}
                >
                  <Icon name={g.icon} color="secondary" />
                  <Text variant="body12" color="secondary" numberOfLines={1}>
                    {g.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, styles.padded, styles.detailsCard]}>
          <Input
            label="Destination"
            placeholder="Select your location"
            value={destinationLabel(f) ?? ''}
            onPress={() => setSheet('location')}
            trailing={<Icon name="chevron-left" color="secondary" style={styles.flip} />}
          />

          <Text variant="body14" weight="medium" color="secondary" style={styles.fieldLabel}>
            Distance
          </Text>
          <View style={styles.slider}>
            <Slider
              value={f.maxDistanceKm ?? DISTANCE.max}
              min={DISTANCE.min}
              max={DISTANCE.max}
              step={DISTANCE.step}
              onChange={(v) => update({ maxDistanceKm: v >= DISTANCE.max ? null : v })}
              disabled={!hasLocation}
              accessibilityLabel="Distance"
              accessibilityValueText={distanceLabel(f.maxDistanceKm)}
            />
          </View>
          <Text variant="body15" weight="bold" color="secondary" style={styles.value}>
            {distanceLabel(f.maxDistanceKm)}
          </Text>
          {!hasLocation && (
            <Text variant="body12" color="secondaryTint2">
              Allow location to filter by distance.
            </Text>
          )}

          <Text variant="body14" weight="medium" color="secondary" style={styles.fieldLabel}>
            Price Range
          </Text>
          <View style={styles.slider}>
            <RangeSlider
              low={f.minPrice ?? PRICE.min}
              high={f.maxPrice ?? PRICE.max}
              min={PRICE.min}
              max={PRICE.max}
              step={PRICE.step}
              onChange={(lo, hi) => update({ minPrice: lo <= PRICE.min ? null : lo, maxPrice: hi >= PRICE.max ? null : hi })}
              accessibilityLabel="Price range"
              lowValueText={priceLabel(f.minPrice ?? PRICE.min, null)}
              highValueText={f.maxPrice === null ? 'No maximum' : priceLabel(null, f.maxPrice)}
            />
          </View>
          <Text variant="body15" weight="bold" color="secondary" style={styles.value}>
            {priceLabel(f.minPrice, f.maxPrice)}
          </Text>

          <Text variant="body14" weight="medium" color="secondary" style={styles.fieldLabel}>
            Rating
          </Text>
          <View style={styles.slider}>
            <Slider
              value={f.minRating ?? RATING.min}
              min={RATING.min}
              max={RATING.max}
              step={RATING.step}
              onChange={(v) => update({ minRating: v <= RATING.min ? null : v })}
              accessibilityLabel="Minimum rating"
              accessibilityValueText={ratingLabel(f.minRating)}
            />
          </View>
          <Text variant="body15" weight="bold" color="secondary" style={styles.value}>
            {ratingLabel(f.minRating)}
          </Text>

          <Input
            style={styles.field}
            label="Date"
            placeholder="Select your day"
            value={datesLabel(f.dates) ?? ''}
            onPress={() => setSheet('date')}
            trailing={<Icon name="chevron-left" color="secondary" style={styles.flip} />}
          />
          <Input
            style={styles.field}
            label="Language"
            placeholder="Select your language"
            value={languageLabel(f.language) ?? ''}
            onPress={() => setSheet('language')}
            trailing={<Icon name="chevron-left" color="secondary" style={styles.flip} />}
          />
        </View>
      </ScrollView>

      <Button label="Apply Filters" onPress={apply} style={[styles.apply, { bottom: insets.bottom + GAP.applyAboveSafeArea }]} />

      <PickerSheet
        visible={sheet === 'location'}
        title="Choose a destination"
        searchPlaceholder="Search cities or areas"
        options={DESTINATION_OPTIONS}
        selected={f.city ? destinationValue(f.city, f.area) : null}
        anyLabel="Anywhere"
        onSelect={(value) => update(parseDestination(value))}
        onClose={() => setSheet(null)}
      />
      <PickerSheet
        visible={sheet === 'language'}
        title="Select Language"
        searchPlaceholder="Search languages"
        options={LANGUAGES.map((l) => ({ value: l.code, label: l.label }))}
        selected={f.language}
        anyLabel="Any language"
        onSelect={(language) => update({ language })}
        onClose={() => setSheet(null)}
      />
      <BottomSheet
        visible={sheet === 'date'}
        onRequestClose={() => setSheet(null)}
        accessibilityLabel="Select Date"
        backgroundColor={colors.backgroundMuted}
      >
        <View style={[styles.dateSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.dateHeader}>
            <Text variant="h4" color="secondary" align="center">
              Select Date
            </Text>
            <Pressable onPress={() => setSheet(null)} hitSlop={10} style={styles.dateClose} accessibilityRole="button" accessibilityLabel="Close">
              <Icon name="x" size={28} />
            </Pressable>
          </View>
          <View style={styles.calendar}>
            <RangeCalendar
              value={f.dates}
              onChange={(dates) => {
                update({ dates });
                setSheet(null);
              }}
            />
          </View>
          {f.dates && (
            <Button
              label="Clear dates"
              variant="ghost"
              size="small"
              onPress={() => {
                update({ dates: null });
                setSheet(null);
              }}
              style={styles.clearDates}
            />
          )}
        </View>
      </BottomSheet>
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    marginTop: GAP.closeToTitle,
  },
  rule: {
    marginTop: GAP.titleToRule,
    height: 1,
    backgroundColor: colors.divider,
  },
  card: {
    marginTop: GAP.card,
    borderRadius: CARD_RADIUS,
    backgroundColor: colors.white,
  },
  hostCard: {
    height: 60,
    paddingHorizontal: GAP.cardPadding,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  padded: {
    padding: GAP.cardPadding,
    paddingBottom: GAP.cardPadding - 1,
  },
  detailsCard: {
    paddingBottom: 25,
  },
  chips: {
    marginTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP.chipGap,
  },
  chip: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.secondaryTint5,
  },
  chipWide: {
    paddingHorizontal: 24,
  },
  chipSelected: {
    borderColor: colors.secondary,
  },
  fieldLabel: {
    marginTop: GAP.field,
  },
  slider: {
    marginTop: GAP.labelToSlider,
  },
  value: {
    marginTop: GAP.sliderToValue,
  },
  field: {
    marginTop: GAP.field,
  },
  flip: {
    transform: [{ rotate: '180deg' }],
  },
  apply: {
    position: 'absolute',
    left: INSET,
    right: INSET,
  },
  dateSheet: {
    paddingTop: 20,
    paddingHorizontal: 18,
  },
  dateHeader: {
    justifyContent: 'center',
    minHeight: 28,
  },
  dateClose: {
    position: 'absolute',
    right: 2,
  },
  calendar: {
    marginTop: 28,
  },
  clearDates: {
    alignSelf: 'center',
    marginTop: 8,
  },
});
