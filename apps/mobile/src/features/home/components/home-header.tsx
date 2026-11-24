import { colors } from '@moment/shared';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from '@/components/ui';
import { HOME } from '../layout';

interface HomeHeaderProps {
  onSearch: () => void;
  onFilters: () => void;
  onBucketList: () => void;
}

/** Search bar and bucket-list heart (Figma 52:9768), pinned at the top of Home. */
export function HomeHeader({ onSearch, onFilters, onBucketList }: HomeHeaderProps) {
  return (
    <View style={styles.row}>
      {/* Filters is its own button beside the search field, so screen readers reach both. */}
      <View style={styles.search}>
        <Pressable
          onPress={onSearch}
          style={styles.searchButton}
          accessibilityRole="search"
          accessibilityLabel="Search. Where are you going?"
        >
          <Icon name="search" />
          <View style={styles.searchText}>
            <Text variant="body14" weight="medium" color="secondary">
              Search
            </Text>
            <Text variant="body10" color="secondaryTint1">
              Where are you going?
            </Text>
          </View>
        </Pressable>
        <Pressable onPress={onFilters} hitSlop={10} accessibilityRole="button" accessibilityLabel="Filters">
          <Icon name="filter" />
        </Pressable>
      </View>
      <Pressable
        onPress={onBucketList}
        style={styles.heart}
        accessibilityRole="button"
        accessibilityLabel="Bucket list"
      >
        <Icon name="heart" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: HOME.searchToHeart,
    paddingHorizontal: HOME.inset,
  },
  search: {
    flex: 1,
    height: HOME.searchHeight,
    borderRadius: 12,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    // Figma: icon 13pt in, text 48pt in, filter 11pt from the right.
    paddingLeft: 13,
    paddingRight: 11,
    gap: 11,
    // Figma: 0 2 17 rgba(0,0,0,0.05).
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  searchButton: {
    flex: 1,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  searchText: {
    flex: 1,
  },
  heart: {
    width: HOME.heartButton,
    height: HOME.heartButton,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
