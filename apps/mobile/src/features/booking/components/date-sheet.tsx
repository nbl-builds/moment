import { colors, toLocalDate } from '@moment/shared';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from '@/components/ui';
import { BOOK } from '../layout';
import { BOOKING_WINDOW_DAYS, nextMonth, prevMonth, useAvailableDates } from '../queries';
import { BookingSheet } from './booking-sheet';

const C = BOOK.sheet.calendar;
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ARROW = 32;

interface DateSheetProps {
  visible: boolean;
  serviceIds: string[];
  /** Selected local date (YYYY-MM-DD). */
  value: string | null;
  onSelect: (date: string) => void;
  onClose: () => void;
}

/**
 * "Select Date" (47:3717): a month grid. Days without a free time for the
 * whole cart are grey. Picking a day goes straight on to Select Time.
 */
export function DateSheet({ visible, serviceIds, value, onSelect, onClose }: DateSheetProps) {
  const [now] = useState(() => Date.now());
  const today = toLocalDate(now);
  const firstMonth = `${today.slice(0, 7)}-01`;
  const [month, setMonth] = useState(() => `${(value ?? today).slice(0, 7)}-01`);
  const lastDay = toLocalDate(now + BOOKING_WINDOW_DAYS * 86_400_000);
  const dates = useAvailableDates(serviceIds, month, visible);

  const [y, m] = month.split('-').map(Number) as [number, number];
  const canPrev = month > firstMonth;
  const canNext = nextMonth(month) <= lastDay;

  return (
    <BookingSheet visible={visible} onClose={onClose} title="Select Date" top={BOOK.sheet.top.date}>
      <View style={styles.monthRow}>
        <Text variant="body16" weight="bold" color="secondary" accessibilityRole="header">
          {MONTHS[m - 1]} {y}
        </Text>
        <View style={styles.arrows}>
          {dates.isFetching && <ActivityIndicator size="small" color={colors.secondaryTint3} />}
          <Arrow direction="prev" disabled={!canPrev} onPress={() => setMonth(prevMonth(month))} />
          <Arrow direction="next" disabled={!canNext} onPress={() => setMonth(nextMonth(month))} />
        </View>
      </View>
      <View style={styles.divider} />
      <View style={styles.grid}>
        {WEEKDAYS.map((d) => (
          <View key={d} style={styles.cell}>
            <Text variant="subText13" weight="bold" color="secondary">
              {d}
            </Text>
          </View>
        ))}
        {monthCells(y, m).map((date, i) => {
          if (!date) return <View key={`blank-${i}`} style={styles.cell} />;
          const enabled = Boolean(dates.data?.has(date));
          const selected = date === value;
          return (
            <Pressable
              key={date}
              style={styles.cell}
              disabled={!enabled}
              onPress={() => onSelect(date)}
              accessibilityRole="button"
              accessibilityLabel={`${Number(date.slice(8))} ${MONTHS[m - 1]}`}
              accessibilityState={{ disabled: !enabled, selected }}
            >
              <View style={[styles.day, selected && styles.daySelected]}>
                <Text variant="subText13" weight="bold" color={selected ? 'white' : enabled ? 'secondary' : 'textDisabled'}>
                  {Number(date.slice(8))}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      {dates.isError && (
        <Text variant="body12" color="error" align="center" style={styles.error}>
          Couldn’t load available days. Close and try again.
        </Text>
      )}
    </BookingSheet>
  );
}

function Arrow({ direction, disabled, onPress }: { direction: 'prev' | 'next'; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.arrow, disabled && styles.arrowDisabled]}
      accessibilityRole="button"
      accessibilityLabel={direction === 'prev' ? 'Previous month' : 'Next month'}
      accessibilityState={{ disabled }}
    >
      <Icon name="chevron-left" size={23} color="secondary" style={direction === 'next' && styles.flip} />
    </Pressable>
  );
}

/** Local dates of a month laid out in weeks starting on Sunday (null = blank). */
function monthCells(year: number, month: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, '0');
  return [
    ...Array.from({ length: first }, () => null),
    ...Array.from({ length: days }, (_, i) => `${year}-${mm}-${String(i + 1).padStart(2, '0')}`),
  ];
}

const styles = StyleSheet.create({
  monthRow: {
    marginTop: 31,
    marginHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrows: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  arrow: {
    width: ARROW,
    height: ARROW,
    borderRadius: ARROW / 2,
    backgroundColor: colors.iconButtonMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowDisabled: {
    opacity: 0.4,
  },
  flip: {
    transform: [{ rotate: '180deg' }],
  },
  divider: {
    marginTop: 17,
    marginHorizontal: 18,
    height: 1,
    backgroundColor: colors.chipBorder,
  },
  grid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    height: C.rowPitch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  day: {
    paddingHorizontal: C.pill.padX,
    paddingVertical: C.pill.padY,
    borderRadius: C.pill.radius,
    minWidth: 35,
    alignItems: 'center',
  },
  daySelected: {
    backgroundColor: colors.secondary,
  },
  error: {
    marginTop: 8,
  },
});
