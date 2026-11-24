import { bucketListNameSchema, colors, LIMITS } from '@moment/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button, Icon, Text, textStyle } from '@/components/ui';
import { BUCKET } from '../layout';

const N = BUCKET.nameSheet;

interface NameSheetProps {
  visible: boolean;
  /** "Give it a name" (24:1444) or "Rename" (25:1517). */
  title: string;
  placeholder: string;
  submitLabel: string;
  initialName?: string;
  loading?: boolean;
  onSubmit: (name: string) => void;
  onClose: () => void;
}

/** A sheet with one name field and a lime button. */
export function NameSheet({ visible, title, placeholder, submitLabel, initialName = '', loading, onSubmit, onClose }: NameSheetProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  // Start from the current name each time the sheet opens.
  const [openedWith, setOpenedWith] = useState<string | null>(null);
  if (visible && openedWith === null) {
    setOpenedWith(initialName);
    setName(initialName);
    setError(null);
  }
  if (!visible && openedWith !== null) setOpenedWith(null);

  const submit = () => {
    const parsed = bucketListNameSchema.safeParse({ name });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a name');
      return;
    }
    onSubmit(parsed.data.name);
  };

  return (
    <BottomSheet visible={visible} onRequestClose={onClose} accessibilityLabel={title} backgroundColor={colors.backgroundMuted}>
      <View style={[styles.content, { paddingBottom: insets.bottom + 18 }]}>
        <View style={styles.header}>
          <Text variant="h4" color="secondary" align="center" accessibilityRole="header">
            {title}
          </Text>
          <Pressable onPress={onClose} hitSlop={10} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
            <Icon name="x" size={28} />
          </Pressable>
        </View>
        <TextInput
          value={name}
          onChangeText={(v) => {
            setName(v);
            if (error) setError(null);
          }}
          onSubmitEditing={submit}
          placeholder={placeholder}
          placeholderTextColor={colors.secondaryTint2}
          maxLength={LIMITS.bucketListName}
          autoFocus
          returnKeyType="done"
          style={[styles.field, error && styles.fieldError]}
          accessibilityLabel={placeholder}
        />
        {error && (
          <Text variant="body12" color="error" style={styles.error}>
            {error}
          </Text>
        )}
        <Button label={submitLabel} onPress={submit} loading={loading} style={styles.button} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: N.top,
    paddingHorizontal: BUCKET.inset,
  },
  header: {
    minHeight: 28,
    justifyContent: 'center',
  },
  close: {
    position: 'absolute',
    right: 0,
  },
  // Figma "Web-Field": white, radius 15, 18pt padding, ST1 Regular 16.
  field: {
    ...textStyle('subText16'),
    marginTop: N.titleToField,
    paddingHorizontal: N.field.padding,
    paddingVertical: N.field.padding,
    borderRadius: N.field.radius,
    backgroundColor: colors.white,
    color: colors.secondary,
    lineHeight: undefined,
  },
  fieldError: {
    borderWidth: 1,
    borderColor: colors.errorBorder,
    backgroundColor: colors.errorSurface,
  },
  error: {
    marginTop: 6,
  },
  button: {
    marginTop: N.fieldToButton,
  },
});
