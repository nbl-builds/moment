import { colors, lineHeightPx } from '@moment/shared';
import { useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui';
import { useLoginSheet } from '@/features/auth/login-sheet-provider';
import {
  DOT_SIZE,
  DOTS_TO_FOOTER,
  FOOTER_GAP_ABOVE_SAFE_AREA,
  FOOTER_HORIZONTAL_INSET,
  TEXT_TO_DOTS,
} from '@/features/onboarding/layout';
import { OnboardingSlide } from '@/features/onboarding/onboarding-slide';
import { PageDots } from '@/features/onboarding/page-dots';
import { onboardingSlides, type OnboardingSlideData } from '@/features/onboarding/slides';

const BUTTON_HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

export default function OnboardingScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<OnboardingSlideData>>(null);
  const [index, setIndex] = useState(0);
  const { openLoginSheet } = useLoginSheet();

  const footerBottom = insets.bottom + FOOTER_GAP_ABOVE_SAFE_AREA;
  const dotsBottom = footerBottom + lineHeightPx('body14') + DOTS_TO_FOOTER;
  const textBottom = dotsBottom + DOT_SIZE + TEXT_TO_DOTS;

  const lastIndex = onboardingSlides.length - 1;

  // Track the slide nearest the centre while swiping, so the active dot moves with the finger.
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.min(Math.max(Math.round(e.nativeEvent.contentOffset.x / width), 0), lastIndex);
    setIndex(next);
  };

  // Next goes to the following slide; on the last slide it opens "Login or sign up", like Skip.
  const onNext = () => {
    if (index < lastIndex) listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    else openLoginSheet();
  };
  const onSkip = openLoginSheet;

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={onboardingSlides}
        keyExtractor={(slide) => slide.key}
        renderItem={({ item }) => <OnboardingSlide slide={item} width={width} height={height} textBottom={textBottom} />}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
      />

      <View style={[styles.dots, { bottom: dotsBottom }]} pointerEvents="none">
        <PageDots count={onboardingSlides.length} activeIndex={index} />
      </View>

      <View style={[styles.footer, { bottom: footerBottom }]}>
        <Pressable onPress={onSkip} hitSlop={BUTTON_HIT_SLOP} accessibilityRole="button">
          <Text variant="body14" weight="medium" color="white">
            Skip
          </Text>
        </Pressable>
        <Pressable onPress={onNext} hitSlop={BUTTON_HIT_SLOP} accessibilityRole="button">
          <Text variant="body14" weight="medium" color="white">
            Next
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.secondary,
  },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  footer: {
    position: 'absolute',
    left: FOOTER_HORIZONTAL_INSET,
    right: FOOTER_HORIZONTAL_INSET,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
