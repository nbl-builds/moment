import { colors, inputField } from '@moment/shared';
import { useId, useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { Text, textStyle } from './text';

export interface InputProps extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  /** Shown above the field (Figma: Body Regular 14 Medium). */
  label?: string;
  /** Grey help text under the field. Hidden while an error is showing. */
  helperText?: string;
  /** Red message under the field; also turns the field pink (Figma 7:949, Email). */
  error?: string | null;
  /** Content before the text, e.g. the +92 country code. */
  leading?: ReactNode;
  /** Content after the text, e.g. a calendar icon or show-password toggle. */
  trailing?: ReactNode;
  /**
   * Makes the field a button that shows `value` (or the placeholder) instead of a
   * text box, for values picked elsewhere such as a date.
   */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  ref?: Ref<ComponentRef<typeof TextInput>>;
}

const BORDER_WIDTH = 1;

/**
 * Text field. Figma: "Web-Field" on the sign in and sign up screens (1825:2867,
 * 7:978): S Tint 6 fill, radius 12, 60pt tall, 18pt padding, ST1 text with
 * S Tint 3 placeholder. Focused: 1pt S Tint 5 border. Error: pink fill and border.
 */
export function Input({
  ref,
  label,
  helperText,
  error,
  leading,
  trailing,
  onPress,
  style,
  accessibilityLabel,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const labelId = useId();
  const [focused, setFocused] = useState(false);
  const message = error || helperText;

  const fieldStyle = [
    styles.field,
    focused && styles.focused,
    Boolean(error) && styles.error,
  ];

  return (
    <View style={style}>
      {label && (
        <Text variant="body14" weight="medium" color="secondary" nativeID={labelId} style={styles.label}>
          {label}
        </Text>
      )}
      {onPress ? (
        <Pressable
          style={fieldStyle}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityValue={rest.value ? { text: rest.value } : undefined}
          accessibilityHint={error ?? undefined}
        >
          {leading}
          <Text variant="subText16" color={rest.value ? 'secondary' : 'secondaryTint3'} style={styles.pressableText}>
            {rest.value || rest.placeholder}
          </Text>
          {trailing}
        </Pressable>
      ) : (
        <View style={fieldStyle}>
          {leading}
          <TextInput
            ref={ref}
            {...rest}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            style={styles.input}
            placeholderTextColor={colors.secondaryTint3}
            accessibilityLabel={accessibilityLabel ?? label}
            accessibilityLabelledBy={label ? labelId : undefined}
            accessibilityHint={error ?? undefined}
          />
          {trailing}
        </View>
      )}
      {message ? (
        <Text
          variant="body12"
          color={error ? 'error' : 'secondaryTint2'}
          style={styles.message}
          accessibilityRole={error ? 'alert' : undefined}
          accessibilityLiveRegion={error ? 'polite' : undefined}
        >
          {message}
        </Text>
      ) : null}
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
    // The border is always there (transparent) so focus does not shift the text.
    paddingHorizontal: inputField.paddingHorizontal - BORDER_WIDTH,
    borderWidth: BORDER_WIDTH,
    borderColor: 'transparent',
    borderRadius: inputField.radius,
    backgroundColor: colors.secondaryTint6,
  },
  focused: {
    borderColor: colors.secondaryTint5,
  },
  error: {
    backgroundColor: colors.errorSurface,
    borderColor: colors.errorBorder,
  },
  input: {
    ...textStyle('subText16'),
    color: colors.secondary,
    flex: 1,
    height: inputField.height - BORDER_WIDTH * 2,
    // TextInput adds its own line box; a fixed lineHeight shifts the text on iOS.
    lineHeight: undefined,
    paddingVertical: 0,
  },
  pressableText: {
    flex: 1,
  },
  message: {
    marginTop: inputField.messageGap,
  },
});
