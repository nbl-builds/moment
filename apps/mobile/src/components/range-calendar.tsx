import { colors, toLocalDate } from '@moment/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from './ui';

// Figma: "Select Date" (22:1789): month and arrows, a hairline, weekday row,
// day rows 48pt apart. Start and end are dark pills; days between sit on a
// white band; days you cannot pick are light grey.

export interface DateRange {
  /** YYYY-MM-DD */
  from: string;
  to: string;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;
const ROW = 48;
const PILL = { height: 36, radius: 20 } as const;
const BAND = 33;
const NAV = 32;

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

interface RangeCalendarProps {
  value: DateRange | null;
  onChange: (range: DateRange) => void;
  /** First pickable day (YYYY-MM-DD); defaults to today in Karachi. */
  minDate?: string;
}

/** Month calendar that picks a date range: tap the first day, then the last. */
export function RangeCalendar({ value, onChange, minDate: minDateProp }: RangeCalendarProps) {
  const [today] = useState(() => toLocalDate(Date.now()));
  const minDate = minDateProp ?? today;
  const start = value?.from ?? minDate;
  const [year, setYear] = useState(Number(start.slice(0, 4)));
  const [month, setMonth] = useState(Number(start.slice(5, 7)) - 1);
  const [pendingFrom, setPendingFrom] = useState<string | null>(null);

  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array<null>(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };
  const canGoBack = iso(year, month, 1) > minDate.slice(0, 8) + '01';

  const from = pendingFrom ?? value?.from ?? null;
  const to = pendingFrom ? null : (value?.to ?? null);

  const pick = (day: string) => {
    if (!pendingFrom) {
      setPendingFrom(day);
      return;
    }
    const [a, b] = day < pendingFrom ? [day, pendingFrom] : [pendingFrom, day];
    setPendingFrom(null);
    onChange({ from: a, to: b });
  };

  return (
    <View>
      <View style={styles.header}>
        <Text variant="body16" weight="bold" color="secondary" accessibilityRole="header">
          {MONTHS[month]} {year}
        </Text>
        <View style={styles.nav}>
          <Pressable
            onPress={() => shift(-1)}
            disabled={!canGoBack}
            style={[styles.navButton, !canGoBack && styles.navDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
          >
            <Icon name="chevron-left" size={23.5} color="secondary" />
          </Pressable>
          <Pressable onPress={() => shift(1)} style={styles.navButton} accessibilityRole="button" accessibilityLabel="Next month">
            <Icon name="chevron-left" size={23.5} color="secondary" style={styles.flip} />
          </Pressable>
        </View>
      </View>
      <View style={styles.rule} />

      <View style={styles.week}>
        {WEEKDAYS.map((w) => (
          <View key={w} style={styles.cell}>
            <Text variant="subText13" weight="bold" color="secondary">
              {w}
            </Text>
          </View>
        ))}
      </View>

      {Array.from({ length: cells.length / 7 }, (_, r) => (
        <View key={r} style={styles.week}>
          {cells.slice(r * 7, r * 7 + 7).map((d, i) => {
            if (d === null) return <View key={i} style={styles.cell} />;
            const day = iso(year, month, d);
            const disabled = day < minDate;
            const isEdge = day === from || day === to;
            const inRange = Boolean(from && to && day > from && day < to);
            const bandLeft = Boolean(from && to && from !== to && (day === to || inRange));
            const bandRight = Boolean(from && to && from !== to && (day === from || inRange));
            return (
              <Pressable
                key={i}
                onPress={() => pick(day)}
                disabled={disabled}
                style={styles.cell}
                accessibilityRole="button"
                accessibilityLabel={`${d} ${MONTHS[month]}`}
                accessibilityState={{ disabled, selected: isEdge || inRange }}
              >
                {bandLeft && <View style={[styles.band, styles.bandLeft]} />}
                {bandRight && <View style={[styles.band, styles.bandRight]} />}
                <View style={[styles.day, isEdge && styles.edge]}>
                  <Text variant="subText13" weight="bold" color={isEdge ? 'white' : disabled ? 'textDisabled' : 'secondary'}>
                    {d}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nav: {
    flexDirection: 'row',
    gap: 24,
  },
  navButton: {
    width: NAV,
    height: NAV,
    borderRadius: NAV / 2,
    backgroundColor: colors.iconButtonMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navDisabled: {
    opacity: 0.4,
  },
  flip: {
    transform: [{ rotate: '180deg' }],
  },
  rule: {
    marginTop: 14,
    height: 1,
    backgroundColor: colors.divider,
  },
  week: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    height: ROW,
    alignItems: 'center',
    justifyContent: 'center',
  },
  day: {
    minWidth: PILL.height,
    height: PILL.height,
    borderRadius: PILL.radius,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  edge: {
    backgroundColor: colors.secondary,
  },
  band: {
    position: 'absolute',
    height: BAND,
    width: '50%',
    backgroundColor: colors.white,
  },
  bandLeft: {
    left: 0,
  },
  bandRight: {
    right: 0,
  },
});
