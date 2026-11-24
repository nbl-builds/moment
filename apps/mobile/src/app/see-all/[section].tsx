import { useLocalSearchParams } from 'expo-router';
import { ComingNext } from '@/features/placeholders/coming-next';

/** Placeholder for a Home section's full list ("Popular activities", "Top Hosts", ...). */
export default function SeeAllPlaceholder() {
  const { title } = useLocalSearchParams<{ title?: string }>();
  return <ComingNext title={title ?? 'See all'} note="The full list for this section comes next." />;
}
