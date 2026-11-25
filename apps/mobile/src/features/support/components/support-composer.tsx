import { colors, LIMITS } from '@moment/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Icon, textStyle } from '@/components/ui';
import { CHAT } from '@/features/bookings/layout';

const C = CHAT.composer;

/** Text-only version of the chat composer (47:5940): white pill, field and black send button. */
export function SupportComposer({ onSend, disabled }: { onSend: (text: string) => void; disabled?: boolean }) {
  const [text, setText] = useState('');
  const canSend = Boolean(text.trim()) && !disabled;

  const send = () => {
    if (!canSend) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <View style={styles.pill}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Write to Moment Support"
        placeholderTextColor={colors.secondaryTint2}
        style={styles.input}
        multiline
        maxLength={LIMITS.supportBody}
        accessibilityLabel="Message to Moment Support"
      />
      <Pressable
        onPress={send}
        disabled={!canSend}
        style={[styles.send, !canSend && styles.sendDisabled]}
        accessibilityRole="button"
        accessibilityLabel="Send"
        accessibilityState={{ disabled: !canSend }}
      >
        <Icon name="send" size={16} color="white" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: C.height,
    borderRadius: C.radius,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 22,
    paddingRight: 15,
    paddingVertical: 9,
    gap: 14,
    shadowColor: colors.black,
    shadowOpacity: 0.04,
    shadowRadius: 27,
    shadowOffset: { width: 10, height: 24 },
    elevation: 2,
  },
  input: {
    ...textStyle('subText12', 'medium'),
    flex: 1,
    maxHeight: 110,
    color: colors.secondary,
    paddingTop: 0,
    paddingBottom: 0,
  },
  send: {
    width: C.send.width,
    height: C.send.height,
    borderRadius: C.send.radius,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.35,
  },
});
