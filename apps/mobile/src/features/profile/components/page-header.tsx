import { colors } from '@moment/shared';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton, Text } from '@/components/ui';

/**
 * Profile screens' header (48:3951, 48:5297): back chevron 28pt, 24pt bold
 * title and a grey hairline. `right` sits on the title line ("Save").
 */
export function PageHeader({ title, right, onBack }: { title: string; right?: ReactNode; onBack?: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 16 }]}>
      <BackButton onPress={onBack} />
      <View style={styles.titleRow}>
        <Text variant="h3" color="black" style={styles.title} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
        {right}
      </View>
      <View style={styles.divider} />
    </View>
  );
}

/** Underlined bold link on the right of a header or card ("Save", "Edit", 48:3617). */
export function TextLink({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={12} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }}>
      <Text variant="body15" weight="bold" color={disabled ? 'optionSelected' : 'black'} style={styles.link}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    backgroundColor: colors.backgroundMuted,
  },
  titleRow: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    flex: 1,
    letterSpacing: 0.24,
  },
  divider: {
    marginTop: 12,
    height: 1,
    backgroundColor: colors.chipBorder,
  },
  link: {
    textDecorationLine: 'underline',
  },
});
