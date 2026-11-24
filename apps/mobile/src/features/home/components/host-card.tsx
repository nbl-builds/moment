import { colors, hostTileColors } from '@moment/shared';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from '@/components/ui';
import { api } from '@/lib/api';
import { HOME } from '../layout';
import type { HostCardData } from '../use-home-data';

const H = HOME.host;
const CHIP = HOME.card.chip;
const G = HOME.hostGrid;

interface HostCardProps {
  host: HostCardData;
  index: number;
  onPress: () => void;
  /** 'rail': Home Top Hosts (17:1074). 'grid': See all > Top Hosts, two per row (20:1479). */
  variant?: 'rail' | 'grid';
  /** Grid only: what the host does, e.g. "Adventure" (see `hostCategoryLabel`). */
  category?: string | null;
  /** Grid only: card width (two columns fill the screen). */
  width?: number;
}

/** "50+ Bookings" from the host's experiences' booking counts. */
export function hostBookingsLabel(host: HostCardData) {
  const total = host.listings.reduce((sum, l) => sum + (l.listing?.booking_count ?? 0), 0);
  if (total === 0) return 'New host';
  return total >= 10 ? `${Math.floor(total / 10) * 10}+ Bookings` : `${total} Booking${total === 1 ? '' : 's'}`;
}

/**
 * Top Hosts tile (Figma 17:1074): the host's cut-out photo on a coloured
 * rounded square, rating chip over its bottom edge, name and role below.
 * The grid variant is a white card with the photo, rating chip in its corner,
 * full name and "Category • 50+ Bookings".
 */
export function HostCard({ host, index, onPress, variant = 'rail', category, width = G.width }: HostCardProps) {
  const photo = api.media.url(host.avatar_url);
  const tint = hostTileColors[index % hostTileColors.length];
  if (variant === 'grid') {
    const tile = width - G.padding * 2;
    const meta = [category, hostBookingsLabel(host)].filter(Boolean).join(' • ');
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.gridCard, { width }, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`${host.display_name}, ${meta}, rated ${Number(host.rating_avg).toFixed(1)}`}
      >
        <View style={[styles.gridTile, { width: tile, height: tile, backgroundColor: tint }]}>
          {photo && <Image source={{ uri: photo }} style={styles.photo} contentFit="cover" contentPosition="top" accessible={false} />}
          {host.rating_count > 0 && (
            <View style={styles.gridRating}>
              <Icon name="star" size={14} />
              <Text variant="subText12" weight="medium" color="blackTint1">
                {Number(host.rating_avg).toFixed(1)}
              </Text>
            </View>
          )}
        </View>
        <Text variant="body16" weight="bold" color="black" numberOfLines={1} style={styles.gridName}>
          {host.display_name}
        </Text>
        <Text variant="body10" weight="medium" color="secondaryTint2" numberOfLines={1} style={styles.gridMeta}>
          {meta}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${host.display_name}, ${host.title ?? 'host'}, rated ${Number(host.rating_avg).toFixed(1)}`}
    >
      <View style={[styles.tile, { backgroundColor: tint }]}>
        {photo && <Image source={{ uri: photo }} style={styles.photo} contentFit="cover" contentPosition="top" accessible={false} />}
      </View>
      {host.rating_count > 0 && (
        <View style={styles.rating}>
          <Icon name="star" size={14} />
          <Text variant="body12" weight="medium" color="secondary">
            {Number(host.rating_avg).toFixed(1)}
          </Text>
        </View>
      )}
      <Text variant="body14" weight="bold" color="secondary" align="center" numberOfLines={1} style={styles.name}>
        {host.display_name.split(' ')[0]}
      </Text>
      {host.title && (
        <Text variant="body10" color="secondaryTint2" align="center" numberOfLines={1}>
          {host.title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: H.tile,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  tile: {
    width: H.tile,
    height: H.tile,
    borderRadius: 20,
    overflow: 'hidden',
  },
  photo: {
    ...StyleSheet.absoluteFill,
  },
  rating: {
    marginTop: -H.chipOverlap,
    width: CHIP.width,
    height: CHIP.height,
    borderRadius: CHIP.radius,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  name: {
    marginTop: H.nameGap - CHIP.height + H.chipOverlap,
    maxWidth: H.tile + 20,
  },
  gridCard: {
    padding: G.padding,
    borderRadius: G.radius,
    backgroundColor: colors.white,
  },
  gridTile: {
    borderRadius: G.imageRadius,
    overflow: 'hidden',
  },
  gridRating: {
    position: 'absolute',
    top: G.chipInset,
    left: G.chipInset,
    width: CHIP.width,
    height: CHIP.height,
    borderRadius: CHIP.radius,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  gridName: {
    marginTop: G.nameGap,
  },
  gridMeta: {
    marginTop: G.metaGap,
  },
});
