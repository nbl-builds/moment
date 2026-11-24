import { colors } from '@moment/shared';
import { Image, type ImageSource } from 'expo-image';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Text } from '@/components/ui';
import { QUIZ } from '../layout';

// Figma "Adventure Quiz" (20:2060): a collage of round photos and emoji bubbles
// above a white sheet. Positions are frame coordinates (428 wide, status bar 44).
const FRAME_STATUS = 44;
const SHEET_TOP = 599;

type Crop = { width: string; height: string; left: string; top: string };
interface Bubble {
  x: number;
  y: number;
  size: number;
  photo?: ImageSource | number;
  /** Figma crops some photos inside the circle. */
  crop?: Crop;
  /** Emoji on a Black Tint 7 circle. */
  emoji?: { source: number; size: number };
}

// Back to front, in Figma's layer order.
const BUBBLES: Bubble[] = [
  { x: 105, y: 379, size: 190, photo: require('../../../../assets/quiz/intro-3073.jpg'), crop: { width: '122.29%', height: '183.41%', left: '-10.53%', top: '-66.84%' } },
  { x: -25, y: 445, size: 80, photo: require('../../../../assets/quiz/intro-e61.png') },
  { x: 75, y: 160, size: 70, emoji: { source: require('../../../../assets/quiz/emoji-cool.png'), size: 40 } },
  { x: 335, y: 82, size: 40, emoji: { source: require('../../../../assets/quiz/emoji-fearful.png'), size: 26 } },
  { x: 333, y: 469, size: 50, emoji: { source: require('../../../../assets/quiz/emoji-happy.png'), size: 36 } },
  { x: -34, y: 244, size: 150, photo: require('../../../../assets/quiz/intro-3068.jpg'), crop: { width: '100%', height: '149.98%', left: '5.33%', top: '-36.99%' } },
  { x: 169, y: 82, size: 106, photo: require('../../../../assets/quiz/intro-3072.jpg') },
  { x: 295, y: 188, size: 125, photo: require('../../../../assets/quiz/intro-3075.jpg'), crop: { width: '149.98%', height: '100%', left: '-2.59%', top: '-1.6%' } },
  { x: 151, y: 244, size: 115, photo: require('../../../../assets/quiz/intro-3076.jpg') },
  { x: 335, y: 345, size: 100, photo: require('../../../../assets/quiz/intro-3077.jpg') },
  { x: 30, y: 67, size: 60, photo: require('../../../../assets/quiz/intro-3074.jpg') },
];

interface QuizIntroProps {
  onStart: () => void;
  loading: boolean;
  error: boolean;
}

/** The quiz's first screen: collage, title, what the quiz does and "Start Quiz". */
export function QuizIntro({ onStart, loading, error }: QuizIntroProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const s = width / 428;
  // Keep the collage under the real status bar; the sheet grows to the bottom.
  const offset = insets.top - FRAME_STATUS;

  return (
    <View style={styles.screen}>
      <View style={StyleSheet.absoluteFill} accessible={false} importantForAccessibility="no-hide-descendants">
        {BUBBLES.map((b, i) => (
          <View
            key={i}
            style={[
              styles.bubble,
              { left: b.x * s, top: offset + b.y * s, width: b.size * s, height: b.size * s, borderRadius: (b.size * s) / 2 },
              b.emoji && styles.emojiBubble,
            ]}
          >
            {b.photo !== undefined &&
              (b.crop ? (
                <Image source={b.photo} style={[styles.cropped, b.crop as object]} contentFit="fill" />
              ) : (
                <Image source={b.photo} style={StyleSheet.absoluteFill} contentFit="cover" />
              ))}
            {b.emoji && <Image source={b.emoji.source} style={{ width: b.emoji.size * s, height: b.emoji.size * s }} />}
          </View>
        ))}
      </View>

      <View style={[styles.sheet, { top: offset + SHEET_TOP * s, paddingBottom: insets.bottom + 13 }]}>
        <Text variant="h1" color="secondary" align="center" accessibilityRole="header">
          Adventure Quiz
        </Text>
        <Text variant="body15" weight="medium" color="secondaryTint2" align="center" style={styles.body}>
          Take a fun and fast Moment Adventure Quiz to discover your personality type. You&apos;ll get recommendations for
          activities, experiences, travel, adventures and more based on your personality, style, and location.
        </Text>
        {error && (
          <Text variant="body14" color="error" align="center" style={styles.error}>
            Couldn&apos;t load the quiz. Check your connection and try again.
          </Text>
        )}
        <Button label={error ? 'Try again' : 'Start Quiz'} onPress={onStart} loading={loading} style={styles.button} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  bubble: {
    position: 'absolute',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiBubble: {
    backgroundColor: colors.bubble,
  },
  cropped: {
    position: 'absolute',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: QUIZ.inset,
  },
  // Figma: title 619 -> body 671 (title 38pt tall, so 14pt gap).
  body: {
    marginTop: 14,
  },
  error: {
    marginTop: 12,
  },
  button: {
    marginTop: 'auto',
  },
});
