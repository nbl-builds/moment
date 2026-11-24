import { colors } from '@moment/shared';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { QUIZ } from '../layout';

const PL = QUIZ.plane;

interface SeatQuestionProps {
  /** Seat index (row * columns + column), or null. */
  selected: number | null;
  onPick: (seat: number, column: number) => void;
  /** Spoken name per column, e.g. "Window seat". */
  columnLabels: string[];
  /** Top of the question area in the frame, so the plane sits where Figma has it. */
  frameTop: number;
}

/**
 * "Pick your seat on the plane." (20:2367): the plane from Figma with 3 rows
 * of 2 + 2 seats. The picked seat turns lime (P Shade 2).
 */
export function SeatQuestion({ selected, onPick, columnLabels, frameTop }: SeatQuestionProps) {
  const { width } = useWindowDimensions();
  const scale = width / PL.width;
  const columns = PL.seatX.length;

  return (
    <View style={{ width, height: PL.height * scale, marginTop: (PL.top - frameTop) * scale }}>
      <Image source={require('../../../../assets/quiz/plane.png')} style={StyleSheet.absoluteFill} contentFit="fill" accessible={false} />
      {PL.seatY.map((y, row) =>
        PL.seatX.map((x, column) => {
          const index = row * columns + column;
          const isSelected = selected === index;
          return (
            <Pressable
              key={index}
              onPress={() => onPick(index, column)}
              hitSlop={4}
              style={[
                styles.seat,
                {
                  left: x * scale,
                  top: (y - PL.top) * scale,
                  width: PL.seat.width * scale,
                  height: PL.seat.height * scale,
                },
                isSelected && styles.selected,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${columnLabels[column] ?? 'Seat'}, row ${row + 1}`}
            />
          );
        }),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  seat: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: colors.black,
  },
  selected: {
    backgroundColor: colors.seatSelected,
  },
});
