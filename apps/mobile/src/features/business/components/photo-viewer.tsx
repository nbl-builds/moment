import { colors } from '@moment/shared';
import { Image } from 'expo-image';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, Text } from '@/components/ui';
import { api } from '@/lib/api';

/** Full-screen photos from a review: swipe between them, x to close. Not in Figma. */
export function PhotoViewer({ photos, index, onClose }: { photos: string[] | null; index: number; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(index);
  const [shownFor, setShownFor] = useState<string[] | null>(null);
  if (photos !== shownFor) {
    setShownFor(photos);
    setPage(index);
  }

  return (
    <Modal visible={photos !== null} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.screen}>
        {photos && (
          <FlatList
            data={photos}
            horizontal
            pagingEnabled
            initialScrollIndex={index}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            keyExtractor={(p, i) => `${i}-${p}`}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => (
              <Image source={{ uri: api.media.url(item) ?? undefined }} style={{ width, height }} contentFit="contain" accessibilityLabel="Review photo" />
            )}
          />
        )}
        <Pressable onPress={onClose} style={[styles.close, { top: insets.top + 12 }]} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close photos">
          <Icon name="close" size={28} color="white" />
        </Pressable>
        {photos && photos.length > 1 && (
          <Text variant="body14" weight="medium" color="white" style={[styles.counter, { bottom: insets.bottom + 20 }]}>
            {page + 1} / {photos.length}
          </Text>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.black,
  },
  close: {
    position: 'absolute',
    left: 20,
  },
  counter: {
    position: 'absolute',
    alignSelf: 'center',
  },
});
