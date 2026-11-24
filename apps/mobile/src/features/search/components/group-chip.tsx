import { colors } from '@moment/shared';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text, type IconName } from '@/components/ui';

const BADGE = 20;

interface GroupChipProps {
  label: string;
  icon?: IconName;
  selected?: boolean;
  onPress?: () => void;
  /** Shows the dark x badge on the corner (selected chip, or an active filter on Search Results). */
  onRemove?: () => void;
}

/**
 * Outlined category chip (Figma See all 18:1085 / 20:1354, Search Results 22:2173):
 * icon and label, S Tint 5 border; selected turns the border dark and shows a
 * dark x badge on the top-right corner that clears it.
 */
export function GroupChip({ label, icon, selected, onPress, onRemove }: GroupChipProps) {
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && styles.pressed]}
        accessibilityRole={onPress ? 'button' : 'text'}
        accessibilityState={onPress ? { selected: Boolean(selected) } : undefined}
        accessibilityLabel={label}
      >
        {icon && <Icon name={icon} size={22} color="secondary" />}
        <Text variant="body14" color="secondary" numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
      {onRemove && (
        <Pressable onPress={onRemove} hitSlop={10} style={styles.badge} accessibilityRole="button" accessibilityLabel={`Remove ${label}`}>
          <Icon name="close" size={16} color="white" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Room for the badge, which sits 8pt above the chip.
  wrap: {
    paddingTop: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.secondaryTint5,
  },
  selected: {
    borderColor: colors.secondary,
    backgroundColor: colors.white,
  },
  pressed: {
    opacity: 0.8,
  },
  // Figma: 20pt dark circle with a white cross over the chip's top-right corner.
  badge: {
    position: 'absolute',
    top: 0,
    right: -10,
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
