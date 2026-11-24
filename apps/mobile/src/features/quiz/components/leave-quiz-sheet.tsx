import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button, Text } from '@/components/ui';

/** Asked before leaving with answers given (no Figma frame; built like the app's other sheets). */
export function LeaveQuizSheet({ visible, onStay, onLeave }: { visible: boolean; onStay: () => void; onLeave: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <BottomSheet visible={visible} onRequestClose={onStay} accessibilityLabel="Leave the quiz?">
      <View style={[styles.content, { paddingBottom: insets.bottom + 16 }]}>
        <Text variant="h4" color="secondary" align="center">
          Leave the quiz?
        </Text>
        <Text variant="body14" color="secondaryTint2" align="center" style={styles.body}>
          Your answers so far won’t be saved.
        </Text>
        <Button label="Keep going" onPress={onStay} style={styles.first} />
        <Button label="Leave" variant="ghost" onPress={onLeave} style={styles.second} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  body: {
    marginTop: 8,
  },
  first: {
    marginTop: 24,
  },
  second: {
    marginTop: 8,
  },
});
