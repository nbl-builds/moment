import { colors, spacing, withAlpha } from '@moment/shared';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui';
import { GRADIENT_HEIGHT_RATIO, GRADIENT_SOLID_STOP, TITLE_MAX_WIDTH } from './layout';
import type { OnboardingSlideData } from './slides';

interface OnboardingSlideProps {
  slide: OnboardingSlideData;
  width: number;
  height: number;
  /** Distance from the bottom of the screen to the bottom of the subtitle. */
  textBottom: number;
}

/** One full-screen slide: photo, gradient, title and subtitle. Dots and buttons are shared. */
export function OnboardingSlide({ slide, width, height, textBottom }: OnboardingSlideProps) {
  return (
    <View style={[styles.slide, { width, height }]}>
      <Image
        source={slide.image}
        style={[styles.photo, { width, height: width / slide.imageAspectRatio }]}
        contentFit="cover"
        accessible={false}
      />
      <View style={[styles.gradient, { height: height * GRADIENT_HEIGHT_RATIO }]} />
      <View style={[styles.text, { bottom: textBottom }]}>
        <Text variant="h2" color="white" align="center" style={styles.title}>
          {slide.title}
        </Text>
        <Text variant="body14" weight="medium" color="white" align="center">
          {slide.subtitle}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    backgroundColor: colors.secondary,
    overflow: 'hidden',
  },
  photo: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `linear-gradient(to bottom, ${withAlpha(colors.secondary, 0)} 0%, ${colors.secondary} ${GRADIENT_SOLID_STOP})`,
  },
  text: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    alignItems: 'center',
    gap: spacing.lg,
  },
  title: {
    maxWidth: TITLE_MAX_WIDTH,
  },
});
