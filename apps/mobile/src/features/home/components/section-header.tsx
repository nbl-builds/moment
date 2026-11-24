import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from '@/components/ui';
import { HOME } from '../layout';

/**
 * Section title with the "see all" arrow (Figma 18:1032: H4 title, 28pt
 * arrow on the right). "Recently viewed" has no arrow.
 */
export function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  return (
    <View style={styles.row}>
      <Text variant="h4" color="secondary" accessibilityRole="header">
        {title}
      </Text>
      {onSeeAll && (
        <Pressable
          onPress={onSeeAll}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`See all ${title}`}
          style={styles.arrow}
        >
          <Icon name="arrow-up" size={HOME.arrowSize} style={styles.rotate} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: HOME.sectionHeaderHeight,
    paddingHorizontal: HOME.inset,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrow: {
    // Figma: 28pt box ending 19pt from the right edge.
    marginRight: HOME.arrowRightInset - HOME.inset,
  },
  // The Figma glyph points up; turned to point right as in the design.
  rotate: {
    transform: [{ rotate: '90deg' }],
  },
});
