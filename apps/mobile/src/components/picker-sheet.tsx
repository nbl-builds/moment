import { colors, spacing } from '@moment/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet } from './bottom-sheet';
import { Icon, Text, textStyle } from './ui';

// Figma: "Select Location" / "Select Language" sheets (22:1590): off-white sheet,
// centred H4 title with an x, white search field, radio rows with hairlines.
const GAP = {
  top: 20,
  titleToSearch: 37,
  searchToList: 10,
  rowPadding: 20,
} as const;
const INSET = 20;
const SEARCH = { height: 50, radius: 15 } as const;

export interface PickerOption {
  value: string;
  label: string;
}

interface PickerSheetProps {
  visible: boolean;
  title: string;
  options: PickerOption[];
  selected: string | null;
  onSelect: (value: string | null) => void;
  onClose: () => void;
  searchPlaceholder?: string;
  /** Offer "Any" at the top to clear the choice. */
  anyLabel?: string;
}

/** Bottom sheet with a search field and a single-choice list. Picking closes it. */
export function PickerSheet({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
  searchPlaceholder = 'Search',
  anyLabel,
}: PickerSheetProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const shown = options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()));
  const rows: (PickerOption | { value: null; label: string })[] = anyLabel && !query ? [{ value: null, label: anyLabel }, ...shown] : shown;

  const pick = (value: string | null) => {
    onSelect(value);
    setQuery('');
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onRequestClose={onClose}
      accessibilityLabel={title}
      backgroundColor={colors.backgroundMuted}
      minHeightRatio={0.8}
    >
      <View style={[styles.content, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.header}>
          <Text variant="h4" color="secondary" align="center">
            {title}
          </Text>
          <Pressable onPress={onClose} hitSlop={10} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
            <Icon name="x" size={28} />
          </Pressable>
        </View>

        <View style={styles.search}>
          <Icon name="search-solid" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder}
            placeholderTextColor={colors.secondaryTint3}
            style={styles.searchInput}
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel={searchPlaceholder}
          />
        </View>

        <View style={styles.list}>
          {rows.map((option) => {
            const isSelected = option.value === selected;
            return (
              <Pressable
                key={option.value ?? '__any'}
                onPress={() => pick(option.value)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={option.label}
              >
                <Icon name="radio" size={20} color={isSelected ? 'secondary' : 'textDisabled'} />
                <Text variant="body15" weight={isSelected ? 'bold' : 'medium'} color="secondary">
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
          {rows.length === 0 && (
            <Text variant="body14" color="secondaryTint2" style={styles.empty}>
              Nothing matches “{query}”.
            </Text>
          )}
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: GAP.top,
    paddingHorizontal: INSET,
  },
  header: {
    justifyContent: 'center',
    minHeight: 28,
  },
  close: {
    position: 'absolute',
    right: 0,
  },
  search: {
    marginTop: GAP.titleToSearch,
    height: SEARCH.height,
    borderRadius: SEARCH.radius,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: INSET,
    gap: 15,
  },
  searchInput: {
    ...textStyle('subText14', 'semibold'),
    color: colors.secondary,
    flex: 1,
    height: SEARCH.height,
    lineHeight: undefined,
    paddingVertical: 0,
  },
  list: {
    marginTop: GAP.searchToList,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: GAP.rowPadding,
    paddingLeft: 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  pressed: {
    opacity: 0.6,
  },
  empty: {
    marginTop: spacing.xl,
    textAlign: 'center',
  },
});
