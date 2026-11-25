import { colors, formatDistanceKm, formatPrice, priceUnitLabel, type PriceUnit } from '@moment/shared';
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from '@/components/ui';
import { api } from '@/lib/api';
import { openBusiness } from '@/features/business/navigation';
import { HOME } from '../layout';
import type { ListingCardData } from '../use-home-data';

const CARD = HOME.card;
const HEART_HIT_SLOP = 10;

export interface ListingCardProps {
  listing: ListingCardData;
  /** 'tall': Popular / Recently viewed (17:1126). 'short': Services near you (17:1169). 'wide': Search Results (22:2205). 'wideShort': See all > Services near you / Explore (20:1676). */
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
  const host = listing.staff.map((s) => s.staff).find((s) => s?.is_host) ?? null;
  const withName = host?.display_name ?? listing.business.name;
  return (
    <PhotoCard
      size={size}
      photoUrl={listing.media[0]?.url}
      rating={listing.rating_count > 0 ? Number(listing.rating_avg) : null}
      distanceKm={distanceKm}
      title={listing.title}
      avatarUrl={host?.avatar_url ?? listing.business.logo_url}
      withLine={
        <>
          With{' '}
          <Text variant="body14" weight="bold" color="third">
            {withName}
          </Text>
        </>
      }
      subtitle={host?.title ?? null}
      price={formatPrice(listing.price_amount, { currency: listing.currency })}
      priceNote={priceUnitLabel(listing.price_unit as PriceUnit)}
      accessibilityLabel={`${listing.title}, with ${withName}, ${formatPrice(listing.price_amount)} ${priceUnitLabel(listing.price_unit as PriceUnit)}`}
      onPress={onPress}
      onPressWith={() => openBusiness(listing.business.slug)}
      withActionLabel={`Open ${listing.business.name}`}
      saved={saved}
      onToggleSaved={onToggleSaved}
    />
  );
}

export interface PhotoCardProps {
  size: ListingCardProps['size'];
  photoUrl: string | null | undefined;
  /** Null hides the rating chip. */
  rating: number | null;
  distanceKm?: number;
  title: string;
  avatarUrl: string | null | undefined;
  /** First line next to the avatar ("With <host>"), Medium 14. */
  withLine: ReactNode;
  subtitle: string | null;
  price: string;
  priceNote: string;
  accessibilityLabel: string;
  onPress: () => void;
  /** Tapping the avatar row (listing cards open the business). */
  onPressWith?: () => void;
  withActionLabel?: string;
  saved: boolean;
  onToggleSaved: () => void;
}

/** The Home card layout (17:1126, 17:1169) shared by listing and business cards. */
export function PhotoCard(p: PhotoCardProps) {
  const v = CARD[p.size];
  const photo = api.media.url(p.photoUrl);
  const avatar = api.media.url(p.avatarUrl);
  const distance = p.distanceKm !== undefined ? formatDistanceKm(p.distanceKm) : '';
  const withRow = (
    <>
      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.avatar} contentFit="cover" accessible={false} />
      ) : (
        <View style={[styles.avatar, styles.avatarEmpty]} />
      )}
      <View style={styles.withText}>
        <Text variant="body14" weight="medium" color="black" numberOfLines={1}>
          {p.withLine}
        </Text>
        {p.subtitle && (
          <Text variant="body10" color="secondaryTint2" numberOfLines={1}>
            {p.subtitle}
          </Text>
        )}
      </View>
    </>
  );

  return (
    // The heart is a sibling of the card's pressable, not nested in it, so screen
    // readers reach it as its own button.
    <View style={[styles.card, { height: v.height }, (p.size === 'wide' || p.size === 'wideShort') && styles.wide]}>
      <Pressable
        onPress={p.onPress}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={p.accessibilityLabel}
        accessibilityActions={p.onPressWith ? [{ name: 'activate' }, { name: 'with', label: p.withActionLabel }] : undefined}
        onAccessibilityAction={(e) => (e.nativeEvent.actionName === 'with' ? p.onPressWith?.() : p.onPress())}
      >
        <View style={[styles.photo, { height: v.image }]}>
          {photo && <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />}

          {p.rating !== null && (
            <View style={styles.rating}>
              <Icon name="star" size={14} />
              <Text variant="subText12" weight="medium" color="blackTint1">
                {p.rating.toFixed(1)}
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
          {p.title}
        </Text>

        <View style={[styles.footer, { paddingBottom: v.footerBottom }]}>
          {p.onPressWith ? (
            <Pressable onPress={p.onPressWith} hitSlop={6} style={styles.with} accessible={false}>
              {withRow}
            </Pressable>
          ) : (
            <View style={styles.with}>{withRow}</View>
          )}
          <View style={styles.price}>
            <Text variant="subText14" weight="bold" color="price">
              {p.price}
            </Text>
            <Text variant="body10" color="secondaryTint2">
              {p.priceNote}
            </Text>
          </View>
        </View>
      </Pressable>
      <Pressable
        onPress={p.onToggleSaved}
        hitSlop={HEART_HIT_SLOP}
        style={styles.heart}
        accessibilityRole="button"
        accessibilityLabel={p.saved ? `Remove ${p.title} from bucket list` : `Add ${p.title} to bucket list`}
        accessibilityState={{ selected: p.saved }}
      >
        {p.saved ? <Icon name="heart-saved" /> : <Icon name="heart-on-photo" />}
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
