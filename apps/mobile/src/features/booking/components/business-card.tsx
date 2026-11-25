import { colors, formatDistanceKm } from '@moment/shared';
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from '@/components/ui';
import { api } from '@/lib/api';
import { BOOK } from '../layout';

const B = BOOK.business;

/**
 * Business card (Confirm Reservation 47:5143, Bookings 52:8565, All Bookings
 * 52:9094, Cart 52:8991): logo, name, distance (or a line of text), rating,
 * an optional note after the rating and an optional trailing badge or icon.
 */
export function BusinessCard({
  name,
  logoUrl,
  verified,
  distanceKm,
  area,
  rating,
  line,
  note,
  trailing,
  onPress,
  accessibilityLabel,
}: {
  name: string;
  logoUrl: string | null;
  verified: boolean;
  distanceKm: number | null;
  /** Shown instead of the distance when we don't know where the user is. */
  area: string | null;
  rating: number;
  /** Replaces the distance row with plain text (All Bookings: the date). */
  line?: string;
  /** Short grey text after the rating pill (Cart: "2 services · Rs 14,500"). */
  note?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const logo = api.media.url(logoUrl);
  const where = distanceKm !== null ? formatDistanceKm(distanceKm) : area;
  const label = accessibilityLabel ?? `${name}${line ? `, ${line}` : where ? `, ${where}` : ''}, rated ${rating.toFixed(1)}${note ? `, ${note}` : ''}`;
  const body = (
    <>
      <View style={styles.logo}>
        {logo && <Image source={logo} style={StyleSheet.absoluteFill} contentFit="cover" />}
      </View>
      <View style={styles.text}>
        <View style={styles.nameRow}>
          <Text variant="h4" color="secondary" numberOfLines={1} style={styles.name}>
            {name}
          </Text>
          {verified && <Icon name="verified" size={15} />}
        </View>
        {line ? (
          <Text variant="body12" weight="medium" color="secondaryTint2" numberOfLines={1} style={styles.line}>
            {line}
          </Text>
        ) : (
          where && (
            <View style={styles.row}>
              <Icon name="location-fill" size={20} color="secondary" />
              <Text variant="body12" weight="medium" color="secondaryTint2" numberOfLines={1}>
                {where}
              </Text>
            </View>
          )
        )}
        <View style={styles.ratingRow}>
          <View style={styles.rating}>
            <Icon name="star" size={14} />
            <Text variant="subText12" weight="semibold" color="secondaryTint2">
              {rating.toFixed(1)}
            </Text>
          </View>
          {note && (
            <Text variant="body12" weight="medium" color="secondaryTint2" numberOfLines={1} style={styles.note}>
              {note}
            </Text>
          )}
        </View>
      </View>
      {trailing && <View style={styles.trailing}>{trailing}</View>}
    </>
  );
  return onPress ? (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {body}
    </Pressable>
  ) : (
    <View style={styles.card} accessible accessibilityLabel={label}>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: BOOK.inset,
    height: B.height,
    padding: 10,
    borderRadius: BOOK.card.radius,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    gap: 16,
  },
  logo: {
    width: B.logo,
    height: B.logo,
    borderRadius: B.logoRadius,
    overflow: 'hidden',
    backgroundColor: colors.bubble,
  },
  text: {
    flex: 1,
    paddingTop: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    flexShrink: 1,
  },
  row: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pressed: {
    opacity: 0.9,
  },
  line: {
    marginTop: 10,
  },
  ratingRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  note: {
    flexShrink: 1,
  },
  trailing: {
    alignSelf: 'center',
    marginRight: 9,
  },
  rating: {
    alignSelf: 'flex-start',
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 30,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});
