import { colors, OTP_LENGTH } from '@moment/shared';
import { useRef, type ComponentRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from './text';

/**
 * Figma: "Sign In OTP" cells (7:1066): 58pt squares in the 388pt content width,
 * radius 15, 8pt apart. Cells share the row width so wider phones keep the edges aligned.
 */
const CELL = { size: 58, radius: 15, gap: 8 } as const;
/** Placeholder dot in an empty cell (7:1073). */
const DOT = 10;

export interface OtpInputProps {
  value: string;
  onChangeText: (code: string) => void;
  /** Turns every cell pink (Figma 9:728, "Wrong verification code"). */
  error?: boolean;
  length?: number;
  autoFocus?: boolean;
  /** Called once all digits are entered. */
  onFilled?: (code: string) => void;
}

/**
 * One-time code entry: a row of cells over a single hidden TextInput, so the
 * number pad, paste and iOS / Android SMS autofill all work.
 */
export function OtpInput({ value, onChangeText, error, length = OTP_LENGTH, autoFocus = true, onFilled }: OtpInputProps) {
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);

  const onChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, length);
    onChangeText(digits);
    if (digits.length === length && value.length !== length) onFilled?.(digits);
  };

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      accessible={false}
      style={styles.row}
    >
      {Array.from({ length }, (_, i) => {
        const digit = value[i];
        return (
          <View key={i} style={[styles.cell, error && styles.cellError]} accessible={false}>
            {digit ? (
              <Text variant="h3" color="secondary">
                {digit}
              </Text>
            ) : (
              <View style={styles.dot} />
            )}
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChange}
        autoFocus={autoFocus}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        caretHidden
        contextMenuHidden={false}
        style={styles.hiddenInput}
        accessibilityLabel="Verification code"
        accessibilityHint={`Enter the ${length}-digit code`}
        accessibilityValue={{ text: value.split('').join(' ') }}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: CELL.gap,
  },
  cell: {
    flex: 1,
    maxWidth: CELL.size * 1.25,
    aspectRatio: 1,
    borderRadius: CELL.radius,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.secondaryTint6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellError: {
    backgroundColor: colors.errorSurface,
    borderColor: colors.errorBorder,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: colors.secondaryTint3,
  },
  // Covers the cells so a tap anywhere focuses it; invisible but still accessible.
  hiddenInput: {
    ...StyleSheet.absoluteFill,
    color: 'transparent',
    opacity: 0.011,
  },
});
