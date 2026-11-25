import { colors } from '@moment/shared';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from '@/components/ui';
import { TitledSheet } from './titled-sheet';

export interface Option<T extends string> {
  value: T;
  label: string;
}

/** Single choice list in the off-white sheet; picking closes it (Give us feedback selects). */
export function OptionSheet<T extends string>({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: readonly Option<T>[];
  selected: T | null;
  onSelect: (value: T) => void;
  onClose: () => void;
}) {
  return (
    <TitledSheet visible={visible} title={title} onClose={onClose}>
      <View style={styles.list}>
        {options.map((o) => {
          const on = o.value === selected;
          return (
            <Pressable
              key={o.value}
              onPress={() => {
                onSelect(o.value);
                onClose();
              }}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={o.label}
            >
              <Icon name={on ? 'check-circle' : 'radio'} size={20} color={on ? 'secondary' : 'textDisabled'} />
              <Text variant="body15" weight={on ? 'bold' : 'medium'} color="black">
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </TitledSheet>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 18,
    paddingLeft: 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  pressed: {
    opacity: 0.6,
  },
});
