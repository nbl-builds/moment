import { colors, fontFamily, lineHeightPx, radii, spacing, textStyles } from '@moment/shared';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Placeholder screen. Onboarding replaces this in Phase 1.
export default function Index() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Moment</Text>
      </View>
      <Text style={styles.title}>Discover Unforgettable Experiences</Text>
      <Text style={styles.body}>Live like a local, anywhere in the world.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  badgeText: {
    color: colors.onPrimary,
    fontFamily: fontFamily.bold,
    fontSize: textStyles.body14.fontSize,
    lineHeight: lineHeightPx('body14'),
  },
  title: {
    color: colors.textInverse,
    fontFamily: fontFamily.bold,
    fontSize: textStyles.h4.fontSize,
    lineHeight: lineHeightPx('h4'),
    textAlign: 'center',
  },
  body: {
    color: colors.textInverse,
    fontFamily: fontFamily.regular,
    fontSize: textStyles.body16.fontSize,
    lineHeight: lineHeightPx('body16'),
    textAlign: 'center',
  },
});
