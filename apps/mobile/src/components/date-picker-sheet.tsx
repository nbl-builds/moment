import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { colors, spacing } from '@moment/shared';
import { useEffect, useEffectEvent, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet } from './bottom-sheet';
import { Button, Text } from './ui';

interface DatePickerSheetProps {
  visible: boolean;
  /** Current value as YYYY-MM-DD, or empty. */
  value: string;
  /** Date to start on when there is no value yet. */
  initial: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  title: string;
  onConfirm: (date: string) => void;
  onClose: () => void;
}

/** YYYY-MM-DD from a picker Date (local calendar day, no time zone shift). */
export function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromIsoDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

/**
 * Picks a calendar date: the native dialog on Android, a wheel in a bottom
 * sheet on iOS. Mount it at the screen root (it covers the screen).
 */
export function DatePickerSheet({
  visible,
  value,
  initial,
  minimumDate,
  maximumDate,
  title,
  onConfirm,
  onClose,
}: DatePickerSheetProps) {
  const insets = useSafeAreaInsets();
  // The wheel's position while the sheet is open; null means "start from the value".
  const [draft, setDraft] = useState<Date | null>(null);
  const start = fromIsoDate(value) ?? initial;
  const shown = draft ?? start;

  const close = () => {
    setDraft(null);
    onClose();
  };

  const openAndroidDialog = useEffectEvent(() => {
    DateTimePickerAndroid.open({
      value: start,
      mode: 'date',
      minimumDate,
      maximumDate,
      onChange: (event, date) => {
        if (event.type === 'set' && date) onConfirm(toIsoDate(date));
        onClose();
      },
    });
  });

  useEffect(() => {
    if (visible && Platform.OS === 'android') openAndroidDialog();
  }, [visible]);

  if (Platform.OS === 'android') return null;

  return (
    <BottomSheet visible={visible} onRequestClose={close} accessibilityLabel={title}>
      <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <Text variant="h4" color="secondary" align="center">
          {title}
        </Text>
        <DateTimePicker
          value={shown}
          mode="date"
          display="spinner"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(_, date) => date && setDraft(date)}
          textColor={colors.secondary}
          themeVariant="light"
        />
        <Button
          label="Done"
          onPress={() => {
            onConfirm(toIsoDate(shown));
            close();
          }}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.xl,
    paddingHorizontal: 20,
    gap: spacing.lg,
  },
});
