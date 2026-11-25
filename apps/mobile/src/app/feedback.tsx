import { colors, FEEDBACK_TOPIC_LABELS, FEEDBACK_TOPICS, feedbackSchema, LIMITS, type FeedbackTopic } from '@moment/shared';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showToast } from '@/components/toast';
import { Button, Icon, Text, textStyle } from '@/components/ui';
import { useSession } from '@/features/auth/use-session';
import { FEEDBACK_AREAS, sendFeedback, type FeedbackArea } from '@/features/support/api';
import { OptionSheet } from '@/features/support/components/option-sheet';

const INSET = 20;
const FIELD = { height: 53, radius: 12, padX: 20 } as const;
const TOPIC_OPTIONS = FEEDBACK_TOPICS.map((value) => ({ value, label: FEEDBACK_TOPIC_LABELS[value] }));

type Errors = Partial<Record<'topic' | 'area' | 'message', string>>;

/** Give us feedback (48:6365); the message box shows once both topics are picked (48:6410). */
export default function FeedbackScreen() {
  const insets = useSafeAreaInsets();
  const session = useSession();
  const [topic, setTopic] = useState<FeedbackTopic | null>(null);
  const [area, setArea] = useState<FeedbackArea | null>(null);
  const [message, setMessage] = useState('');
  const [sheet, setSheet] = useState<'topic' | 'area' | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);

  const submit = async () => {
    const next: Errors = {};
    if (!topic) next.topic = 'Pick what your feedback is about';
    if (!area) next.area = 'Pick a topic';
    const parsed = feedbackSchema.safeParse({ topic: topic ?? undefined, message });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === 'message' && topic && area) next.message ??= issue.message;
      }
    }
    setErrors(next);
    if (Object.keys(next).length || !parsed.success || !topic || !area) return;
    if (!session) {
      showToast('Log in to send feedback');
      return;
    }
    setSending(true);
    try {
      await sendFeedback({ topic, area, message: parsed.data.message });
      showToast('Thanks! Your feedback was sent');
      router.back();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Couldn’t send your feedback');
      setSending(false);
    }
  };

  const showMessage = Boolean(topic && area);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 48 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
          <Icon name="x" size={28} color="black" />
        </Pressable>

        <Image
          source={require('../../assets/images/profile/feedback-hero.jpg')}
          style={styles.hero}
          contentFit="cover"
          accessibilityLabel="A traveller greeting a smiling local host"
        />
        <Text variant="h3" color="black" style={styles.title}>
          Share your feedback
        </Text>
        <Text variant="body15" color="blackTint2" style={styles.body}>
          Thank you for taking the time to send us your recommendations, thoughts and issues. We take your feedback and experiences seriously.
          We will pass it on to our internal team for further review.
        </Text>
        <Text variant="body15" color="blackTint2" style={[styles.body, styles.paragraph]}>
          If you need assistance with a specific question, be sure to check our{' '}
          <Text variant="body15" weight="semibold" color="blackTint2" onPress={() => router.push('/help')} accessibilityRole="link">
            Help Center
          </Text>{' '}
          or{' '}
          <Text variant="body15" weight="semibold" color="blackTint2" onPress={() => router.push('/support')} accessibilityRole="link">
            contact us
          </Text>
          .
        </Text>

        <Text variant="body15" color="black" style={[styles.label, styles.firstLabel]}>
          What’s your feedback about ?
        </Text>
        <Select
          value={topic ? FEEDBACK_TOPIC_LABELS[topic] : null}
          placeholder="Please select"
          label="What’s your feedback about"
          error={errors.topic}
          onPress={() => setSheet('topic')}
        />

        <Text variant="body15" color="black" style={[styles.label, styles.nextLabel]}>
          Select the topic
        </Text>
        <Select
          value={area ? (FEEDBACK_AREAS.find((a) => a.value === area)?.label ?? null) : null}
          placeholder="Pick one"
          label="Topic"
          error={errors.area}
          onPress={() => setSheet('area')}
        />

        {showMessage && (
          <>
            <View style={[styles.box, styles.message, errors.message && styles.boxError]}>
              <TextInput
                value={message}
                onChangeText={(t) => {
                  setMessage(t);
                  if (errors.message) setErrors((e) => ({ ...e, message: undefined }));
                }}
                placeholder="Type your message here..."
                placeholderTextColor={colors.blackTint2}
                multiline
                textAlignVertical="top"
                maxLength={LIMITS.supportBody}
                style={styles.input}
                accessibilityLabel="Your feedback"
              />
            </View>
            {errors.message && <FieldError text={errors.message} />}
          </>
        )}

        <Button
          label="Submit"
          onPress={() => void submit()}
          loading={sending}
          disabled={sending}
          style={showMessage ? styles.submitAfterMessage : styles.submit}
        />
      </ScrollView>

      <OptionSheet
        visible={sheet === 'topic'}
        title="Your feedback is about"
        options={TOPIC_OPTIONS}
        selected={topic}
        onSelect={(v) => {
          setTopic(v);
          setErrors((e) => ({ ...e, topic: undefined }));
        }}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'area'}
        title="Select the topic"
        options={FEEDBACK_AREAS}
        selected={area}
        onSelect={(v) => {
          setArea(v);
          setErrors((e) => ({ ...e, area: undefined }));
        }}
        onClose={() => setSheet(null)}
      />
    </KeyboardAvoidingView>
  );
}

function Select({ value, placeholder, label, error, onPress }: { value: string | null; placeholder: string; label: string; error?: string; onPress: () => void }) {
  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.box, styles.select, error && styles.boxError, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: value ?? 'Not selected' }}
        accessibilityHint={error}
      >
        <Text variant="body15" weight={value ? 'medium' : 'regular'} color={value ? 'black' : 'blackTint2'} style={styles.selectText} numberOfLines={1}>
          {value ?? placeholder}
        </Text>
        <Icon name="chevron-down" size={24} color="black" />
      </Pressable>
      {error && <FieldError text={error} />}
    </>
  );
}

function FieldError({ text }: { text: string }) {
  return (
    <Text variant="subText13" color="debit" style={styles.error} accessibilityLiveRegion="polite">
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  content: {
    paddingHorizontal: INSET,
  },
  close: {
    width: 28,
    height: 28,
  },
  hero: {
    marginTop: 43,
    width: '100%',
    aspectRatio: 388 / 288,
    borderRadius: 15,
    backgroundColor: colors.track,
  },
  title: {
    marginTop: 13,
    lineHeight: 32,
    letterSpacing: 0.24,
  },
  body: {
    marginTop: 11,
    lineHeight: 21,
    letterSpacing: 0.15,
  },
  paragraph: {
    marginTop: 21,
  },
  label: {
    lineHeight: 21,
    letterSpacing: 0.15,
    marginBottom: 10,
  },
  firstLabel: {
    marginTop: 32,
  },
  nextLabel: {
    marginTop: 32,
  },
  box: {
    borderWidth: 1,
    borderColor: colors.blackTint3,
    borderRadius: FIELD.radius,
  },
  boxError: {
    borderColor: colors.debit,
  },
  select: {
    height: FIELD.height,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: FIELD.padX,
    paddingRight: 18,
    gap: 12,
  },
  pressed: {
    backgroundColor: colors.track,
  },
  selectText: {
    flex: 1,
    lineHeight: 21,
    letterSpacing: 0.15,
  },
  message: {
    marginTop: 31,
    height: 183,
    paddingHorizontal: FIELD.padX,
    paddingTop: 13,
    paddingBottom: 13,
  },
  input: {
    ...textStyle('body15'),
    flex: 1,
    lineHeight: 21,
    letterSpacing: 0.15,
    color: colors.black,
    padding: 0,
  },
  error: {
    marginTop: 6,
  },
  submit: {
    marginTop: 55,
  },
  submitAfterMessage: {
    marginTop: 48,
  },
});
