import { colors, formatDistanceKm, formatPrice, priceUnitLabel, type PriceUnit } from '@moment/shared';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from '@/components/ui';
import { api } from '@/lib/api';
import { HOME } from '../layout';
import type { ListingCardData } from '../use-home-data';

const CARD = HOME.card;
const HEART_HIT_SLOP = 10;

export interface ListingCardProps {
  listing: ListingCardData;
  /** 'tall': Popular / Recently viewed (17:1126). 'short': Just for you (17:1169). 'wide': Search Results (22:2205). 'wideShort': See all > Just For You (20:1676). */
  size: 'tall' | 'short' | 'wide' | 'wideShort';
  distanceKm?: number;
  saved: boolean;
  onPress: () => void;
  onToggleSaved: () => void;
}

/**
 * Listing card: photo with rating, heart and distance, title, host (or the
 * business for services) and price in PKR.
 */
export function ListingCard({ listing, size, distanceKm, saved, onPress, onToggleSaved }: ListingCardProps) {
  const v = CARD[size];
  const photo = api.media.url(listing.media[0]?.url);
  const host = listing.staff.map((s) => s.staff).find((s) => s?.is_host) ?? null;
  const withName = host?.display_name ?? listing.business.name;
  const withAvatar = api.media.url(host?.avatar_url ?? listing.business.logo_url);
  const subtitle = host?.title ?? null;
  const distance = distanceKm !== undefined ? formatDistanceKm(distanceKm) : '';

  return (
    // The heart is a sibling of the card's pressable, not nested in it, so screen
    // readers reach it as its own button.
    <View style={[styles.card, { height: v.height }, (size === 'wide' || size === 'wideShort') && styles.wide]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`${listing.title}, with ${withName}, ${formatPrice(listing.price_amount)} ${priceUnitLabel(listing.price_unit as PriceUnit)}`}
      >
        <View style={[styles.photo, { height: v.image }]}>
          {photo && <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />}

          {listing.rating_count > 0 && (
            <View style={styles.rating}>
              <Icon name="star" size={14} />
              <Text variant="subText12" weight="medium" color="blackTint1">
                {Number(listing.rating_avg).toFixed(1)}
              </Text>
            </View>
          )}

          {distance !== '' && (
            <View style={styles.distance}>
              <Icon name="location-fill" size={20} color="white" />
              <Text variant="subText12" color="white">
                {distance}
              </Text>
            </View>
          )}
        </View>

        <Text variant="body16" weight="bold" color="black" numberOfLines={v.titleLines} style={[styles.title, { marginTop: v.titleGap }]}>
          {listing.title}
        </Text>

        <View style={[styles.footer, { paddingBottom: v.footerBottom }]}>
          <View style={styles.with}>
            {withAvatar ? (
              <Image source={{ uri: withAvatar }} style={styles.avatar} contentFit="cover" accessible={false} />
            ) : (
              <View style={[styles.avatar, styles.avatarEmpty]} />
            )}
            <View style={styles.withText}>
              <Text variant="body14" weight="medium" color="black" numberOfLines={1}>
                With{' '}
                <Text variant="body14" weight="bold" color="third">
                  {withName}
                </Text>
              </Text>
              {subtitle && (
                <Text variant="body10" color="secondaryTint2" numberOfLines={1}>
                  {subtitle}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.price}>
            <Text variant="subText14" weight="bold" color="price">
              {formatPrice(listing.price_amount, { currency: listing.currency })}
            </Text>
            <Text variant="body10" color="secondaryTint2">
              {priceUnitLabel(listing.price_unit as PriceUnit)}
            </Text>
          </View>
        </View>
      </Pressable>
      <Pressable
        onPress={onToggleSaved}
        hitSlop={HEART_HIT_SLOP}
        style={styles.heart}
        accessibilityRole="button"
        accessibilityLabel={saved ? `Remove ${listing.title} from bucket list` : `Add ${listing.title} to bucket list`}
        accessibilityState={{ selected: saved }}
      >
        {saved ? <Icon name="heart-saved" /> : <Icon name="heart-on-photo" />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD.width,
    padding: CARD.padding,
    borderRadius: CARD.radius,
    backgroundColor: colors.surface,
    // Figma: 0 23 49 rgba(0,0,0,0.05).
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 23 },
    elevation: 2,
  },
  wide: {
    width: 'auto',
    alignSelf: 'stretch',
  },
  body: {
    flex: 1,
  },
  pressed: {
    opacity: 0.92,
  },
  photo: {
    borderRadius: CARD.imageRadius,
    overflow: 'hidden',
    backgroundColor: colors.secondaryTint6,
  },
  rating: {
    position: 'absolute',
    top: CARD.chip.inset,
    left: CARD.chip.inset,
    width: CARD.chip.width,
    height: CARD.chip.height,
    borderRadius: CARD.chip.radius,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  // Over the photo's top-right corner (Figma: 14pt inside the photo).
  heart: {
    position: 'absolute',
    top: CARD.padding + CARD.chip.inset,
    right: CARD.padding + CARD.chip.inset,
  },
  distance: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  title: {
    paddingRight: 10,
  },
  footer: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  with: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  withText: {
    flex: 1,
  },
  avatar: {
    width: CARD.avatar,
    height: CARD.avatar,
    borderRadius: CARD.avatar / 2,
  },
  avatarEmpty: {
    backgroundColor: colors.secondaryTint6,
  },
  price: {
    alignItems: 'flex-end',
    gap: 2,
  },
});
