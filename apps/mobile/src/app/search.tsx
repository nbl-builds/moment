import { colors } from '@moment/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { exploreStore } from '@/features/explore/store';
import { Icon, Text, textStyle } from '@/components/ui';
import { GroupChip } from '@/features/search/components/group-chip';
import { FilterButton } from '@/features/search/components/filter-button';
import { CATEGORY_GROUPS, EMPTY_FILTERS, encodeFilters, type SearchFilterState } from '@/features/search/filters';
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  RECENT_SEARCHES_QUERY_KEY,
  removeRecentSearch,
} from '@/features/search/recent-searches';

// No Figma frame for typing a search: built in the style of Filters / Search
// Results (close x, white 50pt field like Home's search bar, outlined chips).
const INSET = 20;
const FIELD = { height: 50, radius: 12 } as const;

/**
 * Search: opened from Home's search bar. Type and submit to see results;
 * recent searches (kept on the device) and popular categories below.
 */
export default function SearchScreen() {
  /** `from=explore`: the search text goes back to Explore's map instead of opening results. */
  const { from } = useLocalSearchParams<{ from?: string }>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const recent = useQuery({ queryKey: RECENT_SEARCHES_QUERY_KEY, queryFn: getRecentSearches });

  const setRecent = (list: string[]) => queryClient.setQueryData(RECENT_SEARCHES_QUERY_KEY, list);
  const showResults = (filters: SearchFilterState) => {
    if (from === 'explore') {
      exploreStore.setFilters({ ...exploreStore.get().filters, query: filters.query });
      router.back();
      return;
    }
    router.push({ pathname: '/search-results', params: { filters: encodeFilters(filters) } });
  };

  const submit = (term: string) => {
    const query = term.trim();
    if (!query) return;
    void addRecentSearch(query).then(setRecent);
    showResults({ ...EMPTY_FILTERS, query });
  };

  const openFilters = () =>
    router.push({
      pathname: '/filters',
      params: { filters: encodeFilters({ ...EMPTY_FILTERS, query: text.trim() || null }), from: 'search' },
    });

  const recentList = recent.data ?? [];

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 16 }]}>
      <View style={styles.inset}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.close} accessibilityRole="button" accessibilityLabel="Close search">
          <Icon name="close" size={28} color="secondary" />
        </Pressable>

        <View style={styles.field}>
          <Icon name="search" />
          <TextInput
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => submit(text)}
            autoFocus
            placeholder="Where are you going?"
            placeholderTextColor={colors.secondaryTint3}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            style={styles.input}
            accessibilityLabel="Search experiences, hosts and places"
          />
          {text.length > 0 && (
            <Pressable onPress={() => setText('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear text">
              <Icon name="x" size={20} color="secondaryTint2" />
            </Pressable>
          )}
          <View style={styles.divider} />
          <FilterButton count={0} onPress={openFilters} />
        </View>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.inset, { paddingBottom: insets.bottom + 24 }]}>
        {recentList.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="body18" weight="bold" color="secondary">
                Recent searches
              </Text>
              <Pressable
                onPress={() => void clearRecentSearches().then(setRecent)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Clear recent searches"
              >
                <Text variant="body14" weight="semibold" color="secondaryTint2">
                  Clear
                </Text>
              </Pressable>
            </View>
            {recentList.map((term) => (
              <View key={term} style={styles.recentRow}>
                <Pressable onPress={() => submit(term)} style={styles.recentTerm} accessibilityRole="button" accessibilityLabel={`Search ${term}`}>
                  <Icon name="search" size={20} color="secondaryTint2" />
                  <Text variant="body15" weight="medium" color="secondary" numberOfLines={1} style={styles.flex}>
                    {term}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => void removeRecentSearch(term).then(setRecent)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${term} from recent searches`}
                >
                  <Icon name="x" size={20} color="secondaryTint3" />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text variant="body18" weight="bold" color="secondary">
            Popular categories
          </Text>
          <View style={styles.chips}>
            {CATEGORY_GROUPS.map((g) => (
              <GroupChip
                key={g.key}
                label={g.label}
                icon={g.icon}
                onPress={() => showResults({ ...EMPTY_FILTERS, query: text.trim() || null, categoryGroups: [g.key] })}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  inset: {
    paddingHorizontal: INSET,
  },
  close: {
    alignSelf: 'flex-start',
  },
  field: {
    marginTop: 24,
    height: FIELD.height,
    borderRadius: FIELD.radius,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 13,
    paddingRight: 14,
    gap: 11,
    // Same shadow as Home's search bar.
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  input: {
    ...textStyle('body14', 'medium'),
    color: colors.secondary,
    flex: 1,
    height: FIELD.height,
    lineHeight: undefined,
    paddingVertical: 0,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: colors.divider,
  },
  section: {
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  recentTerm: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  flex: {
    flex: 1,
  },
  chips: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 12,
    rowGap: 4,
  },
});
