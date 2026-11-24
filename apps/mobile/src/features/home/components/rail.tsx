import { FlatList, StyleSheet, type ListRenderItem } from 'react-native';
import { HOME } from '../layout';

interface RailProps<T> {
  data: readonly T[];
  keyOf: (item: T) => string;
  renderItem: ListRenderItem<T>;
  /** Item width + gap: the list snaps one item at a time. */
  itemWidth: number;
  gap: number;
  accessibilityLabel: string;
}

/** Horizontal rail that snaps card by card, starting at the page inset (Figma: 20pt). */
export function Rail<T>({ data, keyOf, renderItem, itemWidth, gap, accessibilityLabel }: RailProps<T>) {
  return (
    <FlatList
      horizontal
      data={data}
      keyExtractor={keyOf}
      renderItem={renderItem}
      showsHorizontalScrollIndicator={false}
      snapToInterval={itemWidth + gap}
      snapToAlignment="start"
      decelerationRate="fast"
      disableIntervalMomentum
      contentContainerStyle={[styles.content, { gap }]}
      // Room for card shadows so they are not clipped.
      style={styles.list}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    overflow: 'visible',
  },
  content: {
    paddingHorizontal: HOME.inset,
  },
});
