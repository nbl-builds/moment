import { BOOKING_CHARGES, colors, formatPrice, priceBreakdown } from '@moment/shared';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '@/components/ui';
import { BOOK } from '../layout';
import { Card, Divider, Line, SectionHeader } from './card';

/**
 * Price Details (47:5143): the server subtotal, tax and Moment's fee, then
 * Sub total, the listing's offer (when it has one), the coupon discount and Total.
 */
export function PriceDetails({
  itemsLabel,
  subtotal,
  discount,
  offer,
  loading,
  error,
  style,
}: {
  /** "2 Services", "3 Guests", "Private group". */
  itemsLabel: string;
  subtotal: number | undefined;
  discount: number;
  /** The listing's own discount (large group or early bird), applied before the coupon. */
  offer?: { amount: number; label: string | null };
  loading: boolean;
  error: boolean;
  /** Reservation details show it as a full-width section. */
  style?: StyleProp<ViewStyle>;
}) {
  if (subtotal === undefined) {
    return (
      <Card style={style}>
        <SectionHeader title="Price Details" />
        {error ? (
          <Text variant="body14" color="error" style={styles.state}>
            Couldn’t load prices. Pull down or go back and try again.
          </Text>
        ) : (
          <ActivityIndicator style={styles.state} color={colors.secondary} />
        )}
      </Card>
    );
  }
  const offerAmount = offer?.amount ?? 0;
  const p = priceBreakdown(subtotal, discount + offerAmount);
  // Every column adds up: Sub total = the lines above; Total = Sub total - Discount.
  // Tax is on the amount actually paid (after the coupon).
  const beforeDiscount = p.subtotal + p.tax + p.serviceFee;
  return (
    <Card style={style}>
      <View style={styles.header}>
        <SectionHeader title="Price Details" />
        {loading && <ActivityIndicator size="small" color={colors.secondaryTint3} />}
      </View>
      <View style={styles.lines}>
        <Line label={itemsLabel} value={formatPrice(p.subtotal)} />
        <Line label="Tax" value={`${formatPrice(p.tax)} (${BOOKING_CHARGES.taxPercent}%)`} />
        <Line label="Service fee" value={formatPrice(p.serviceFee)} />
      </View>
      <Divider style={styles.divider} />
      <View style={styles.totals}>
        <Line label="Sub total" value={formatPrice(beforeDiscount)} valueColor="secondary" />
        {offerAmount > 0 && <Line label={offer?.label ?? 'Offer'} value={`- ${formatPrice(offerAmount)}`} valueColor="black" />}
        <Line label="Discount(Coupon)" value={discount > 0 ? `- ${formatPrice(discount)}` : '- - -'} valueColor="black" />
        <Line label="Total" value={formatPrice(p.total)} strong />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lines: {
    marginTop: 22,
  },
  divider: {
    marginTop: 1,
  },
  totals: {
    marginTop: 16,
    marginBottom: -BOOK.rowPitch + 24 + 13,
  },
  state: {
    marginTop: 16,
  },
});
