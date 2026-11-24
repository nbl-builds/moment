import { useLocalSearchParams } from 'expo-router';
import { ComingNext } from '@/features/placeholders/coming-next';

/** Where promo banners lead until their screens exist. */
export default function ComingSoon() {
  const { title } = useLocalSearchParams<{ title?: string }>();
  return <ComingNext title={title ?? 'Coming soon'} note="This offer opens here soon." />;
}
