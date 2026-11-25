import { colors } from '@moment/shared';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button, Icon, Text } from '@/components/ui';
import { BOOK } from '../layout';

const S = BOOK.sheet;

export interface BookingSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Centred (most sheets) or left (Add Guest, Add Notes). */
  titleAlign?: 'center' | 'left';
  /** Back chevron instead of the close X (Select Time goes back to Select Date). */
  onBack?: () => void;
  /** Hide the close X (Success). */
  hideClose?: boolean;
  /** Figma sheet top in the 926 frame; sets the sheet height. */
  top: number;
  /** Keep the Figma height and scroll the content under the pinned button (long lists). */
  scrollContent?: boolean;
  /** Pinned lime button at the bottom. */
  action?: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean };
  children: ReactNode;
}

/** Off-white booking sheet (47:3717 ...): header, content, pinned action. */
export function BookingSheet({ visible, onClose, title, titleAlign = 'center', onBack, hideClose, top, scrollContent, action, children }: BookingSheetProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const minHeight = (height * (BOOK.frameHeight - top)) / BOOK.frameHeight;

  return (
    <BottomSheet visible={visible} onRequestClose={onClose} backgroundColor={colors.backgroundMuted} accessibilityLabel={title}>
      <View style={[styles.body, scrollContent ? { height: minHeight } : { minHeight }, { paddingBottom: insets.bottom + BOOK.buttonGap }]}>
        {(title || !hideClose || onBack) && (
          <View style={styles.header}>
            {onBack && (
              <Pressable onPress={onBack} hitSlop={10} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
                <Icon name="chevron-left" size={S.close} color="secondary" />
              </Pressable>
            )}
            {title && (
              <Text
                variant="h4"
                color="secondary"
                align={titleAlign}
                style={[styles.title, titleAlign === 'left' && !onBack && styles.titleLeft]}
                numberOfLines={1}
              >
                {title}
              </Text>
            )}
            {!hideClose && (
              <Pressable onPress={onClose} hitSlop={10} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
                <Icon name="x" size={S.close} color="secondary" />
              </Pressable>
            )}
          </View>
        )}
        {scrollContent ? (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View style={styles.content}>{children}</View>
        )}
        {action && (
          <Button
            label={action.label}
            onPress={action.onPress}
            disabled={action.disabled}
            loading={action.loading}
            style={styles.action}
          />
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingTop: S.headerTop,
  },
  header: {
    minHeight: S.close,
    marginHorizontal: BOOK.inset,
    justifyContent: 'center',
  },
  title: {
    marginHorizontal: S.close + 8,
  },
  titleLeft: {
    marginLeft: 0,
  },
  back: {
    position: 'absolute',
    left: 0,
  },
  close: {
    position: 'absolute',
    right: 0,
  },
  content: {
    flex: 1,
  },
  action: {
    marginTop: 'auto',
    marginHorizontal: BOOK.inset,
  },
});
