import { colors, hostTileColors } from '@moment/shared';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from '@/components/ui';
import { api } from '@/lib/api';
import { HOME } from '../layout';
import type { HostCardData } from '../use-home-data';

const H = HOME.host;
const CHIP = HOME.card.chip;

/**
 * Top Hosts tile (Figma 17:1074): the host's cut-out photo on a coloured
 * rounded square, rating chip over its bottom edge, name and role below.
 */
export function HostCard({ host, index, onPress }: { host: HostCardData; index: number; onPress: () => void }) {
  const photo = api.media.url(host.avatar_url);
  const tint = hostTileColors[index % hostTileColors.length];

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
});
