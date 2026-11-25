import { colors, formatShortDateTime } from '@moment/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton, Button, Icon, Text } from '@/components/ui';
import { BookingSheet } from '@/features/booking/components/booking-sheet';
import { BusinessCard } from '@/features/booking/components/business-card';
import { BOOKINGS } from '@/features/bookings/layout';
import { useBookingHistory, type BookingRow } from '@/features/bookings/queries';
import { statusLabel } from '@/features/bookings/status';
import { Skeleton } from '@/features/home/components/skeleton';

const B = BOOKINGS;
const DAY_MS = 86_400_000;

type Range = { key: string; label: string; test: (b: BookingRow) => boolean };

/** Filter options (47:6282): fixed ranges, then one per year that has bookings. */
function rangesFor(bookings: BookingRow[], now: number): Range[] {
  const years = [...new Set(bookings.map((b) => yearOf(b.starts_at)))].sort((a, b) => b - a);
  return [
    { key: 'all', label: 'All Bookings', test: () => true },
    { key: '30d', label: 'Last 30 days', test: (b) => withinDays(b, now, 30) },
    { key: '3m', label: 'Last 3 months', test: (b) => withinDays(b, now, 91) },
    ...years.map((y) => ({ key: String(y), label: String(y), test: (b: BookingRow) => yearOf(b.starts_at) === y })),
  ];
}

/** Booking dates in Pakistan time. */
const yearOf = (iso: string) => Number(formatShortDateTime(iso).split(' ')[0]?.split('/')[2]);
/** Upcoming bookings count as recent too; "last N days" looks back from now. */
const withinDays = (b: BookingRow, now: number, days: number) => new Date(b.starts_at).getTime() >= now - days * DAY_MS;

/** All Bookings (52:9094): full history, newest first, with the Filter sheet (47:6282). */
export default function AllBookingsScreen() {
  const insets = useSafeAreaInsets();
  const history = useBookingHistory();
  const [now] = useState(() => Date.now());
  const [rangeKey, setRangeKey] = useState('all');
  const [filtering, setFiltering] = useState(false);

  const all = history.data ?? [];
  const ranges = rangesFor(all, now);
  const range = ranges.find((r) => r.key === rangeKey) ?? ranges[0]!;
  const shown = all.filter(range.test);

  const header = (
    <View style={styles.inset}>
      <BackButton />
      <View style={styles.titleRow}>
        <Text variant="h3" color="secondary" accessibilityRole="header">
          All Bookings
        </Text>
        <Pressable
          onPress={() => setFiltering(true)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Filter, ${range.label}`}
        >
          <Icon name="sliders" size={24} color="secondary" />
        </Pressable>
      </View>
      <View style={styles.divider} />
    </View>
  );

  const empty = history.isPending ? (
    <View style={[styles.inset, styles.list]}>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} width="100%" height={B.card.height} radius={B.card.radius} />
      ))}
    </View>
  ) : history.isError ? (
    <State title="Couldn’t load your bookings" note="Check your connection and try again." action={{ label: 'Try again', onPress: () => void history.refetch() }} />
  ) : rangeKey !== 'all' ? (
    <State title="Nothing in this period" note="Try another filter." action={{ label: 'Show all', onPress: () => setRangeKey('all') }} />
  ) : (
    <State title="No bookings yet" note="When you book an experience or a service, you’ll see it here." />
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={shown}
        keyExtractor={(b) => b.id}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={{ paddingTop: insets.top + B.backTop, paddingBottom: insets.bottom + 24 }}
        refreshing={history.isRefetching}
        onRefresh={() => void history.refetch()}
        renderItem={({ item, index }) => (
          <View style={index === 0 && styles.first}>
            <BusinessCard
              name={item.business.name}
              logoUrl={item.business.logo_url}
              verified={item.business.is_verified}
              distanceKm={null}
              area={null}
              rating={Number(item.business.rating_avg)}
              line={formatShortDateTime(item.starts_at)}
              note={item.status === 'confirmed' ? undefined : statusLabel(item.status)}
              trailing={<Icon name="chevron-right" size={24} color="black" />}
              onPress={() => router.push({ pathname: '/reservation/[id]', params: { id: item.id } })}
              accessibilityLabel={`${item.business.name}, ${item.listing.title}, ${formatShortDateTime(item.starts_at)}, ${statusLabel(item.status)}`}
            />
          </View>
        )}
      />
      <BookingSheet visible={filtering} onClose={() => setFiltering(false)} title="Filter" top={Math.max(320, 501 - Math.max(0, ranges.length - 4) * 76)}>
        <View style={styles.options}>
          {ranges.map((r) => {
            const selected = r.key === range.key;
            return (
              <Pressable
                key={r.key}
                onPress={() => {
                  setRangeKey(r.key);
                  setFiltering(false);
                }}
                style={[styles.option, selected && styles.optionSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  <View style={[styles.radioDot, selected && styles.radioDotSelected]} />
                </View>
                <Text variant="body16" weight="bold" color="secondary">
                  {r.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </BookingSheet>
    </View>
  );
}

function Separator() {
  return <View style={{ height: B.card.gap }} />;
}

function State({ title, note, action }: { title: string; note: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={styles.state}>
      <Text variant="h4" color="secondary" align="center">
        {title}
      </Text>
      <Text variant="body14" weight="medium" color="secondaryTint2" align="center">
        {note}
      </Text>
      {action && <Button label={action.label} variant="dark" size="small" onPress={action.onPress} style={styles.stateButton} />}
    </View>
  );
}

const RADIO = 20;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  inset: {
    paddingHorizontal: B.inset,
  },
  titleRow: {
    marginTop: B.backToTitle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  divider: {
    marginTop: B.dividerTop,
    height: 1,
    backgroundColor: colors.secondaryTint5,
  },
  first: {
    marginTop: B.listTopPushed,
  },
  list: {
    marginTop: B.listTopPushed,
    gap: B.card.gap,
  },
  state: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  stateButton: {
    marginTop: 14,
    alignSelf: 'center',
  },
  options: {
    marginTop: 30,
    marginHorizontal: 14,
    marginBottom: 8,
    gap: B.filterRow.gap,
  },
  option: {
    height: B.filterRow.height,
    borderRadius: B.filterRow.radius,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    gap: 12,
  },
  optionSelected: {
    backgroundColor: colors.surface,
  },
  radio: {
    width: RADIO,
    height: RADIO,
    borderRadius: RADIO / 2,
    borderWidth: 1,
    borderColor: colors.secondaryTint4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.secondary,
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.secondaryTint4,
  },
  radioDotSelected: {
    backgroundColor: colors.secondary,
  },
});
