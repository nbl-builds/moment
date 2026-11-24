import { colors } from '@moment/shared';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Icon, Text } from '@/components/ui';
import { HOME } from '../layout';

/** "Adventure Quiz" card (Figma 15:1043): lime strip with a dark "Start Now". */
export function QuizCard({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel="Adventure Quiz. Discover your adventure personality"
    >
      <Icon name="quiz-badge" size={40} color="black" />
      <View style={styles.text}>
        <Text variant="body16" weight="bold" color="black" numberOfLines={1}>
          Adventure Quiz
        </Text>
        <Text variant="body10" weight="medium" color="secondary" numberOfLines={1}>
          Discover your adventure personality
        </Text>
      </View>
      {/* Same action as the card, which screen readers already announce. */}
      <Button label="Start Now" variant="dark" size="small" onPress={onPress} accessible={false} importantForAccessibility="no" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: HOME.inset,
    height: HOME.quiz.height,
    borderRadius: HOME.quiz.radius,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 12,
    gap: 5,
  },
  text: {
    flex: 1,
  },
});
