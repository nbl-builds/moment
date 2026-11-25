import { colors } from '@moment/shared';
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui';
import { api } from '@/lib/api';

/** A person with a face, a name, a small note and something on the right. */
export function PersonRow({ name, avatarUrl, note, right }: { name: string; avatarUrl: string | null; note?: string; right?: ReactNode }) {
  const photo = api.media.url(avatarUrl);
  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        {photo ? (
          <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <Text variant="body16" weight="bold" color="secondary">
            {name.charAt(0)}
          </Text>
        )}
      </View>
      <View style={styles.text}>
        <Text variant="body16" weight="bold" color="secondary" numberOfLines={1}>
          {name}
        </Text>
        {note ? (
          <Text variant="body12" weight="medium" color="secondaryTint2">
            {note}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    borderRadius: 15,
    backgroundColor: colors.surface,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: colors.secondaryTint6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  right: {
    justifyContent: 'center',
  },
});
