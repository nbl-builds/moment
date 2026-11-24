import { colors, withAlpha } from '@moment/shared';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui';
import { api } from '@/lib/api';
import { HOME } from '../layout';
import type { ListingCardData } from '../use-home-data';

const T = HOME.tile;
/** Figma: transparent from ~52% down to 80% black at the bottom. */
const SHADE_FROM = '52%';
const SHADE_TO = withAlpha(colors.black, 0.8);

/** "Local fun" / "Must-trys" tile (Figma 18:996): photo, dark fade, title at the bottom. */
export function AreaTile({ listing, onPress }: { listing: ListingCardData; onPress: () => void }) {
  const photo = api.media.url(listing.media[0]?.url);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={listing.title}
    >
      {photo && <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />}
      <View style={styles.shade} />
      <Text variant="body16" weight="bold" color="white" align="center" numberOfLines={2} style={styles.label}>
        {listing.title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: T.width,
    height: T.height,
    borderRadius: T.radius,
    overflow: 'hidden',
    backgroundColor: colors.secondaryTint6,
    justifyContent: 'flex-end',
  },
  pressed: {
    opacity: 0.9,
  },
  shade: {
    ...StyleSheet.absoluteFill,
    backgroundImage: `linear-gradient(to bottom, ${withAlpha(colors.black, 0)} ${SHADE_FROM}, ${SHADE_TO} 100%)`,
  },
  label: {
    marginHorizontal: 10,
    marginBottom: T.labelBottom,
  },
});
