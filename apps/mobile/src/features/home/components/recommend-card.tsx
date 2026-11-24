import { colors } from '@moment/shared';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from '@/components/ui';
import { HOME } from '../layout';

/**
 * "Are we missing something?" (Figma 18:1047): white card with a dark
 * "Recommend" button and three round place photos on the right.
 */
export function RecommendCard({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.card}>
      <Text variant="body16" weight="bold" color="black">
        Are we missing something?
      </Text>
      {/* Figma's subtitle is placeholder copy ("The Surprising Local"); this says what the button does. */}
      <Text variant="body12" weight="medium" color="secondaryTint2" style={styles.subtitle}>
        Tell us about a place we should add.
      </Text>
      <Button
        label="Recommend"
        variant="dark"
        size="small"
        icon="location-add"
        iconSize={16}
        onPress={onPress}
        style={styles.button}
      />
      <Image source={require('../../../../assets/images/recommend-1.png')} style={[styles.circle, styles.big]} accessible={false} />
      <Image source={require('../../../../assets/images/recommend-2.png')} style={[styles.circle, styles.top]} accessible={false} />
      <Image source={require('../../../../assets/images/recommend-3.png')} style={[styles.circle, styles.bottom]} accessible={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: HOME.inset,
    height: HOME.missing.height,
    borderRadius: HOME.missing.radius,
    backgroundColor: colors.white,
    paddingTop: 23,
    paddingLeft: 16,
    overflow: 'hidden',
  },
  subtitle: {
    marginTop: 4,
    maxWidth: 190,
  },
  button: {
    marginTop: 18,
  },
  circle: {
    position: 'absolute',
  },
  // Figma positions, measured from the card's right edge so wider phones keep them in place.
  big: { width: 105, height: 105, borderRadius: 52.5, right: 74, top: 56 },
  top: { width: 56, height: 57, borderRadius: 28.5, right: 23, top: 19 },
  bottom: { width: 47, height: 47, borderRadius: 23.5, right: 19, top: 128 },
});
