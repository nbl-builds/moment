import { colors } from '@moment/shared';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { ComingNext } from '@/features/placeholders/coming-next';
import { api } from '@/lib/api';

/**
 * Old links to `/listing/<id or slug>`: experiences go to Experience details,
 * services to their business on the Services tab.
 */
export default function ListingRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listing = useQuery({ queryKey: ['listing', id], queryFn: () => api.catalog.getListing(id) });
  const l = listing.data;

  useEffect(() => {
    if (!l) return;
    if (l.type === 'service') router.replace({ pathname: '/business/[slug]', params: { slug: l.business.slug, tab: 'services' } });
    else router.replace({ pathname: '/experience/[id]', params: { id: l.id } });
  }, [l]);

  if (listing.isError) return <ComingNext title="Not found" note="This listing isn’t available any more." />;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundMuted }}>
      <ActivityIndicator color={colors.secondary} />
    </View>
  );
}
