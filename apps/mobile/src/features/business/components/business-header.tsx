import { colors, formatDistanceKm, openingStatus } from '@moment/shared';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from '@/components/ui';
import { api } from '@/lib/api';
import { BIZ } from '../layout';
import type { Business } from '../queries';

const L = BIZ.logo;

/** "2600+ Bookings" style: rounded down to tens (or hundreds past 1,000). */
export function bookingsLabel(total: number) {
  if (total <= 0) return null;
  if (total < 10) return `${total} Booking${total === 1 ? '' : 's'}`;
  const step = total >= 1000 ? 100 : 10;
  return `${Math.floor(total / step) * step}+ Bookings`;
}

export function businessAddress(business: Business) {
  const loc = business.locations.find((l) => l.is_primary) ?? business.locations[0];
  if (!loc) return null;
  return [loc.address_line1, loc.area, loc.city].filter(Boolean).join(', ');
}

interface BusinessHeaderProps {
  business: Business;
  distanceKm: number | null;
  bookings: number;
  onAddress: () => void;
}

/**
 * Top of the panel (25:2265): logo tile over the panel edge, rating chip,
 * name with the verified badge, address (opens Maps), distance, bookings and
 * "Open now" / "Closed" from the opening hours.
 */
export function BusinessHeader({ business, distanceKm, bookings, onAddress }: BusinessHeaderProps) {
  const logo = api.media.url(business.logo_url);
  const address = businessAddress(business);
  // When the page opened; enough for "Open now" while it's on screen.
  const [openedAt] = useState(() => Date.now());
  const status = openingStatus(business.hours, openedAt, business.timezone);
  const booked = bookingsLabel(bookings);
  const meta = [
    distanceKm !== null ? { key: 'distance', text: formatDistanceKm(distanceKm) } : null,
    booked ? { key: 'bookings', text: booked } : null,
  ].filter((m): m is { key: string; text: string } => m !== null);

  return (
    <View>
      <View style={styles.topRow}>
        <View style={styles.logo}>
          {logo && <Image source={{ uri: logo }} style={styles.logoImage} contentFit="cover" accessible={false} />}
        </View>
        {business.rating_count > 0 && (
          <View style={styles.rating} accessible accessibilityLabel={`Rated ${Number(business.rating_avg).toFixed(1)} from ${business.rating_count} reviews`}>
            <Icon name="star" size={14} />
            <Text variant="subText12" weight="medium" color="blackTint1">
              {Number(business.rating_avg).toFixed(1)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.nameRow}>
        <Text variant="h4" color="secondary" numberOfLines={2} style={styles.name} accessibilityRole="header">
          {business.name}
        </Text>
        {business.is_verified && <Icon name="verified" size={14.6} accessibilityLabel="Verified" />}
      </View>

      {address && (
        <Pressable onPress={onAddress} style={styles.row} accessibilityRole="link" accessibilityLabel={`${address}. Opens Maps`} hitSlop={6}>
          <Icon name="location-pin" size={18} color="secondary" />
          <Text variant="body12" weight="medium" color="secondaryTint2" numberOfLines={1} style={styles.rowText}>
            {address}
          </Text>
        </Pressable>
      )}

      <View style={[styles.row, styles.metaRow]}>
        {meta.length > 0 && distanceKm !== null && <Icon name="navigation" size={18} color="secondary" />}
        {meta.map((m, i) => (
          <Text key={m.key} variant="body12" weight="medium" color="secondaryTint2">
            {i > 0 || distanceKm === null ? '•  ' : ''}
            {m.text}
          </Text>
        ))}
        {status && (
          <Text variant="body12" weight="medium" color={status.open ? 'open' : 'error'}>
            {meta.length > 0 ? '•  ' : ''}
            {status.label}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Logo overhangs the panel's top edge by 29pt; rating chip sits 15pt below the panel top, on the right.
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: -L.overhang,
  },
  logo: {
    width: L.size,
    height: L.size,
    borderRadius: L.radius,
    borderWidth: L.border,
    borderColor: colors.white,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  rating: {
    marginTop: L.overhang + 15,
    width: 50,
    height: 24,
    borderRadius: 6,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  // Figma: name 50pt below the panel top, address 37 below it, distance 28 below that.
  nameRow: {
    marginTop: BIZ.header.nameTop - (L.size - L.overhang),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    flexShrink: 1,
  },
  row: {
    marginTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  rowText: {
    flex: 1,
  },
  metaRow: {
    marginTop: 10,
    gap: 8,
    flexWrap: 'wrap',
  },
});
