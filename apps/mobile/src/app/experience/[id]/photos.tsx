import { colors } from '@moment/shared';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton, Text } from '@/components/ui';
import { useListing } from '@/features/booking/queries';
import { PhotoViewer } from '@/features/business/components/photo-viewer';
import { api } from '@/lib/api';

const GAP = 10;
const INSET = 20;

/** "View All Photos": every photo of an experience in a grid; tap for full screen. No Figma frame. */
export default function ExperiencePhotos() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const listing = useListing(id);
  const [index, setIndex] = useState<number | null>(null);
  const photos = (listing.data?.media ?? []).slice().sort((a, b) => a.sort_order - b.sort_order).map((m) => m.url);
  const size = (width - INSET * 2 - GAP) / 2;

  return (
    <View style={styles.screen}>
      <FlatList
        data={photos}
        numColumns={2}
        keyExtractor={(p, i) => `${i}-${p}`}
        columnWrapperStyle={styles.row}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24, paddingHorizontal: INSET, gap: GAP }}
        ListHeaderComponent={
          <View style={styles.header}>
            <BackButton />
            <Text variant="h3" color="secondary" style={styles.title} accessibilityRole="header">
              Photos
            </Text>
            <Text variant="body14" weight="medium" color="secondaryTint2" numberOfLines={1}>
              {listing.data?.title}
            </Text>
          </View>
        }
        renderItem={({ item, index: i }) => (
          <Pressable onPress={() => setIndex(i)} accessibilityRole="imagebutton" accessibilityLabel={`Photo ${i + 1} of ${photos.length}`}>
            <Image source={api.media.url(item)} style={[styles.photo, { width: size, height: size }]} contentFit="cover" transition={150} />
          </Pressable>
        )}
      />
      <PhotoViewer photos={index === null ? null : photos} index={index ?? 0} onClose={() => setIndex(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  header: {
    marginBottom: 10,
  },
  title: {
    marginTop: 24,
  },
  row: {
    gap: GAP,
  },
  photo: {
    borderRadius: 12,
    backgroundColor: colors.secondaryTint6,
  },
});
