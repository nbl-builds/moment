import { colors } from '@moment/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Text } from '@/components/ui';
import { useLoginSheet } from '@/features/auth/login-sheet-provider';
import { useSession } from '@/features/auth/use-session';
import { EmojiAnswers, PhotoAnswers } from '@/features/quiz/components/answer-cards';
import { GlassQuestion } from '@/features/quiz/components/glass-question';
import { LeaveQuizSheet } from '@/features/quiz/components/leave-quiz-sheet';
import { QuizAnalyzing } from '@/features/quiz/components/quiz-analyzing';
import { QuizIntro } from '@/features/quiz/components/quiz-intro';
import { QuizResult } from '@/features/quiz/components/quiz-result';
import { QuizTopBar } from '@/features/quiz/components/quiz-top-bar';
import { SeatQuestion } from '@/features/quiz/components/seat-question';
import { ThermometerQuestion } from '@/features/quiz/components/thermometer-question';
import { QUIZ } from '@/features/quiz/layout';
import {
  answerAt,
  answerForValue,
  glassConfig,
  savePendingQuiz,
  seatConfig,
  sliderConfig,
  takePendingQuiz,
  type QuizAnswer,
  type QuizBadge,
  type QuizPick,
  type QuizQuestion,
} from '@/features/quiz/model';
import { api } from '@/lib/api';

type Phase = 'intro' | 'question' | 'analyzing' | 'result';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Adventure Quiz: Intro (20:2060) -> six questions (20:2103 ... 20:2453) ->
 * "Thank you" while scoring (20:3444) -> the badge (20:3543).
 * Answers stay in memory until the end. Guests sign in at the end; their
 * answers wait on the device and Home brings them back here (`?resume=1`).
 */
export default function QuizScreen() {
  const { resume } = useLocalSearchParams<{ resume?: string }>();
  const insets = useSafeAreaInsets();
  const session = useSession();
  const { openLoginSheet } = useLoginSheet();
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState<Phase>(resume === '1' ? 'analyzing' : 'intro');
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<Record<string, QuizPick>>({});
  const [sliderValue, setSliderValue] = useState<number | null>(null);
  const [badge, setBadge] = useState<QuizBadge | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastSubmitted, setLastSubmitted] = useState<string[]>([]);
  const [leaving, setLeaving] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const questions = useQuery({ queryKey: ['quiz', 'questions'], queryFn: () => api.quiz.getQuestions(), staleTime: 10 * 60 * 1000 });
  const list = questions.data ?? [];
  const question: QuizQuestion | undefined = list[index];
  const answered = Object.keys(picks).length > 0;

  // Warm the photo cache so answers don't pop in.
  useEffect(() => {
    const urls = (questions.data ?? []).flatMap((q) => q.answers.map((a) => api.media.url(a.image_url))).filter((u): u is string => !!u);
    if (urls.length) void Image.prefetch(urls);
  }, [questions.data]);

  useEffect(() => () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
  }, []);

  const submit = async (answerIds: string[]) => {
    setLastSubmitted(answerIds);
    setSubmitError(null);
    setPhase('analyzing');
    try {
      const [result] = await Promise.all([api.quiz.submit(answerIds), sleep(QUIZ.analyzingMinMs)]);
      setBadge(result.badge);
      // "Just for you" follows the new badge.
      void queryClient.invalidateQueries({ queryKey: ['home', 'for-you'] });
      void queryClient.invalidateQueries({ queryKey: ['see-all', 'for-you'] });
      void queryClient.invalidateQueries({ queryKey: ['me'] });
      setPhase('result');
    } catch {
      setSubmitError('We couldn’t save your answers. Check your connection and try again.');
    }
  };

  // Back from signing in: submit the answers the guest left on the device.
  const resumed = useRef(false);
  useEffect(() => {
    if (resume !== '1' || resumed.current) return;
    resumed.current = true;
    void takePendingQuiz().then((ids) => {
      if (ids) void submit(ids);
      else setPhase('intro');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on arrival
  }, [resume]);

  const finish = (finalPicks: Record<string, QuizPick>) => {
    const ids = list.map((q) => finalPicks[q.id]?.answerId).filter((id): id is string => !!id);
    if (ids.length !== list.length) return;
    if (session) {
      void submit(ids);
    } else {
      // Guests sign in first; Home resumes the quiz once they're in.
      void savePendingQuiz(ids).then(() => openLoginSheet());
    }
  };

  const goNext = (nextPicks: Record<string, QuizPick>) => {
    if (index < list.length - 1) setIndex(index + 1);
    else finish(nextPicks);
  };

  /** Show the pick, then move on (Figma has no Next button for these). */
  const pick = (q: QuizQuestion, p: QuizPick) => {
    if (advanceTimer.current) return;
    const next = { ...picks, [q.id]: p };
    setPicks(next);
    advanceTimer.current = setTimeout(() => {
      advanceTimer.current = null;
      goNext(next);
    }, QUIZ.advanceMs);
  };

  const back = () => {
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    if (index > 0) setIndex(index - 1);
    else setPhase('intro');
  };

  const leave = () => {
    setLeaving(false);
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  };
  const close = () => (answered ? setLeaving(true) : leave());

  // Android back: previous question, like the back arrow.
  useEffect(() => {
    if (phase !== 'question') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      back();
      return true;
    });
    return () => sub.remove();
  });

  const start = () => {
    if (questions.isError) {
      void questions.refetch();
      return;
    }
    setPicks({});
    setSliderValue(null);
    setIndex(0);
    setPhase('question');
  };

  const done = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  };

  return (
    <View style={styles.screen}>
      {/* No swipe-back mid-quiz: it would drop the answers without asking. */}
      <Stack.Screen options={{ gestureEnabled: phase !== 'question' || !answered }} />

      {phase === 'intro' && <QuizIntro onStart={start} loading={questions.isPending} error={questions.isError} />}

      {phase === 'question' && question && (
        <>
          <QuizTopBar onBack={back} onClose={close} />
          <ScrollView
            contentContainerStyle={{ paddingBottom: question.kind === 'seat' ? 0 : insets.bottom + 24 }}
            showsVerticalScrollIndicator={false}
            // The thermometer drags vertically, so its screen doesn't scroll (it fits).
            scrollEnabled={question.kind !== 'slider'}
          >
            <Animated.View key={question.id} entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)}>
              <Text
                variant="h3"
                color="secondary"
                align="center"
                style={[styles.title, { width: QUIZ.titleWidths[question.sort_order] ?? 303 }]}
                accessibilityRole="header"
                accessibilityLabel={`Question ${index + 1} of ${list.length}. ${question.prompt}`}
              >
                {question.prompt}
              </Text>
              <QuestionBody
                question={question}
                pickFor={picks[question.id]}
                onPick={(p) => pick(question, p)}
                sliderValue={sliderValue}
                onSliderChange={setSliderValue}
              />
            </Animated.View>
          </ScrollView>
          {question.kind === 'slider' && (
            <Button
              label="Next"
              onPress={() => {
                const cfg = sliderConfig(question);
                const value = sliderValue ?? picks[question.id]?.value ?? cfg.default;
                const answer = answerForValue(question, value);
                if (!answer) return;
                const next = { ...picks, [question.id]: { answerId: answer.id, value } };
                setPicks(next);
                goNext(next);
              }}
              style={[styles.next, { bottom: insets.bottom + 13 }]}
            />
          )}
        </>
      )}

      {phase === 'analyzing' && <QuizAnalyzing error={submitError} onRetry={() => void submit(lastSubmitted)} />}
      {phase === 'result' && <QuizResult badge={badge} onDone={done} />}

      <LeaveQuizSheet visible={leaving} onStay={() => setLeaving(false)} onLeave={leave} />
    </View>
  );
}

interface QuestionBodyProps {
  question: QuizQuestion;
  pickFor: QuizPick | undefined;
  onPick: (p: QuizPick) => void;
  sliderValue: number | null;
  onSliderChange: (value: number) => void;
}

/** One question's answers, drawn for its kind. */
function QuestionBody({ question, pickFor, onPick, sliderValue, onSliderChange }: QuestionBodyProps) {
  const selectedId = pickFor?.answerId ?? null;
  const pickAnswer = (a: QuizAnswer) => onPick({ answerId: a.id });

  switch (question.kind) {
    case 'photo_list':
      return <PhotoAnswers answers={question.answers} selectedId={selectedId} onPick={pickAnswer} />;
    case 'emoji_list':
      return <EmojiAnswers answers={question.answers} selectedId={selectedId} onPick={pickAnswer} />;
    case 'glass': {
      const cfg = glassConfig(question);
      const top = answerAt(question, cfg.top);
      const bottom = answerAt(question, cfg.bottom);
      return (
        <View style={styles.glass}>
          <GlassQuestion
            topLabel={top?.label ?? 'Half empty'}
            bottomLabel={bottom?.label ?? 'Half full'}
            selected={selectedId && selectedId === top?.id ? 'top' : selectedId && selectedId === bottom?.id ? 'bottom' : null}
            onPick={(half) => {
              const answer = half === 'top' ? top : bottom;
              if (answer) onPick({ answerId: answer.id });
            }}
          />
        </View>
      );
    }
    case 'seat': {
      const cfg = seatConfig(question);
      return (
        <SeatQuestion
          frameTop={QUIZ.optionsTop}
          selected={pickFor?.seat ?? null}
          columnLabels={cfg.columns.map((pos) => answerAt(question, pos)?.label ?? 'Seat')}
          onPick={(seat, column) => {
            const answer = answerAt(question, cfg.columns[column]);
            if (answer) onPick({ answerId: answer.id, seat });
          }}
        />
      );
    }
    case 'slider': {
      const cfg = sliderConfig(question);
      return (
        <View style={styles.thermometer}>
          <ThermometerQuestion
            value={sliderValue ?? pickFor?.value ?? cfg.default}
            min={cfg.min}
            max={cfg.max}
            unit={cfg.unit}
            onChange={onSliderChange}
          />
        </View>
      );
    }
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  // Figma: title at 125, 37pt below the 28pt icons.
  title: {
    marginTop: QUIZ.barToTitle,
    alignSelf: 'center',
    minHeight: QUIZ.titleHeight,
    marginBottom: QUIZ.titleToOptions,
  },
  // Figma: glass top at 288.
  glass: {
    marginTop: QUIZ.glass.top - QUIZ.optionsTop,
  },
  // Figma: thermometer top at 318.
  thermometer: {
    marginTop: QUIZ.thermometer.top - QUIZ.optionsTop,
  },
  next: {
    position: 'absolute',
    left: QUIZ.inset,
    right: QUIZ.inset,
  },
});
