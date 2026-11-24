import { colors, formatPrice } from '@moment/shared';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from '@/components/ui';
import { api } from '@/lib/api';
import { BIZ } from '../layout';
import { bookingsLabel } from './business-header';

const C = BIZ.card;

interface ServiceCardProps {
  title: string;
  photo: string | null | undefined;
  bookings: number;
  price: number;
  currency: string;
  onPress: () => void;
  /** Services get + / remove; experiences open their page instead. */
  inCart?: boolean;
  onToggleCart?: () => void;
}

/**
 * Service row (25:2265, 47:1828): photo, title, bookings, green price badge,
 * and a black + that turns into a red remove button once added.
 */
export function ServiceCard({ title, photo, bookings, price, currency, onPress, inCart, onToggleCart }: ServiceCardProps) {
  const uri = api.media.url(photo);
  const booked = bookingsLabel(bookings);
  const priceText = formatPrice(price, { currency });
  return (
    <View style={styles.card}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${priceText}${booked ? `, ${booked}` : ''}`}
      >
        <View style={styles.thumb}>{uri && <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />}</View>
        <View style={styles.text}>
          <Text variant="body16" weight="bold" color="secondary" numberOfLines={1}>
            {title}
          </Text>
          <Text variant="body12" weight="medium" color="secondaryTint2" numberOfLines={1} style={styles.bookings}>
            {booked ?? 'New'}
          </Text>
          <View style={styles.price}>
            <Text variant="subText14" weight="extrabold" color="white" numberOfLines={1}>
              {priceText}
            </Text>
          </View>
        </View>
      </Pressable>
      {onToggleCart && (
        <Pressable
          onPress={onToggleCart}
          hitSlop={6}
          style={styles.button}
          accessibilityRole="button"
          accessibilityLabel={inCart ? `Remove ${title}` : `Add ${title}`}
          accessibilityState={{ selected: Boolean(inCart) }}
        >
          {inCart ? (
            <Icon name="remove-circle" size={C.button} />
          ) : (
            <View style={styles.add}>
              <Icon name="plus" size={24} color="white" />
            </View>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: C.height,
    borderRadius: C.radius,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    padding: C.padding,
    gap: 14,
  },
  pressed: {
    opacity: 0.85,
  },
  thumb: {
    width: C.thumb,
    height: C.thumb,
    borderRadius: C.thumbRadius,
    overflow: 'hidden',
    backgroundColor: colors.secondaryTint6,
  },
  text: {
    flex: 1,
    paddingTop: 2,
  },
  bookings: {
    marginTop: 2,
  },
  // Figma: 50 x 24 green badge, radius 8; PKR needs a little more room, so it grows with its text.
  price: {
    marginTop: 'auto',
    alignSelf: 'flex-start',
    minWidth: BIZ.priceBadge.width,
    height: BIZ.priceBadge.height,
    borderRadius: BIZ.priceBadge.radius,
    paddingHorizontal: 8,
    backgroundColor: colors.priceBadge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    marginRight: 17,
  },
  add: {
    width: C.button,
    height: C.button,
    borderRadius: C.button / 2,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
