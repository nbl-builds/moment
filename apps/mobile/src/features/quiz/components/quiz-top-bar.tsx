import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton, Icon } from '@/components/ui';
import { QUIZ } from '../layout';

/** Back (previous question) and x (leave the quiz), Figma 20:3344. */
export function QuizTopBar({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + QUIZ.barTop }]}>
      <BackButton onPress={onBack} />
      <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Leave the quiz">
        <Icon name="close" size={QUIZ.icon} color="secondary" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: QUIZ.inset,
  },
});
