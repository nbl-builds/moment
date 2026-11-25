import { colors } from '@moment/shared';
import { Children, isValidElement, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text, type IconName } from '@/components/ui';

/** White card of 60pt rows with hairlines under the labels (Profile 48:3255). */
export function MenuCard({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={styles.card}>
      {rows.map((row, i) => (
        <View key={row.key ?? i}>
          {row}
          {i < rows.length - 1 && <View style={styles.divider} />}
        </View>
      ))}
    </View>
  );
}

/** One Profile row: icon, label, then a count badge or a chevron. */
export function MenuRow({
  icon,
  label,
  onPress,
  badge,
  accessibilityHint,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  badge?: number;
  accessibilityHint?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, ${badge} new` : label}
      accessibilityHint={accessibilityHint}
    >
      <Icon name={icon} size={24} color="secondary" />
      <Text variant="subText16" weight="medium" color="secondary" style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      {badge ? <CountBadge count={badge} /> : <Icon name="chevron-right" size={16} color="secondary" />}
    </Pressable>
  );
}

/** Red count circle (bell, Offers): 18pt, 10pt ExtraBold white. */
export function CountBadge({ count }: { count: number }) {
  return (
    <View style={styles.badge}>
      <Text variant="subText10" weight="extrabold" color="onBadge">
        {count > 9 ? '9+' : count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    borderRadius: 15,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  row: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 16,
    gap: 14,
  },
  pressed: {
    backgroundColor: colors.track,
  },
  label: {
    flex: 1,
  },
  divider: {
    marginLeft: 58,
    height: 1,
    backgroundColor: colors.divider,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.badge,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
