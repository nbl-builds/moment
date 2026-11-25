import { colors } from '@moment/shared';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '@/components/ui';
import { BOOK } from '../layout';

/** White card on Confirm Reservation (x20 w388 r15, 15 inside). */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Underlined Bold 14 "Edit" / "Add" on the right of a section title. */
export function TextLink({ label, onPress, accessibilityLabel }: { label: string; onPress: () => void; accessibilityLabel?: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label}>
      {({ pressed }) => (
        <Text variant="body14" weight="bold" color="secondary" style={[styles.link, pressed && styles.pressed]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/** Bold 18 section title with an optional link on the right. */
export function SectionHeader({
  title,
  suffix,
  link,
  style,
}: {
  title: string;
  /** "(Optional)" after "Add Notes" (Regular 10). */
  suffix?: string;
  link?: { label: string; onPress: () => void; accessibilityLabel?: string };
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.header, style]}>
      <Text variant="body18" weight="bold" color="secondary" style={styles.title} accessibilityRole="header">
        {title}
        {suffix && (
          <Text variant="body10" color="secondary">
            {' '}
            {suffix}
          </Text>
        )}
      </Text>
      {link && <TextLink {...link} />}
    </View>
  );
}

/** Grey Medium 15 line with an optional value on the right ("1x Swedish Massage   Rs 6,500"). */
export function Line({ label, value, strong, valueColor }: { label: string; value?: string; strong?: boolean; valueColor?: 'secondary' | 'secondaryTint2' | 'black' }) {
  return (
    <View style={styles.line}>
      <Text
        variant={strong ? 'body16' : 'body15'}
        weight={strong ? 'bold' : 'medium'}
        color={strong ? 'black' : 'secondaryTint2'}
        style={styles.lineLabel}
      >
        {label}
      </Text>
      {value !== undefined && (
        <Text variant={strong ? 'body16' : 'body15'} weight={strong ? 'bold' : 'medium'} color={strong ? 'black' : (valueColor ?? 'secondaryTint2')}>
          {value}
        </Text>
      )}
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: BOOK.inset,
    padding: BOOK.card.padding,
    borderRadius: BOOK.card.radius,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    flexShrink: 1,
  },
  link: {
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.5,
  },
  line: {
    // Rows repeat every 37pt; a wrapped row keeps the same gap below it.
    paddingBottom: BOOK.rowPitch - 22.5,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  lineLabel: {
    flexShrink: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: colors.divider,
  },
});
