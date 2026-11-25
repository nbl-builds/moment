import { colors } from '@moment/shared';
import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon, Text } from '@/components/ui';
import { useMyProfile } from '@/features/auth/use-session';
import { badgeIcon, withArticle } from '@/features/profile/badge';
import { PageHeader } from '@/features/profile/components/page-header';
import { RETAKE_AFTER_BOOKINGS, useCompletedBookingCount } from '@/features/profile/queries';

/** Adventure Quiz badge (48:3686). "Retake Quiz?" unlocks after 3 completed bookings. */
export default function QuizBadgeScreen() {
  const insets = useSafeAreaInsets();
  const me = useMyProfile();
  const done = useCompletedBookingCount();
  const badge = me.data?.profile.badge;
  const count = Math.min(done.data ?? 0, RETAKE_AFTER_BOOKINGS);
  const unlocked = (done.data ?? 0) >= RETAKE_AFTER_BOOKINGS;

  return (
    <View style={styles.screen}>
      <PageHeader title="Adventure Quiz" />
      {me.isPending ? (
        <ActivityIndicator color={colors.secondary} style={styles.loading} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>
          <View style={styles.card}>
            <Icon name={badgeIcon(badge?.code)} size={100} color="black" />
            <Text variant="h3" weight="extrabold" color="black" align="center" style={styles.title}>
              {badge ? `You are ${withArticle(badge.name)}` : 'No badge yet'}
            </Text>
            <Text variant="body15" color="blackTint2" align="center" style={styles.description}>
              {badge?.description ?? 'Answer six quick questions and we’ll match you with experiences you’ll love.'}
            </Text>
          </View>

          {badge ? (
            <View style={styles.retake}>
              <Text variant="h4" color="black" style={styles.retakeTitle}>
                Retake Quiz?
              </Text>
              <Text variant="body15" color="blackTint2" style={styles.retakeNote}>
                {unlocked
                  ? 'You’ve explored enough to see how your taste has changed. Retake it any time.'
                  : `Complete your first ${RETAKE_AFTER_BOOKINGS} bookings to retake the quiz.`}
              </Text>
              {!unlocked && (
                <View
                  style={styles.progress}
                  accessible
                  accessibilityRole="progressbar"
                  accessibilityLabel={`${count} of ${RETAKE_AFTER_BOOKINGS} bookings done`}
                  accessibilityValue={{ min: 0, max: RETAKE_AFTER_BOOKINGS, now: count }}
                >
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${(count / RETAKE_AFTER_BOOKINGS) * 100}%` }]} />
                  </View>
                  <Text variant="subText12" weight="medium" color="blackTint3">
                    {count} of {RETAKE_AFTER_BOOKINGS} bookings done
                  </Text>
                </View>
              )}
              {unlocked && <Button label="Retake Quiz" variant="outline" onPress={() => router.push('/quiz')} style={styles.retakeButton} />}
            </View>
          ) : (
            <Button label="Take the quiz" variant="dark" onPress={() => router.push('/quiz')} style={styles.explore} />
          )}

          <Button label="Let’s Explore" onPress={() => router.push('/map')} style={styles.explore} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  loading: {
    marginTop: 80,
  },
  card: {
    marginTop: 20,
    marginHorizontal: 20,
    minHeight: 342,
    borderRadius: 15,
    backgroundColor: colors.surface,
    alignItems: 'center',
    paddingTop: 65,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  title: {
    marginTop: 15,
    letterSpacing: 0.24,
  },
  description: {
    marginTop: 10,
  },
  retake: {
    marginTop: 28,
    marginHorizontal: 21,
  },
  retakeTitle: {
    letterSpacing: 0.2,
  },
  retakeNote: {
    marginTop: 10,
  },
  progress: {
    marginTop: 14,
    gap: 6,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.track,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.black,
  },
  retakeButton: {
    marginTop: 16,
    alignSelf: 'stretch',
    width: undefined,
  },
  explore: {
    marginTop: 30,
    marginHorizontal: 20,
    alignSelf: 'stretch',
    width: undefined,
  },
});
