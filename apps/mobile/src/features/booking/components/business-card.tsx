import { colors, formatDistanceKm } from '@moment/shared';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { Icon, Text } from '@/components/ui';
import { api } from '@/lib/api';
import { BOOK } from '../layout';

const B = BOOK.business;

/** Business at the top of Confirm Reservation (47:5143): logo, name, distance, rating. */
export function BusinessCard({
  name,
  logoUrl,
  verified,
  distanceKm,
  area,
  rating,
}: {
  name: string;
  logoUrl: string | null;
  verified: boolean;
  distanceKm: number | null;
  /** Shown instead of the distance when we don't know where the user is. */
  area: string | null;
  rating: number;
}) {
  const logo = api.media.url(logoUrl);
  const where = distanceKm !== null ? formatDistanceKm(distanceKm) : area;
  return (
    <View style={styles.card} accessible accessibilityLabel={`${name}${where ? `, ${where}` : ''}, rated ${rating.toFixed(1)}`}>
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
        {where && (
          <View style={styles.row}>
            <Icon name="location-fill" size={20} color="secondary" />
            <Text variant="body12" weight="medium" color="secondaryTint2" numberOfLines={1}>
              {where}
            </Text>
          </View>
        )}
        <View style={styles.rating}>
          <Icon name="star" size={14} />
          <Text variant="subText12" weight="semibold" color="secondaryTint2">
            {rating.toFixed(1)}
          </Text>
        </View>
      </View>
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
  rating: {
    marginTop: 8,
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
