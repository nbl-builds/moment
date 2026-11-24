import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { recordListingView } from '@/features/home/recently-viewed';
import { ComingNext } from '@/features/placeholders/coming-next';
import { api } from '@/lib/api';

/** Placeholder for Experience / Business details. Opening it counts as "Recently viewed". */
export default function ListingPlaceholder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listing = useQuery({ queryKey: ['listing', id], queryFn: () => api.catalog.getListing(id) });

  useEffect(() => {
    if (id) recordListingView(id).catch(() => undefined);
  }, [id]);

  return (
    <ComingNext
      title={listing.data?.title ?? 'Experience details'}
      note="Experience details, the host and booking come next."
    />
  );
}
