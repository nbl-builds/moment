import { colors } from '@moment/shared';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button, Text } from '@/components/ui';

/** Yes / No confirm sheet (Delete group 48:5243): red Yes on top, grey No below. */
export function ConfirmSheet({
  visible,
  title,
  body,
  confirmLabel = 'Yes',
  loading,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <BottomSheet visible={visible} onRequestClose={onClose} backgroundColor={colors.backgroundMuted} accessibilityLabel={title}>
      <View style={[styles.body, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.grabber} />
        <Text variant="h3" weight="extrabold" color="black" align="center" style={styles.title}>
          {title}
        </Text>
        <Text variant="subText14" color="blackTint2" align="center" style={styles.text}>
          {body}
        </Text>
        <Button label={confirmLabel} onPress={onConfirm} loading={loading} style={styles.yes} />
        <Button label="No" variant="muted" onPress={onClose} style={styles.no} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingTop: 8,
    paddingHorizontal: 20,
  },
  grabber: {
    alignSelf: 'center',
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.chipBorder,
  },
  title: {
    marginTop: 9,
    lineHeight: 32,
  },
  text: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 21,
  },
  yes: {
    marginTop: 30,
    backgroundColor: colors.destructive,
  },
  no: {
    marginTop: 20,
    backgroundColor: colors.chipBorder,
  },
});
