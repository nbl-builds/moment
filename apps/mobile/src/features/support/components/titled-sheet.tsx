import { colors } from '@moment/shared';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet } from '@/components/bottom-sheet';
import { Icon, Text } from '@/components/ui';

const INSET = 20;
const CLOSE = 28;

/**
 * Off-white sheet with a left-aligned ExtraBold 20 title and the close X
 * (FAQ answer 48:5505, Follow Us 48:5772). No grabber, as in Figma.
 */
export function TitledSheet({
  visible,
  title,
  onClose,
  minHeightRatio,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  /** Share of the window the sheet fills at least (Figma sheet height / 926). */
  minHeightRatio?: number;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <BottomSheet
      visible={visible}
      onRequestClose={onClose}
      backgroundColor={colors.backgroundMuted}
      minHeightRatio={minHeightRatio}
      accessibilityLabel={title}
    >
      <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.header}>
          <Text variant="h4" weight="extrabold" color="black" style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
            <Icon name="x" size={CLOSE} color="black" />
          </Pressable>
        </View>
        {children}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingTop: 20,
    paddingHorizontal: INSET,
  },
  header: {
    minHeight: CLOSE,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    flex: 1,
    letterSpacing: 0.2,
    lineHeight: 27,
  },
});
