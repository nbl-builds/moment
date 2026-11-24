import { colors } from '@moment/shared';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text, type IconName } from '@/components/ui';
import { BUCKET } from '../layout';

const O = BUCKET.option;

/**
 * Outlined action row on Bucket List sheets ("Add to bucket list", "Share a
 * link", "Edit", ... 23:1225): 28pt icon, bold title, optional grey subtitle.
 */
export function SheetOption({ icon, title, subtitle, onPress }: { icon: IconName; title: string; subtitle?: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.option, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
    >
      <Icon name={icon} size={28} color="secondary" />
      <View style={styles.text}>
        <Text variant="body16" weight="bold" color="secondary" numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text variant="subText12" color="secondaryTint2" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    height: O.height,
    borderRadius: O.radius,
    borderWidth: 1,
    borderColor: colors.secondaryTint5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: O.iconInset,
    gap: O.textLeft - O.iconInset - 28,
  },
  pressed: {
    backgroundColor: colors.pressedOverlay,
  },
  text: {
    flex: 1,
    paddingRight: 12,
  },
});
