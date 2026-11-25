import { colors } from '@moment/shared';
import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { textStyle } from '@/components/ui';
import { BOOK } from '../layout';
import { BookingSheet } from './booking-sheet';

const MAX_NOTES = 500;

/** "Add Notes" (47:4735): a plain text area, no box, then Save. */
export function NotesSheet({ visible, value, onSave, onClose }: { visible: boolean; value: string; onSave: (notes: string) => void; onClose: () => void }) {
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? value;
  const close = () => {
    setText(null);
    onClose();
  };
  return (
    <BookingSheet
      visible={visible}
      onClose={close}
      title="Add Notes"
      titleAlign="left"
      top={BOOK.sheet.top.notes}
      action={{
        label: 'Save',
        onPress: () => {
          setText(null);
          onSave(shown.trim());
        },
      }}
    >
      <TextInput
        value={shown}
        onChangeText={setText}
        placeholder="Type here to add your notes"
        placeholderTextColor={colors.secondaryTint2}
        multiline
        autoFocus
        maxLength={MAX_NOTES}
        style={styles.input}
        accessibilityLabel="Notes for the host"
      />
    </BookingSheet>
  );
}

const styles = StyleSheet.create({
  input: {
    ...textStyle('body15', 'medium'),
    color: colors.secondary,
    marginTop: 21,
    marginHorizontal: BOOK.inset,
    minHeight: 160,
    padding: 0,
    textAlignVertical: 'top',
  },
});
