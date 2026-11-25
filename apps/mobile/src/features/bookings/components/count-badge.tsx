import { colors } from '@moment/shared';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui';

/** Red count badge (Figma 52:8565: #F35C5C, 24pt on cards, 14pt on icons). */
export function CountBadge({ count, size = 24, style }: { count: number; size?: 14 | 16 | 24; style?: object }) {
  if (count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);
  return (
    <View style={[styles.badge, { minWidth: size, height: size, borderRadius: size / 2, paddingHorizontal: size > 16 ? 6 : 3 }, style]} accessible={false}>
      <Text
        variant={size > 16 ? 'subText12' : 'subText10'}
        weight="extrabold"
        color="onBadge"
        style={size === 14 ? styles.tiny : undefined}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.badge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tiny: {
    fontSize: 8,
    lineHeight: 11,
  },
});
