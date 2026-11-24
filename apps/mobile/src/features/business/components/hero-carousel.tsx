import { colors } from '@moment/shared';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { api } from '@/lib/api';

/** One hero photo (25:2265), full width. */
function Photo({ uri, width, height }: { uri: string; width: number; height: number }) {
  return <Image source={{ uri: api.media.url(uri) ?? undefined }} style={{ width, height }} contentFit="cover" transition={150} accessible={false} />;
}

/** Page dots: the current one 10pt and solid, the rest 7pt at 50%. Follows the swipe. */
function Dots({ count, pagerX, width }: { count: number; pagerX: SharedValue<number>; width: number }) {
  if (count < 2) return null;
  return (
    <View style={styles.dots}>
      {Array.from({ length: count }, (_, i) => (
        <Dot key={i} index={i} pagerX={pagerX} width={width} />
      ))}
    </View>
  );
}

function Dot({ index, pagerX, width }: { index: number; pagerX: SharedValue<number>; width: number }) {
  const style = useAnimatedStyle(() => {
    const t = interpolate(Math.abs(pagerX.get() / width - index), [0, 1], [1, 0], 'clamp');
    const size = 7 + 3 * t;
    return { width: size, height: size, borderRadius: size / 2, opacity: 0.5 + 0.5 * t };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

export const HeroCarousel = { Photo, Dots };

const styles = StyleSheet.create({
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    backgroundColor: colors.white,
  },
});
