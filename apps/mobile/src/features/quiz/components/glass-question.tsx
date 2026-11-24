import { colors } from '@moment/shared';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui';
import { QUIZ } from '../layout';

const G = QUIZ.glass;

interface GlassQuestionProps {
  /** Which half is picked, if any. */
  selected: 'top' | 'bottom' | null;
  onPick: (half: 'top' | 'bottom') => void;
  topLabel: string;
  bottomLabel: string;
}

/**
 * "Is the glass half empty or half full?" (20:2237): tap above the water line
 * for half empty, below it for half full. The picked half's label gets a lime pill.
 */
export function GlassQuestion({ selected, onPick, topLabel, bottomLabel }: GlassQuestionProps) {
  return (
    <View style={styles.glass}>
      <Image source={require('../../../../assets/quiz/glass.svg')} style={StyleSheet.absoluteFill} contentFit="contain" accessible={false} />
      <Half
        label={topLabel}
        arrow={require('../../../../assets/quiz/arrow-up.svg')}
        selected={selected === 'top'}
        onPress={() => onPick('top')}
        style={styles.top}
        labelTop={0.2576 / G.waterLine}
      />
      <Half
        label={bottomLabel}
        arrow={require('../../../../assets/quiz/arrow-down.svg')}
        selected={selected === 'bottom'}
        onPress={() => onPick('bottom')}
        style={styles.bottom}
        labelTop={(0.6593 - G.waterLine) / (1 - G.waterLine)}
      />
    </View>
  );
}

function Half({
  label,
  arrow,
  selected,
  onPress,
  style,
  labelTop,
}: {
  label: string;
  arrow: number;
  selected: boolean;
  onPress: () => void;
  style: object;
  /** Label row's top, as a fraction of this half (Figma: 26% / 66% of the glass). */
  labelTop: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.half, style]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <View style={[styles.label, { top: `${labelTop * 100}%` }, selected && styles.labelSelected]}>
        <Image source={arrow} style={styles.arrow} accessible={false} />
        <Text variant="body18" weight="bold" color="secondary">
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  glass: {
    width: G.width,
    height: G.height,
    alignSelf: 'center',
  },
  half: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  top: {
    top: 0,
    height: `${G.waterLine * 100}%`,
  },
  bottom: {
    bottom: 0,
    height: `${(1 - G.waterLine) * 100}%`,
  },
  // Figma: 29pt arrow, 8pt gap, 18pt bold label.
  label: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 2,
    marginLeft: -12,
    borderRadius: 20,
  },
  labelSelected: {
    backgroundColor: colors.primary,
  },
  arrow: {
    width: 29,
    height: 29,
  },
});
