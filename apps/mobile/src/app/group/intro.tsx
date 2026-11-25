import { colors } from '@moment/shared';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon, Text } from '@/components/ui';
import { BookingSheet } from '@/features/booking/components/booking-sheet';
import { markGroupsIntroSeen } from '@/features/groups/intro-seen';

/** Figma frame width; the collage is laid out in it and scaled to the screen. */
const FRAME = 428;
/** Collage photos (48:6213): x, y (frame, under a 44pt status bar), size. */
const COLLAGE: { src: number; x: number; y: number; size: number }[] = [
  { src: require('../../../assets/images/groups/ellipse53-a.png'), x: 311, y: 412, size: 46 },
  { src: require('../../../assets/images/groups/ellipse53-a.png'), x: 382, y: 571, size: 46 },
  { src: require('../../../assets/images/groups/ellipse64.png'), x: 87, y: 430, size: 32 },
  { src: require('../../../assets/images/groups/ellipse57.png'), x: 25, y: 519, size: 46 },
  { src: require('../../../assets/images/groups/ellipse54.png'), x: 182, y: 626, size: 47 },
  { src: require('../../../assets/images/groups/ellipse50.png'), x: 182, y: 699, size: 74 },
  { src: require('../../../assets/images/groups/ellipse60.png'), x: -9, y: 580, size: 74 },
  { src: require('../../../assets/images/groups/ellipse56.png'), x: 305, y: 314, size: 72 },
  { src: require('../../../assets/images/groups/ellipse62.png'), x: 178, y: 283, size: 72 },
  { src: require('../../../assets/images/groups/ellipse63.png'), x: 66, y: 313, size: 74 },
  { src: require('../../../assets/images/groups/ellipse51.png'), x: 45, y: 645, size: 108 },
  { src: require('../../../assets/images/groups/ellipse59.png'), x: -37, y: 396, size: 108 },
  { src: require('../../../assets/images/groups/ellipse52.png'), x: 285, y: 639, size: 108 },
  { src: require('../../../assets/images/groups/ellipse58.png'), x: 357, y: 426, size: 108 },
];
/** The three soft photo shapes in the middle, at 50% (48:6229). */
const BLOBS: { src: number; x: number; y: number; w: number; h: number }[] = [
  { src: require('../../../assets/images/groups/vector-right.png'), x: 219, y: 380, w: 119, h: 219 },
  { src: require('../../../assets/images/groups/vector-left.png'), x: 132.5, y: 380, w: 120, h: 219 },
  { src: require('../../../assets/images/groups/vector-small.png'), x: 90, y: 499, w: 70, h: 99 },
];
const HERO_TOP = 270;
const HERO_HEIGHT = 520;
const BAR = 98;

const FAQ = [
  { q: 'What is a group?', a: 'A shared space to plan with friends or family: save experiences together, see what everyone likes and book as a group.' },
  { q: 'Who can join?', a: 'People you invite. If you turn on sharing, anyone with your group link can join too.' },
  { q: 'What is Group Match?', a: 'Open your group to match and we’ll suggest other groups heading to the same city, so you can plan together.' },
  { q: 'Does it cost anything?', a: 'No. Groups are free; you only pay for what you book.' },
];

/** "Moment Groups" intro (48:6213 top, 48:6274 full scroll), shown before the first group. */
export default function GroupsIntro() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [faq, setFaq] = useState(false);
  const k = width / FRAME;
  const shift = insets.top - 44;

  const create = async () => {
    await markGroupsIntroSeen();
    router.replace('/group/new');
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: BAR + insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {/* Hero: title over the photo collage */}
        <View style={{ height: HERO_TOP + HERO_HEIGHT + shift + 60 }}>
          <Text weight="extrabold" color="secondary" align="center" style={[styles.title, { marginTop: insets.top + 74 }]} accessibilityRole="header">
            Moment{'\n'}Groups
          </Text>
          {BLOBS.map((b, i) => (
            <Image key={`b${i}`} source={b.src} style={[styles.abs, styles.blob, { left: b.x * k, top: b.y + shift, width: b.w * k, height: b.h * k }]} accessible={false} />
          ))}
          {COLLAGE.map((c, i) => (
            <Image
              key={`c${i}`}
              source={c.src}
              style={[styles.abs, { left: c.x * k, top: c.y + shift, width: c.size * k, height: c.size * k, borderRadius: (c.size * k) / 2 }]}
              accessible={false}
            />
          ))}
        </View>

        {/* Invite. Plan. Enjoy. */}
        <Text variant="h2" color="secondary" align="center" accessibilityRole="header">
          Invite. Plan. Enjoy.
        </Text>
        <View style={styles.carousel}>
          <View style={[styles.sideCard, styles.leftCard]} />
          <View style={[styles.sideCard, styles.rightCard]} />
          <Image source={require('../../../assets/images/groups/jeep.jpg')} style={styles.mainCard} contentFit="cover" accessibilityLabel="Friends on a road trip" />
        </View>

        {/* Find things to do together */}
        <View style={styles.hero}>
          <Image source={require('../../../assets/images/groups/hikers.png')} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
          <Text weight="semibold" color="white" align="center" style={styles.heroText} accessibilityRole="header">
            Find things to do{'\n'}together
          </Text>
        </View>

        {/* Some things are more enjoyable together */}
        <View style={styles.closing}>
          <Text variant="h2" color="secondary" accessibilityRole="header">
            Some things are more enjoyable together
          </Text>
          <Text variant="subText16" color="secondary" style={styles.closingBody}>
            Time to dust off your bags and start planning your next adventure with your group.
          </Text>
        </View>
      </ScrollView>

      <Pressable onPress={() => router.back()} hitSlop={10} style={[styles.close, { top: insets.top + 16 }]} accessibilityRole="button" accessibilityLabel="Close">
        <Icon name="close-thin" size={28} color="secondary" />
      </Pressable>

      <View style={[styles.bar, { paddingBottom: insets.bottom + 8 }]}>
        <Text
          variant="subText14"
          weight="medium"
          color="secondary"
          style={styles.questions}
          onPress={() => setFaq(true)}
          accessibilityRole="button"
        >
          Questions?
        </Text>
        <Button label="Create group" variant="dark" size="small" onPress={() => void create()} style={styles.create} />
      </View>

      <BookingSheet visible={faq} onClose={() => setFaq(false)} title="Questions?" top={330}>
        <View style={styles.faq}>
          {FAQ.map((f) => (
            <View key={f.q} style={styles.faqItem}>
              <Text variant="body16" weight="bold" color="secondary">
                {f.q}
              </Text>
              <Text variant="body14" weight="medium" color="secondaryTint2">
                {f.a}
              </Text>
            </View>
          ))}
        </View>
      </BookingSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  title: {
    fontSize: 50,
    lineHeight: 57,
    letterSpacing: 0.5,
  },
  abs: {
    position: 'absolute',
  },
  blob: {
    opacity: 0.5,
  },
  carousel: {
    marginTop: 40,
    height: 182,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideCard: {
    position: 'absolute',
    top: 29,
    width: 278,
    height: 123,
    borderRadius: 17,
  },
  leftCard: {
    left: -243,
    backgroundColor: colors.introBlue,
  },
  rightCard: {
    right: -253,
    backgroundColor: colors.introYellow,
  },
  mainCard: {
    width: 344,
    height: 182,
    borderRadius: 20,
  },
  hero: {
    marginTop: 40,
    height: 624,
    overflow: 'hidden',
  },
  heroText: {
    marginTop: 35,
    fontSize: 25,
    lineHeight: 35,
    letterSpacing: 0.25,
  },
  closing: {
    marginTop: 41,
    marginHorizontal: 22,
  },
  closingBody: {
    marginTop: 20,
  },
  close: {
    position: 'absolute',
    left: 20,
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 25,
    paddingLeft: 32,
    paddingRight: 18,
  },
  questions: {
    textDecorationLine: 'underline',
  },
  create: {
    height: 49,
    paddingHorizontal: 26,
    borderRadius: 12,
  },
  faq: {
    marginTop: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 18,
  },
  faqItem: {
    gap: 4,
  },
});
