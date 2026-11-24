import { promoColors } from '@moment/shared';
import type { Href } from 'expo-router';

/**
 * Promo banners at the top of Home (Figma 13:1492: "Invite and earn" with its
 * blue and coral neighbours). Static for now: edit this list to change them.
 * Later they can come from `platform_settings` without touching the screen.
 */
export interface Promo {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  background: (typeof promoColors)[keyof typeof promoColors];
  /** Artwork on the right (106pt square), optional. */
  art?: number;
  href: Href;
}

export const promos: Promo[] = [
  {
    id: 'invite-and-earn',
    title: 'Invite and earn',
    subtitle: 'Get 60% off on your first order',
    cta: 'Share Link',
    background: promoColors.teal,
    art: require('../../../assets/illustrations/piggy-bank.svg'),
    href: { pathname: '/coming-soon', params: { title: 'Invite and earn' } },
  },
  {
    id: 'weekend-getaways',
    title: 'Weekend getaways',
    subtitle: 'Day trips from your city, from Rs 1,500',
    cta: 'Explore',
    background: promoColors.blue,
    href: { pathname: '/coming-soon', params: { title: 'Weekend getaways' } },
  },
  {
    id: 'food-walks',
    title: 'Taste the city',
    subtitle: 'Food walks with locals who know every stall',
    cta: 'See walks',
    background: promoColors.coral,
    href: { pathname: '/coming-soon', params: { title: 'Food walks' } },
  },
];
