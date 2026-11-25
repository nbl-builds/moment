import { colors, formatPrice } from '@moment/shared';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from '@/components/ui';
import { BookingSheet } from '@/features/booking/components/booking-sheet';
import { appointmentLine } from '@/features/booking/format';
import type { BookingRow } from '../queries';
import { statusLabel } from '../status';

/** Several active reservations at one business: pick which to open (no Figma frame). */
export function PickReservationSheet({
  bookings,
  onPick,
  onClose,
}: {
  bookings: BookingRow[] | null;
  onPick: (booking: BookingRow) => void;
  onClose: () => void;
}) {
  const list = bookings ?? [];
  return (
    <BookingSheet
      visible={bookings !== null}
      onClose={onClose}
      title={list[0]?.business.name ?? 'Reservations'}
      top={Math.max(380, 926 - 140 - list.length * 92)}
    >
      <View style={styles.rows}>
        {list.map((b) => (
          <Pressable
            key={b.id}
            onPress={() => onPick(b)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`${b.listing.title}, ${appointmentLine(b.starts_at, b.ends_at)}, ${statusLabel(b.status)}`}
          >
            <View style={styles.text}>
              <Text variant="body16" weight="bold" color="secondary" numberOfLines={1}>
                {b.listing.title}
              </Text>
              <Text variant="body12" weight="medium" color="secondaryTint2" numberOfLines={1}>
                {appointmentLine(b.starts_at, b.ends_at)}
              </Text>
              <Text variant="body12" weight="semibold" color={b.status === 'pending' ? 'third' : 'price'}>
                {statusLabel(b.status)} · {formatPrice(b.total_amount, { currency: b.currency })}
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color="black" />
          </Pressable>
        ))}
      </View>
    </BookingSheet>
  );
}

const styles = StyleSheet.create({
  rows: {
    marginTop: 24,
    marginHorizontal: 20,
    marginBottom: 8,
    gap: 16,
  },
  row: {
    minHeight: 76,
    borderRadius: 15,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pressed: {
    opacity: 0.85,
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
