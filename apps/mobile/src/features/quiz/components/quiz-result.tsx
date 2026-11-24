import { colors } from '@moment/shared';
import { Image } from 'expo-image';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon, Text } from '@/components/ui';
import { api } from '@/lib/api';
import { QUIZ } from '../layout';
import type { QuizBadge } from '../model';

const FRAME_STATUS = 44;
// Figma "Result" (20:3543): illustration 522 x 452 at (-54, 174), description at 636.
const ART = { x: -54, y: 174, width: 522, height: 452 } as const;

/**
 * "We think you're a <badge>": the badge's illustration (Nature Lover has one;
 * the others show a placeholder until theirs are drawn) and its description.
 */
export function QuizResult({ badge, onDone }: { badge: QuizBadge | null; onDone: () => void }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const s = width / 428;
  const offset = insets.top - FRAME_STATUS;
  const art = badge?.icon?.startsWith('storage://') ? api.media.url(badge.icon) : null;

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + 13 }]}>
      <View style={{ height: offset + 94 }} />
      <Text variant="body18" weight="bold" color="secondaryTint3" align="center">
        We think you’re a
      </Text>
      <Text variant="h1" color="secondary" align="center" style={styles.name} accessibilityRole="header">
        {badge?.name ?? 'Explorer'}
      </Text>

      {/* Name ends at 164 in the frame; the art starts at 174. */}
      <View style={{ height: ART.height * s, marginTop: (ART.y - 164) * s }}>
        {art ? (
          <Image
            source={{ uri: art }}
            style={[styles.art, { left: ART.x * s - QUIZ.inset, width: ART.width * s, height: ART.height * s }]}
            contentFit="cover"
            accessible
            accessibilityLabel={`${badge?.name} illustration`}
          />
        ) : (
          // Placeholder until this badge has its own illustration (see docs/ROADMAP.md).
          <View style={styles.placeholder} accessible={false}>
            <View style={[styles.circle, { width: 260 * s, height: 260 * s, borderRadius: 130 * s }]}>
              <Icon name="quiz-badge" size={120 * s} color="secondary" />
            </View>
          </View>
        )}
      </View>

      <Text variant="body15" weight="medium" color="secondaryTint2" align="center" style={styles.description}>
        {badge?.description ?? 'We’ll use your answers to pick experiences for you.'}
      </Text>
      <Button label="That sounds like me" onPress={onDone} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
    paddingHorizontal: QUIZ.inset,
  },
  // Figma: "We think you're a" at 94, name at 126 (27pt line + 5).
  name: {
    marginTop: 5,
  },
  // Multiply drops the illustration's white background onto the off-white page, as in Figma.
  art: {
    position: 'absolute',
    top: 0,
    mixBlendMode: 'multiply',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    backgroundColor: colors.bubble,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    marginTop: 10,
    alignSelf: 'center',
    maxWidth: 319,
  },
  button: {
    marginTop: 'auto',
  },
});
