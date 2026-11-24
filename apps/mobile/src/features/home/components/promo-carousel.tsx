import { Image } from 'expo-image';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Text } from '@/components/ui';
import { HOME } from '../layout';
import { promos, type Promo } from '../promos';

const P = HOME.promo;
const ART = 106;

/**
 * Promo banners (Figma 15:1007): 344pt cards centred with the previous and
 * next banners peeking in at the edges; snaps one banner at a time.
 */
export function PromoCarousel() {
  const { width } = useWindowDimensions();
  const sidePadding = (width - P.width) / 2;

  return (
    <FlatList
      horizontal
      data={promos}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => <PromoBanner promo={item} />}
      showsHorizontalScrollIndicator={false}
      snapToInterval={P.width + P.gap}
      decelerationRate="fast"
      disableIntervalMomentum
      contentContainerStyle={{ paddingHorizontal: sidePadding, gap: P.gap }}
      // Start on the middle banner so both neighbours peek in, as in Figma.
      initialScrollIndex={Math.min(1, promos.length - 1)}
      getItemLayout={(_, index) => ({ length: P.width + P.gap, offset: (P.width + P.gap) * index, index })}
      accessibilityLabel="Offers"
    />
  );
}

function PromoBanner({ promo }: { promo: Promo }) {
  const open = () => router.push(promo.href);
  return (
    <Pressable
      onPress={open}
      style={[styles.banner, { backgroundColor: promo.background }]}
      accessibilityRole="button"
      accessibilityLabel={`${promo.title}. ${promo.subtitle}`}
    >
      <View style={styles.text}>
        <Text variant="h4" color="white" numberOfLines={1}>
          {promo.title}
        </Text>
        <Text variant="body12" weight="medium" color="white" numberOfLines={2} style={styles.subtitle}>
          {promo.subtitle}
        </Text>
        {/* Same action as the banner, which screen readers already announce. */}
        <Button
          label={promo.cta}
          variant="light"
          size="small"
          onPress={open}
          style={styles.cta}
          accessible={false}
          importantForAccessibility="no"
        />
      </View>
      {promo.art !== undefined && (
        <Image source={promo.art} style={styles.art} contentFit="contain" accessible={false} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: P.width,
    height: P.height,
    borderRadius: P.radius,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  // Figma: title 19pt from the top, 20pt from the left.
  text: {
    flex: 1,
    paddingTop: 19,
    paddingLeft: 20,
  },
  subtitle: {
    marginTop: 8,
  },
  cta: {
    marginTop: 'auto',
    marginBottom: 20,
  },
  // Figma: 106pt artwork 12pt from the top, 20pt from the right.
  art: {
    width: ART,
    height: ART,
    marginTop: 12,
    marginRight: 20,
  },
});
