import { colors, LIMITS } from '@moment/shared';
import { getRecordingPermissionsAsync, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Icon, Text, textStyle } from '@/components/ui';
import { CHAT } from '@/features/bookings/layout';

const C = CHAT.composer;

interface ComposerProps {
  onSend: (text: string) => void;
  onPickPhoto: () => void;
  onVoiceNote: (note: { uri: string; durationMs: number }) => void;
  /** Called while typing (throttled by the caller). */
  onTyping: () => void;
  disabled?: boolean;
}

/**
 * Chat composer (47:5940): white pill with "+", the text field and the black
 * send button. "+" opens the attachments (52:9442): photo and voice note.
 */
export function Composer({ onSend, onPickPhoto, onVoiceNote, onTyping, disabled }: ComposerProps) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recordingSince, setRecordingSince] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const send = () => {
    const body = text.trim();
    if (!body || disabled) return;
    onSend(body);
    setText('');
  };

  const startRecording = async () => {
    setOpen(false);
    const permission = await microphonePermission();
    if (!permission?.granted) {
      Alert.alert(
        'Microphone is off',
        permission ? 'Allow microphone access in Settings to send voice notes.' : 'Couldn’t reach the microphone. Try again in a moment.',
      );
      return;
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      const start = Date.now();
      setRecordingSince(start);
      setElapsed(0);
      timer.current = setInterval(() => setElapsed(Date.now() - start), 250);
    } catch (e) {
      Alert.alert('Couldn’t start recording', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  const stopRecording = async (keep: boolean) => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    const durationMs = recordingSince ? Date.now() - recordingSince : 0;
    setRecordingSince(null);
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    } catch {
      // Already stopped.
    }
    if (keep && recorder.uri && durationMs > 500) onVoiceNote({ uri: recorder.uri, durationMs });
  };

  const recording = recordingSince !== null;
  const seconds = Math.floor(elapsed / 1000);

  return (
    <View>
      {open && (
        <View style={styles.options}>
          <Option icon="add-file" label="Send a photo" onPress={() => (setOpen(false), onPickPhoto())} />
          <Option icon="mic" label="Record a voice note" onPress={() => void startRecording()} />
        </View>
      )}
      <View style={styles.pill}>
        {recording ? (
          <>
            <Pressable onPress={() => void stopRecording(false)} style={styles.plus} accessibilityRole="button" accessibilityLabel="Discard voice note">
              <Icon name="trash" size={22} color="secondaryTint2" />
            </Pressable>
            <View style={styles.recording} accessibilityLiveRegion="polite">
              <View style={styles.recDot} />
              <Text variant="body14" weight="medium" color="secondary">
                Recording {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
              </Text>
            </View>
            <Pressable onPress={() => void stopRecording(true)} style={styles.send} accessibilityRole="button" accessibilityLabel="Send voice note">
              <Icon name="send" size={16} color="white" />
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              onPress={() => setOpen((v) => !v)}
              style={[styles.plus, open && styles.plusOpen]}
              accessibilityRole="button"
              accessibilityLabel="Attachments"
              accessibilityState={{ expanded: open }}
            >
              <Icon name="plus" size={24} color="secondaryTint2" />
            </Pressable>
            <TextInput
              value={text}
              onChangeText={(t) => {
                setText(t);
                if (t) onTyping();
              }}
              placeholder="Type a message"
              placeholderTextColor={colors.secondaryTint2}
              style={styles.input}
              multiline
              autoCorrect={false}
              maxLength={LIMITS.messageBody}
              accessibilityLabel="Message"
              onFocus={() => setOpen(false)}
            />
            <Pressable
              onPress={send}
              disabled={!text.trim() || disabled}
              style={[styles.send, (!text.trim() || disabled) && styles.sendDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Send"
              accessibilityState={{ disabled: !text.trim() || disabled }}
            >
              <Icon name="send" size={16} color="white" />
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

/** Current microphone permission, asking only if needed. Gives up after 8 s (a stuck prompt). */
async function microphonePermission() {
  const ask = async () => {
    const current = await getRecordingPermissionsAsync();
    if (current.granted || !current.canAskAgain) return current;
    return requestRecordingPermissionsAsync();
  };
  return Promise.race([ask().catch(() => null), new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000))]);
}

function Option({ icon, label, onPress }: { icon: 'add-file' | 'mic'; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.option} accessibilityRole="button" accessibilityLabel={label}>
      <Icon name={icon} size={24} color="secondary" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  options: {
    marginLeft: 9,
    marginBottom: 8,
    gap: 12,
  },
  option: {
    width: CHAT.option,
    height: CHAT.option,
    borderRadius: CHAT.option / 2,
    backgroundColor: colors.iconButtonMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    minHeight: C.height,
    borderRadius: C.radius,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 15,
    paddingVertical: 9,
    gap: 14,
    // Figma: 10 24 54 rgba(51,51,51,0.03).
    shadowColor: colors.black,
    shadowOpacity: 0.04,
    shadowRadius: 27,
    shadowOffset: { width: 10, height: 24 },
    elevation: 2,
  },
  plus: {
    width: C.plus,
    height: C.plus,
    borderRadius: C.plus / 2,
    backgroundColor: colors.iconButtonMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusOpen: {
    backgroundColor: colors.secondaryTint5,
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
  recording: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.badge,
  },
});
