import { colors, formatPrice } from '@moment/shared';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui';
import { api } from '@/lib/api';
import { BIZ } from '../layout';
import type { MembershipPlan } from '../queries';

const P = BIZ.plan;

export const planPeriodLabel = (interval: MembershipPlan['interval']) =>
  interval === 'month' ? '1 month' : interval === 'year' ? '1 year' : 'One time';

/** Membership plan card (47:2231): picture, period, name and green price badge. */
export function PlanCard({ plan, photo, currency, onPress }: { plan: MembershipPlan; photo: string | null; currency: string; onPress: () => void }) {
  const uri = api.media.url(photo);
  const price = formatPrice(plan.price_amount, { currency });
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${plan.name}, ${planPeriodLabel(plan.interval)}, ${price}`}
    >
      <View style={styles.image}>{uri && <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />}</View>
      <View style={styles.footer}>
        <View style={styles.text}>
          <Text variant="subText12" color="secondaryTint2">
            {planPeriodLabel(plan.interval)}
          </Text>
          <Text variant="h4" color="secondary" numberOfLines={1}>
            {plan.name}
          </Text>
        </View>
        <View style={styles.price}>
          <Text variant="subText14" weight="extrabold" color="white">
            {price}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: P.height,
    borderRadius: P.radius,
    backgroundColor: colors.white,
    padding: P.imageInset,
  },
  pressed: {
    opacity: 0.9,
  },
  image: {
    height: P.imageHeight,
    borderRadius: P.radius,
    overflow: 'hidden',
    backgroundColor: colors.secondaryTint6,
  },
  // Figma: period 16pt below the picture, name right under it, price badge 16pt from the right.
  footer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 8,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  price: {
    minWidth: BIZ.priceBadge.width,
    height: BIZ.priceBadge.height,
    borderRadius: BIZ.priceBadge.radius,
    paddingHorizontal: 8,
    backgroundColor: colors.priceBadge,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
