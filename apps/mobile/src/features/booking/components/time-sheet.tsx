import { colors, formatPrice, localDateTimeToIso } from '@moment/shared';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui';
import type { ChainedVisit } from '../chain';
import { shortDay } from '../format';
import { BOOK } from '../layout';
import { useVisitTimes } from '../queries';
import { BookingSheet } from './booking-sheet';
import { HostLine } from './host-line';

const T = BOOK.sheet.timeCard;

export interface StaffInfo {
  name: string;
  avatarUrl: string | null;
}

interface TimeSheetProps {
  visible: boolean;
  serviceIds: string[];
  date: string | null;
  /** Visit total shown on each time. */
  price: number;
  /** Staff by id, for "With <name>". */
  staff: Map<string, StaffInfo>;
  fallbackName: string;
  value: string | null;
  onSave: (visit: ChainedVisit) => void;
  onBack: () => void;
  onClose: () => void;
}

/** "Select Time" (47:3864): free times on the picked day, then Save. */
export function TimeSheet({ visible, serviceIds, date, price, staff, fallbackName, value, onSave, onBack, onClose }: TimeSheetProps) {
  const times = useVisitTimes(serviceIds, visible ? date : null);
  const [picked, setPicked] = useState<string | null>(null);
  const visits = times.data ?? [];
  const selected = picked ?? value;
  const visit = visits.find((v) => v.startsAt === selected) ?? null;

  const close = (fn: () => void) => () => {
    setPicked(null);
    fn();
  };

  return (
    <BookingSheet
      visible={visible}
      onClose={close(onClose)}
      onBack={close(onBack)}
      hideClose
      title="Select Time"
      top={BOOK.sheet.top.time}
      scrollContent
      action={{ label: 'Save', disabled: !visit, onPress: () => visit && (setPicked(null), onSave(visit)) }}
    >
      {date && (
        <Text variant="subText16" weight="semibold" color="secondary" style={styles.date}>
          {shortDay(localDateTimeToIso(date, '12:00'))}
        </Text>
      )}
      <View style={styles.divider} />
      {times.isPending ? (
        <ActivityIndicator style={styles.state} color={colors.secondary} />
      ) : times.isError ? (
        <Text variant="body14" color="error" align="center" style={styles.state}>
          Couldn’t load times. Go back and try again.
        </Text>
      ) : visits.length === 0 ? (
        <Text variant="body14" weight="medium" color="secondaryTint2" align="center" style={styles.state}>
          No times left on this day. Go back and pick another day.
        </Text>
      ) : (
        <View style={styles.list}>
          {visits.map((v) => {
            const person = staff.get(v.times[0]?.staff_id ?? '');
            const isSelected = v.startsAt === selected;
            return (
              <Pressable
                key={v.startsAt}
                onPress={() => setPicked(v.startsAt)}
                style={[styles.card, isSelected && styles.cardSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <HostLine
                  name={person?.name ?? fallbackName}
                  avatarUrl={person?.avatarUrl ?? null}
                  startsAt={v.startsAt}
                  endsAt={v.endsAt}
                  price={formatPrice(price)}
                  priceNote={serviceIds.length > 1 ? 'total' : 'per visit'}
                />
              </Pressable>
            );
          })}
        </View>
      )}
    </BookingSheet>
  );
}

const styles = StyleSheet.create({
  date: {
    marginTop: 23,
    marginHorizontal: BOOK.inset,
  },
  divider: {
    marginTop: 13,
    marginHorizontal: BOOK.inset,
    height: 1,
    backgroundColor: colors.chipBorder,
  },
  list: {
    marginTop: 19,
    marginBottom: 24,
    marginHorizontal: BOOK.inset,
    gap: T.gap,
  },
  card: {
    minHeight: T.height,
    borderRadius: BOOK.card.radius,
    backgroundColor: colors.surface,
    paddingHorizontal: BOOK.card.padding,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surface,
  },
  cardSelected: {
    borderColor: colors.chipBorder,
  },
  state: {
    marginTop: 40,
    marginHorizontal: BOOK.inset,
  },
});
