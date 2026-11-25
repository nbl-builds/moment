import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, type TextProps } from '@/components/ui';

/** Text cut to `lines` with an underlined "Read more" that expands it (48:6527). */
export function ReadMore({ text, lines = 5, style, ...textProps }: { text: string; lines?: number } & Omit<TextProps, 'children'>) {
  const [open, setOpen] = useState(false);
  const [long, setLong] = useState(false);
  return (
    <View>
      <Text
        variant="body15"
        weight="medium"
        color="secondaryTint2"
        {...textProps}
        style={style}
        numberOfLines={open ? undefined : lines}
        onTextLayout={(e) => {
          if (!open && e.nativeEvent.lines.length >= lines) setLong(true);
        }}
      >
        {text}
      </Text>
      {long && (
        <Text
          variant="subText14"
          weight="bold"
          color="secondary"
          style={styles.more}
          onPress={() => setOpen((v) => !v)}
          accessibilityRole="button"
        >
          {open ? 'Read less' : 'Read more'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  more: {
    marginTop: 6,
    textDecorationLine: 'underline',
    alignSelf: 'flex-start',
  },
});
