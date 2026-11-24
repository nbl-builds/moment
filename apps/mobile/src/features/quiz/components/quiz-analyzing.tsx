import { colors } from '@moment/shared';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from '@/components/ui';

/** "Thank you for submitting answers." (20:3444), shown while the answers are scored. */
export function QuizAnalyzing({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  return (
    <View style={styles.screen} accessibilityLiveRegion="polite">
      <Image source={require('../../../../assets/quiz/analyzing-logo.png')} style={styles.logo} accessible={false} />
      <Text variant="h3" color="secondary" align="center" style={styles.title} accessibilityRole="header">
        {'Thank you for\nsubmitting answers.'}
      </Text>
      <Text variant="body15" weight="medium" color="secondaryTint2" align="center" style={styles.body}>
        {error ?? 'We are almost done analyzing your data. Please do not power off the phone or close the app.'}
      </Text>
      {error && <Button label="Try again" size="small" variant="dark" onPress={onRetry} style={styles.retry} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundMuted,
    paddingHorizontal: 54,
  },
  // Figma: 88.7 x 78.3 logo, 32pt above the title, title -> body 18pt.
  logo: {
    width: 88.73,
    height: 78.26,
  },
  title: {
    marginTop: 32,
  },
  body: {
    marginTop: 18,
    maxWidth: 319,
  },
  retry: {
    marginTop: 20,
  },
});
