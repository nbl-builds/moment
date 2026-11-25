import { colors } from '@moment/shared';
import { StyleSheet, View } from 'react-native';

/** Black map pin (Explore 48:2341): teardrop with a white ring. */
export function MapPin({ selected }: { selected?: boolean }) {
  return (
    <View style={styles.pin} accessible={false}>
      <View style={[styles.pinHead, selected && styles.pinHeadSelected]}>
        <View style={styles.pinRing}>
          <View style={[styles.pinDot, selected && styles.pinDotSelected]} />
        </View>
      </View>
      <View style={[styles.pinTip, selected && styles.pinTipSelected]} />
    </View>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 25,
    height: 36,
    alignItems: 'center',
  },
  pinHead: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinHeadSelected: {
    backgroundColor: colors.primary,
  },
  pinRing: {
    width: 15.6,
    height: 15.6,
    borderRadius: 7.8,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.secondary,
  },
  pinDotSelected: {
    backgroundColor: colors.secondary,
  },
  pinTip: {
    marginTop: -3,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.secondary,
  },
  pinTipSelected: {
    borderTopColor: colors.primary,
  },
});
