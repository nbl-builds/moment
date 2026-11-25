import { colors, PAYMENT_METHODS, type PaymentMethodKey } from '@moment/shared';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text, type IconName } from '@/components/ui';
import { BOOK } from '../layout';
import { BookingSheet } from './booking-sheet';

const R = BOOK.sheet.paymentRow;

/** Card uses the card glyph; the wallets are mobile-account payments. */
export const PAYMENT_ICONS: Record<PaymentMethodKey, IconName> = {
  card: 'creditcard',
  jazzcash: 'mobile',
  easypaisa: 'mobile',
};

export const paymentLabel = (key: string) => PAYMENT_METHODS.find((m) => m.key === key)?.label ?? 'Card';

/** "Payment Method" (47:4827): tap a row to pick it; the picked row is white. */
export function PaymentSheet({
  visible,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  value: string;
  onSelect: (key: PaymentMethodKey) => void;
  onClose: () => void;
}) {
  return (
    <BookingSheet visible={visible} onClose={onClose} title="Payment Method" top={BOOK.sheet.top.payment}>
      <View style={styles.rows}>
        {PAYMENT_METHODS.map((m) => {
          const selected = m.key === value;
          return (
            <Pressable
              key={m.key}
              onPress={() => onSelect(m.key)}
              style={[styles.row, selected && styles.rowSelected]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={m.label}
            >
              <View style={styles.icon}>
                <Icon name={PAYMENT_ICONS[m.key]} size={24} color="secondary" />
              </View>
              <Text variant="body16" weight="bold" color="black">
                {m.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </BookingSheet>
  );
}

const styles = StyleSheet.create({
  rows: {
    marginTop: 35,
    marginHorizontal: BOOK.inset,
    gap: R.gap,
    marginBottom: 8,
  },
  row: {
    height: R.height,
    borderRadius: R.radius,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowSelected: {
    backgroundColor: colors.surface,
  },
  icon: {
    width: 72,
    alignItems: 'center',
  },
});
