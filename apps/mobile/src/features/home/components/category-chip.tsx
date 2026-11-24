import { colors } from '@moment/shared';
import { Pressable, StyleSheet } from 'react-native';
import { Icon, Text, type IconName } from '@/components/ui';
import { HOME } from '../layout';
import type { CategoryData } from '../use-home-data';

const C = HOME.chip;

/**
 * Category slug -> chip icon. Figma draws Adventure, Tours, Food and Health &
 * Wellness (17:1261 ...); the others use icons from the Figma Icons page.
 */
const CATEGORY_ICONS: Record<string, IconName> = {
  'outdoor-adventure': 'category-adventure',
  'tours-walks': 'category-tours',
  'food-drink': 'category-food',
  'spa-massage': 'category-wellness',
  'water-activities': 'category-water',
  'arts-workshops': 'category-arts',
  'day-trips': 'category-day-trips',
};

/** Short chip labels, as in Figma ("Adventure", "Tours", "Food"). */
const CATEGORY_LABELS: Record<string, string> = {
  'outdoor-adventure': 'Adventure',
  'tours-walks': 'Tours',
  'food-drink': 'Food',
  'spa-massage': 'Health & Wellness',
  'water-activities': 'Water',
  'arts-workshops': 'Arts',
  'day-trips': 'Day trips',
};

export const hasCategoryChip = (category: CategoryData) => category.slug in CATEGORY_ICONS;

/** "More to explore" chip: icon over label, both in the Third orange. */
export function CategoryChip({ category, onPress }: { category: CategoryData; onPress: () => void }) {
  const icon = CATEGORY_ICONS[category.slug] ?? 'category-tours';
  const label = CATEGORY_LABELS[category.slug] ?? category.name;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={category.name}
    >
      <Icon name={icon} color="third" />
      <Text variant="body14" weight="medium" color="third" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: C.paddingH,
    paddingVertical: C.paddingV,
    borderRadius: C.radius,
    backgroundColor: colors.white,
  },
  pressed: {
    opacity: 0.85,
  },
});
