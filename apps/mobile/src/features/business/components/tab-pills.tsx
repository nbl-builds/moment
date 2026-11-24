import { colors } from '@moment/shared';
import { useEffect, useRef, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { Text } from '@/components/ui';
import { BIZ } from '../layout';

export const BUSINESS_TABS = ['Popular', 'Services', 'Membership', 'Reviews', 'About'] as const;
export type BusinessTab = (typeof BUSINESS_TABS)[number];

const T = BIZ.tabs;

/** Tabs (25:2265): 97 x 36 pills, lime when selected; scrolls sideways and keeps the selected one in view. */
export function TabPills({ value, onChange }: { value: BusinessTab; onChange: (tab: BusinessTab) => void }) {
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  useEffect(() => {
    const index = BUSINESS_TABS.indexOf(value);
    ref.current?.scrollTo({ x: Math.max(0, index * (T.width + T.gap) - T.width), animated: true });
  }, [value]);

  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="tablist"
    >
      {BUSINESS_TABS.map((tab) => {
        const selected = tab === value;
        return (
          <Pressable
            key={tab}
            onPress={() => onChange(tab)}
            style={[styles.pill, selected && styles.selected]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab}
          >
            <Text variant={selected ? 'subText14' : 'subText12'} weight="medium" color={selected ? 'secondary' : 'blackTint1'}>
              {tab}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: BIZ.inset + 1,
    gap: T.gap,
  },
  pill: {
    width: T.width,
    height: T.height,
    borderRadius: T.radius,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: colors.primary,
  },
});
