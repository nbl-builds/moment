import { colors } from '@moment/shared';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { api } from '@/lib/api';

const GAP = 20;
const INSET = 20;

/**
 * Photo grid (48:6527): one wide photo, then a square on the left and two
 * short ones stacked on the right. Tapping opens the viewer at that photo.
 */
export function PhotoGrid({ photos, onOpen }: { photos: string[]; onOpen: (index: number) => void }) {
  const { width } = useWindowDimensions();
  const full = width - INSET * 2;
  const half = (full - GAP) / 2;
  const [a, b, c, d] = photos;
  const tile = (url: string | undefined, index: number, w: number, h: number) =>
    url ? (
      <Pressable key={index} onPress={() => onOpen(index)} accessibilityRole="imagebutton" accessibilityLabel={`Photo ${index + 1}`}>
        <Image source={api.media.url(url)} style={[styles.photo, { width: w, height: h }]} contentFit="cover" transition={150} />
      </Pressable>
    ) : null;
  return (
    <View style={styles.grid}>
      {tile(a, 0, full, full * (183 / 386))}
      {(b || c) && (
        <View style={styles.row}>
          {tile(b, 1, half, half)}
          <View style={styles.column}>
            {tile(c, 2, half, (half - GAP) / 2)}
            {tile(d, 3, half, (half - GAP) / 2)}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    marginTop: 20,
    marginHorizontal: INSET,
    gap: GAP,
  },
  row: {
    flexDirection: 'row',
    gap: GAP,
  },
  column: {
    gap: GAP,
  },
  photo: {
    borderRadius: 12,
    backgroundColor: colors.secondaryTint6,
  },
});
