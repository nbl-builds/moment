import { colors, PAYMENT_METHODS, type PaymentMethodKey } from '@moment/shared';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from '@/components/ui';
import { BookingSheet } from '@/features/booking/components/booking-sheet';
import { PAYMENT_ICONS } from '@/features/booking/components/payment-sheet';

/**
 * "Payment Method" picker (48:5703): 60pt rows 19 apart. Figma shows
 * Mastercard / PayPal / Apple Pay; Pakistan launch uses Card, JazzCash, Easypaisa.
 */
export function MethodPickerSheet({
  visible,
  onPick,
  onClose,
}: {
  visible: boolean;
  onPick: (key: PaymentMethodKey) => void;
  onClose: () => void;
}) {
  return (
    <BookingSheet visible={visible} onClose={onClose} title="Payment Method" top={575}>
      <View style={styles.rows}>
        {PAYMENT_METHODS.map((m) => (
          <Pressable
            key={m.key}
            onPress={() => onPick(m.key)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Add ${m.label}`}
          >
            <View style={styles.logo}>
              <Icon name={PAYMENT_ICONS[m.key]} size={24} color="black" />
            </View>
            <Text variant="subText16" weight="medium" color="black">
              {m.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </BookingSheet>
  );
}

const styles = StyleSheet.create({
  // Figma: first row 60 below the sheet top (title at +21, 28pt header).
  rows: {
    marginTop: 32,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 19,
  },
  row: {
    height: 60,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pressed: {
    backgroundColor: colors.white,
  },
  // Logos centred in a 36pt column from x36; labels at x92.
  logo: {
    width: 36,
    marginLeft: 16,
    marginRight: 20,
    alignItems: 'center',
  },
});
