import { colors, formatPrice } from '@moment/shared';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text, textStyle } from '@/components/ui';
import { BOOK } from '../layout';
import { usePublicCoupons, type PublicCoupon } from '../queries';
import { BookingSheet } from './booking-sheet';

const R = BOOK.sheet.couponRow;

interface CouponSheetProps {
  visible: boolean;
  businessId: string;
  value: string | null;
  onApply: (code: string | null) => void;
  onClose: () => void;
}

/** "Add Coupon" (47:4945): type a code or pick one of the public coupons. */
export function CouponSheet({ visible, businessId, value, onApply, onClose }: CouponSheetProps) {
  const coupons = usePublicCoupons(visible ? businessId : undefined);
  const [typed, setTyped] = useState<string | null>(null);
  const code = (typed ?? value ?? '').trim().toUpperCase();

  const close = () => {
    setTyped(null);
    onClose();
  };
  const apply = (next: string | null) => {
    setTyped(null);
    onApply(next);
  };

  return (
    <BookingSheet
      visible={visible}
      onClose={close}
      title="Add Coupon"
      top={BOOK.sheet.top.coupon}
      action={{ label: 'Apply', disabled: !code, onPress: () => apply(code) }}
    >
      <Text variant="subText14" weight="medium" color="black" style={styles.label}>
        Enter Coupon
      </Text>
      <View style={styles.inputBox}>
        <TextInput
          value={typed ?? value ?? ''}
          onChangeText={setTyped}
          placeholder="Enter your coupon id here"
          placeholderTextColor={colors.secondaryTint3}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={() => code && apply(code)}
          style={styles.input}
          accessibilityLabel="Coupon code"
        />
        {value && (
          <Text variant="body14" weight="bold" color="secondary" style={styles.remove} onPress={() => apply(null)} accessibilityRole="button">
            Remove
          </Text>
        )}
      </View>

      <Text variant="h4" weight="bold" color="black" style={styles.heading}>
        Available Coupons
      </Text>
      {coupons.isPending ? (
        <ActivityIndicator style={styles.state} color={colors.secondary} />
      ) : coupons.isError ? (
        <Text variant="body14" color="error" style={styles.state}>
          Couldn’t load coupons. You can still type a code.
        </Text>
      ) : coupons.data.length === 0 ? (
        <Text variant="body14" weight="medium" color="secondaryTint2" style={styles.state}>
          No coupons for this place right now.
        </Text>
      ) : (
        <View style={styles.rows}>
          {coupons.data.map((c) => {
            const selected = c.code === code;
            return (
              <Pressable
                key={c.id}
                onPress={() => setTyped(c.code)}
                style={[styles.row, selected && styles.rowSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${c.title}, ${couponSummary(c)}`}
              >
                <Text variant="subText16" weight="medium" color="black" numberOfLines={1} style={styles.rowTitle}>
                  {c.title}
                </Text>
                <Text variant="body12" weight="medium" color="secondaryTint2" numberOfLines={1}>
                  {c.code} · {couponSummary(c)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </BookingSheet>
  );
}

/** "15% off", "Rs 500 off", "on Rs 2,000+" */
function couponSummary(c: PublicCoupon) {
  const off = c.discount_type === 'percent' ? `${c.discount_value}% off` : `${formatPrice(c.discount_value)} off`;
  return c.min_subtotal_amount ? `${off} on ${formatPrice(c.min_subtotal_amount)}+` : off;
}

const styles = StyleSheet.create({
  label: {
    marginTop: 20,
    marginHorizontal: BOOK.inset,
  },
  inputBox: {
    marginTop: 10,
    marginHorizontal: BOOK.inset,
    height: 60,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.secondaryTint5,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    gap: 12,
  },
  input: {
    ...textStyle('subText16'),
    flex: 1,
    color: colors.black,
    padding: 0,
  },
  remove: {
    textDecorationLine: 'underline',
  },
  heading: {
    marginTop: 28,
    marginHorizontal: BOOK.inset,
  },
  rows: {
    marginTop: 20,
    marginHorizontal: BOOK.inset,
    marginBottom: 24,
    gap: R.gap,
  },
  row: {
    minHeight: R.height,
    borderRadius: 15,
    paddingHorizontal: 24,
    paddingVertical: 8,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.backgroundMuted,
  },
  rowSelected: {
    backgroundColor: colors.surface,
    borderColor: colors.chipBorder,
    borderRadius: 12,
  },
  rowTitle: {
    marginBottom: 1,
  },
  state: {
    marginTop: 20,
    marginHorizontal: BOOK.inset,
  },
});
