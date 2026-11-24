import { useLocalSearchParams } from 'expo-router';
import { ComingNext } from '@/features/placeholders/coming-next';

/** Placeholder for a category's results (Search with a category filter). */
export default function CategoryPlaceholder() {
  const { name } = useLocalSearchParams<{ name?: string }>();
  return <ComingNext title={name ?? 'Category'} note="Search results for this category come with Search and filters." />;
}
