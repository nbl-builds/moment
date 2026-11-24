import { colors } from '@moment/shared';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { api } from '@/lib/api';

/**
 * A list's picture: its first item's photo, or the bucket mark from the empty
 * state on a pale lime tile while the list is empty.
 */
export function ListThumbnail({ url, size, radius }: { url: string | null; size: number; radius: number }) {
  const photo = api.media.url(url);
  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: radius }]}>
      {photo ? (
        <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
      ) : (
        <Image
          source={require('../../../../assets/illustrations/bucket-list.svg')}
          style={{ width: size * 0.5, height: size * 0.5 }}
          contentFit="contain"
          accessible={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryTint6,
  },
});
