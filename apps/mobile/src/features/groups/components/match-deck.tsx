import { colors } from '@moment/shared';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { Icon, Text } from '@/components/ui';
import { api } from '@/lib/api';
import type { GroupMatch, Person } from '../queries';
import { AvatarStack } from './avatar-stack';

/** Figma: the front card is 356 x 359; cards behind are 40% and ~92% size (48:4500). */
const CARD_WIDTH = 356;
const CARD_HEIGHT = 359;
const GAP = 8;

type Match = GroupMatch & { members: Person[] };

/**
 * Group Match (48:4500): swipe through groups to match with; the cards on
 * either side are dimmed and smaller. The heart sends (or takes back) a match request.
 */
export function MatchDeck({ matches, onHeart }: { matches: Match[]; onHeart: (m: Match) => void }) {
  const { width } = useWindowDimensions();
  const step = CARD_WIDTH + GAP;
  const x = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    x.set(e.contentOffset.x);
  });
  return (
    <Animated.ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={step}
      decelerationRate="fast"
      onScroll={onScroll}
      scrollEventThrottle={16}
      contentContainerStyle={{ paddingHorizontal: (width - CARD_WIDTH) / 2, gap: GAP }}
      accessibilityLabel={`Group Match, ${matches.length} groups`}
    >
      {matches.map((m, i) => (
        <MatchCard key={m.id} match={m} index={i} x={x} step={step} onHeart={() => onHeart(m)} />
      ))}
    </Animated.ScrollView>
  );
}

function MatchCard({ match: m, index, x, step, onHeart }: { match: Match; index: number; x: SharedValue<number>; step: number; onHeart: () => void }) {
  const style = useAnimatedStyle(() => {
    const d = Math.abs(x.value / step - index);
    return { opacity: interpolate(d, [0, 1], [1, 0.4], 'clamp'), transform: [{ scale: interpolate(d, [0, 1], [1, 0.92], 'clamp') }] };
  });
  const sent = m.request_status !== null;
  const cover = api.media.url(m.cover_url);
  return (
    <Animated.View style={[styles.card, style]} accessible={false}>
      <View style={styles.photo}>{cover && <Image source={cover} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />}</View>
      <View style={styles.footer}>
        <View style={styles.text}>
          <Text variant="body15" weight="bold" color="secondary" numberOfLines={1} accessibilityRole="header">
            {m.name}
          </Text>
          <Text variant="subText10" color="secondaryTint2" style={styles.liked}>
            {m.destination_city ? `${m.member_count} going to ${m.destination_city} · Liked by` : 'Liked by'}
          </Text>
          <AvatarStack people={m.members} size={22.75} />
        </View>
        <Pressable
          onPress={onHeart}
          style={({ pressed }) => [styles.heart, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={sent ? `Match request sent to ${m.name}. Tap to take it back` : `Match with ${m.name}`}
          accessibilityState={{ selected: sent }}
        >
          <Icon name={sent ? 'heart-solid' : 'heart'} size={30} color="heart" />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 14,
    backgroundColor: colors.surface,
    padding: 9,
  },
  photo: {
    height: 262,
    borderRadius: 11,
    overflow: 'hidden',
    backgroundColor: colors.secondaryTint6,
  },
  footer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
  },
  text: {
    flex: 1,
    gap: 3,
  },
  liked: {
    marginBottom: 2,
  },
  heart: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.heartSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});
