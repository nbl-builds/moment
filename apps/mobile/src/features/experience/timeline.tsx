import { colors, formatDuration } from '@moment/shared';
import { StyleSheet, View } from 'react-native';
import { Icon, Text } from '@/components/ui';

export interface TimelineStep {
  title: string;
  description: string | null;
  duration_minutes: number | null;
}

/**
 * "What you will be doing" (48:6527): a vertical line with a pin for the
 * first step and dots after it; title Medium 18, text Medium 15.
 */
export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <View style={styles.list}>
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        return (
          <View key={`${i}-${s.title}`} style={styles.step} accessible accessibilityLabel={`Step ${i + 1}: ${s.title}. ${s.description ?? ''}`}>
            <View style={styles.rail}>
              {i === 0 ? <Icon name="pin-fill" size={24} color="secondary" /> : <View style={styles.dot} />}
              {!last && <View style={styles.line} />}
            </View>
            <View style={[styles.text, !last && styles.textGap]}>
              <Text variant="body18" weight="medium" color="secondary">
                {s.title}
                {s.duration_minutes ? (
                  <Text variant="body12" weight="medium" color="secondaryTint3">
                    {'  '}
                    {formatDuration(s.duration_minutes)}
                  </Text>
                ) : null}
              </Text>
              {s.description && (
                <Text variant="body15" weight="medium" color="secondaryTint2" style={styles.description}>
                  {s.description}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: 20,
  },
  step: {
    flexDirection: 'row',
    gap: 6,
  },
  rail: {
    width: 24,
    alignItems: 'center',
  },
  dot: {
    marginTop: 7,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.secondary,
  },
  line: {
    flex: 1,
    width: 1,
    marginTop: 0,
    backgroundColor: colors.black,
  },
  text: {
    flex: 1,
  },
  textGap: {
    paddingBottom: 28,
  },
  description: {
    marginTop: 4,
  },
});
