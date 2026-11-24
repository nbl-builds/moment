import type { ImageProps } from 'expo-image';

export interface OnboardingSlideData {
  key: string;
  image: ImageProps['source'];
  /** Width / height of the photo layer in Figma; it is pinned to the top at full width. */
  imageAspectRatio: number;
  title: string;
  subtitle: string;
}

// Same copy on every slide for now (as in Figma).
const TITLE = 'Discover Unforgettable Experiences.';
const SUBTITLE = 'Live like a local, anywhere in the world';

/**
 * Onboarding slides, in order. The pager, dots and Next button follow this
 * list, so adding or removing a slide needs no other change.
 */
export const onboardingSlides: OnboardingSlideData[] = [
  {
    // Figma: "Onboarding 1" (node 6:1422), photo 428 x 804
    key: 'couple',
    image: require('../../../assets/onboarding-1.png'),
    imageAspectRatio: 428 / 804,
    title: TITLE,
    subtitle: SUBTITLE,
  },
  {
    // Figma: "Onboarding 2" (node 7:175), photo 428 x 786
    key: 'canyon-hike',
    image: require('../../../assets/onboarding-2.png'),
    imageAspectRatio: 428 / 786,
    title: TITLE,
    subtitle: SUBTITLE,
  },
  {
    // Figma: "Onboarding 3" (node 7:212), photo 428 x 797
    key: 'camping',
    image: require('../../../assets/onboarding-3.png'),
    imageAspectRatio: 428 / 797,
    title: TITLE,
    subtitle: SUBTITLE,
  },
  {
    // Figma: "Onboarding 4" (node 7:249), photo 427 x 804
    key: 'island',
    image: require('../../../assets/onboarding-4.png'),
    imageAspectRatio: 427 / 804,
    title: TITLE,
    subtitle: SUBTITLE,
  },
];
