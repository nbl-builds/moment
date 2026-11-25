import { colors } from '@moment/shared';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton, Text } from '@/components/ui';
import { useListing } from '@/features/booking/queries';
import { FilterChips } from '@/features/business/components/filter-chips';
import { PhotoViewer } from '@/features/business/components/photo-viewer';
import { ReviewItem } from '@/features/business/components/review-item';
import { api } from '@/lib/api';

/** "View All Reviews" for an experience, with star filters (business review components; no Figma frame). */
export default function ExperienceReviews() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const listing = useListing(id);
  const [rating, setRating] = useState<number | null>(null);
  const [viewer, setViewer] = useState<{ photos: string[]; index: number } | null>(null);
  const all = useQuery({
    queryKey: ['listing', id, 'reviews', 'all'],
    queryFn: () => api.catalog.listReviews({ listingId: id }, { limit: 200 }),
    enabled: Boolean(id),
  });
  const counts = [5, 4, 3, 2, 1].map((n) => ({ n, count: (all.data ?? []).filter((r) => r.rating === n).length }));
  const shown = (all.data ?? []).filter((r) => rating === null || r.rating === rating);
  const chips = [
    { value: null, label: `All (${all.data?.length ?? 0})` },
    ...counts.filter((c) => c.count > 0).map((c) => ({ value: c.n, label: `${c.n} ★ (${c.count})` })),
  ];

  return (
    <View style={styles.screen}>
      <FlatList
        data={shown}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 20 }} />}
        ListHeaderComponent={
          <View>
            <View style={styles.inset}>
              <BackButton />
              <Text variant="h3" color="secondary" style={styles.title} accessibilityRole="header">
                Reviews
              </Text>
              <Text variant="body14" weight="medium" color="secondaryTint2" numberOfLines={1}>
                {listing.data ? `${Number(listing.data.rating_avg).toFixed(1)} ★ · ${listing.data.title}` : ' '}
              </Text>
            </View>
            <View style={styles.chips}>
              <FilterChips chips={chips} value={rating} onChange={setRating} />
            </View>
          </View>
        }
        ListEmptyComponent={
          all.isPending ? (
            <ActivityIndicator style={styles.state} color={colors.secondary} />
          ) : (
            <Text variant="body14" weight="medium" color="secondaryTint2" align="center" style={styles.state}>
              {rating ? 'No reviews with this rating.' : 'No reviews yet.'}
            </Text>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.inset}>
            <ReviewItem review={item} onOpenPhoto={(p, i) => setViewer({ photos: p, index: i })} />
          </View>
        )}
      />
      <PhotoViewer photos={viewer?.photos ?? null} index={viewer?.index ?? 0} onClose={() => setViewer(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  inset: {
    paddingHorizontal: 20,
  },
  title: {
    marginTop: 24,
  },
  chips: {
    marginTop: 20,
    marginBottom: 20,
  },
  state: {
    marginTop: 40,
  },
});
