import { colors } from '@moment/shared';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui';
import { api } from '@/lib/api';
import { QUIZ } from '../layout';
import type { QuizAnswer } from '../model';

const P = QUIZ.photo;
const E = QUIZ.emoji;

interface CardsProps {
  answers: QuizAnswer[];
  selectedId: string | null;
  onPick: (answer: QuizAnswer) => void;
}

/**
 * Photo answers (Q1 20:2103, Q2 20:2170): white cards, the photo alternating
 * left and right. The picked card gets a Black Tint 4 border.
 */
export function PhotoAnswers({ answers, selectedId, onPick }: CardsProps) {
  return (
    <View style={styles.list}>
      {answers.map((answer, i) => {
        const photoLeft = i % 2 === 0;
        const photo = api.media.url(answer.image_url);
        const selected = answer.id === selectedId;
        return (
          <Pressable
            key={answer.id}
            onPress={() => onPick(answer)}
            style={[styles.photoCard, !photoLeft && styles.reverse, selected && styles.selected]}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={answer.label}
          >
            <View style={styles.photo}>
              {photo && <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} accessible={false} />}
            </View>
            <Text variant="body18" weight="bold" color="secondary" style={photoLeft ? styles.textRight : styles.textLeft}>
              {answer.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Emoji answers (Q4 20:2305): tall cards, 150pt emoji on the left, label on the right. */
export function EmojiAnswers({ answers, selectedId, onPick }: CardsProps) {
  return (
    <View style={styles.list}>
      {answers.map((answer) => {
        const emoji = api.media.url(answer.image_url);
        const selected = answer.id === selectedId;
        return (
          <Pressable
            key={answer.id}
            onPress={() => onPick(answer)}
            style={[styles.emojiCard, selected && styles.selected]}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={answer.label}
          >
            {emoji ? <Image source={{ uri: emoji }} style={styles.emoji} contentFit="contain" accessible={false} /> : <View style={styles.emoji} />}
            <Text variant="body18" weight="bold" color="secondary" style={styles.emojiText}>
              {answer.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: P.gap,
    paddingHorizontal: QUIZ.inset,
  },
  photoCard: {
    height: P.height,
    borderRadius: P.radius,
    padding: P.padding,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    // Same box with or without the border, so picking doesn't shift anything.
    borderWidth: 1,
    borderColor: colors.white,
  },
  reverse: {
    flexDirection: 'row-reverse',
  },
  selected: {
    borderColor: colors.optionSelected,
  },
  photo: {
    width: P.image.width,
    height: P.image.height,
    borderRadius: P.image.radius,
    overflow: 'hidden',
    backgroundColor: colors.secondaryTint6,
  },
  // Figma: text starts 62pt after the photo, or 32pt in from the card's left edge.
  textRight: {
    flex: 1,
    marginLeft: P.textGap - 1,
  },
  textLeft: {
    flex: 1,
    marginLeft: P.textInset - P.padding - 1,
  },
  emojiCard: {
    height: E.height,
    borderRadius: E.radius,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: E.left - 1,
    borderWidth: 1,
    borderColor: colors.white,
  },
  emoji: {
    width: E.size,
    height: E.size,
  },
  emojiText: {
    flex: 1,
    marginLeft: E.textLeft - E.left - E.size,
  },
});
