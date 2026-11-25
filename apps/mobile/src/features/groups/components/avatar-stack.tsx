import { colors } from '@moment/shared';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui';
import { api } from '@/lib/api';
import type { Person } from '../queries';

/** Figma offsets of the four faces (48:3142): they overlap unevenly; "+N" sits after them. */
const OFFSETS = [0, 13.2, 34.7, 51.2];
const BADGE_OFFSET = 77.9;

/** Overlapping member faces with a lime "+N" (Groups list 48:3142, cards 48:4500). */
export function AvatarStack({ people, size = 24, max = 4 }: { people: Person[]; size?: number; max?: number }) {
  const shown = people.slice(0, max);
  const more = people.length - shown.length;
  const scale = size / 24.8;
  const width = more > 0 ? BADGE_OFFSET * scale + size : shown.length ? OFFSETS[shown.length - 1]! * scale + size : 0;
  return (
    <View style={{ width, height: size }} accessible accessibilityLabel={people.map((p) => p.display_name).join(', ')}>
      {shown.map((p, i) => {
        const photo = api.media.url(p.avatar_url);
        return (
          <View
            key={p.id}
            style={[styles.face, { left: OFFSETS[i]! * scale, width: size, height: size, borderRadius: size / 2, zIndex: max - i }]}
          >
            {photo ? (
              <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <Text style={{ fontSize: size * 0.42, lineHeight: size }} weight="bold" color="secondary">
                {p.display_name.charAt(0)}
              </Text>
            )}
          </View>
        );
      })}
      {more > 0 && (
        <View style={[styles.face, styles.more, { left: BADGE_OFFSET * scale, width: size, height: size, borderRadius: size / 2 }]}>
          <Text weight="medium" color="secondary" style={{ fontSize: size * 0.38, lineHeight: size * 0.5 }}>
            +{more}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  face: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
    backgroundColor: colors.secondaryTint6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  more: {
    backgroundColor: colors.primary,
  },
});
