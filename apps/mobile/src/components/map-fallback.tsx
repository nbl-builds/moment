import { colors } from '@moment/shared';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon, Text } from '@/components/ui';

/**
 * Stand-in for a map where maps can't render yet (Android builds without a
 * Google Maps key, see docs/STAGING.md). Shows where it is instead of crashing.
 */
export function MapFallback({ note = 'Map coming soon', hint, style }: { note?: string; hint?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.box, style]} accessible accessibilityLabel={[note, hint].filter(Boolean).join('. ')}>
      <Icon name="map-pin" size={28} color="secondaryTint2" />
      <Text variant="subText14" weight="semibold" color="secondaryTint2" align="center">
        {note}
      </Text>
      {hint ? (
        <Text variant="subText12" color="secondaryTint3" align="center">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.track,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 16,
  },
});
