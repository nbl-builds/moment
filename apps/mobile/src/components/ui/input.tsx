import { colors, inputField } from '@moment/shared';
import { useId, type ComponentRef, type ReactNode, type Ref } from 'react';
import { StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { Text, textStyle } from './text';

export interface InputProps extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  /** Shown above the field (Figma: Body Regular 14 Medium). */
  label?: string;
  /** Grey help text under the field. Hidden while an error is showing. */
  helperText?: string;
  /** Red message under the field. */
  error?: string | null;
  /** Content before the text, e.g. the +92 country code. */
  leading?: ReactNode;
  /** Content after the text, e.g. a show-password toggle. */
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
  ref?: Ref<ComponentRef<typeof TextInput>>;
}

/**
 * Text field. Figma: "Web-Field" on the sign in sheets (1825:2867): S Tint 6
 * fill, radius 12, 60pt tall, 18pt padding, ST1 text with S Tint 3 placeholder.
 */
export function Input({ ref, label, helperText, error, leading, trailing, style, accessibilityLabel, ...rest }: InputProps) {
  const labelId = useId();
  const message = error ?? helperText;

  return (
    <View style={style}>
      {label && (
        <Text variant="body14" weight="medium" color="secondary" nativeID={labelId} style={styles.label}>
          {label}
        </Text>
      )}
      <View style={styles.field}>
        {leading}
        <TextInput
          ref={ref}
          {...rest}
          style={styles.input}
          placeholderTextColor={colors.secondaryTint3}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityLabelledBy={label ? labelId : undefined}
          accessibilityHint={error ?? undefined}
        />
        {trailing}
      </View>
      {message && (
        <Text
          variant="body12"
          color={error ? 'error' : 'secondaryTint2'}
          style={styles.message}
          accessibilityRole={error ? 'alert' : undefined}
          accessibilityLiveRegion={error ? 'polite' : undefined}
        >
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: inputField.labelGap,
  },
  field: {
    height: inputField.height,
    flexDirection: 'row',
    alignItems: 'center',
    gap: inputField.accessoryGap,
    paddingHorizontal: inputField.paddingHorizontal,
    borderRadius: inputField.radius,
    backgroundColor: colors.secondaryTint6,
  },
  input: {
    ...textStyle('subText16'),
    color: colors.secondary,
    flex: 1,
    height: inputField.height,
    // TextInput adds its own line box; a fixed lineHeight shifts the text on iOS.
    lineHeight: undefined,
    paddingVertical: 0,
  },
  message: {
    marginTop: inputField.messageGap,
  },
});
