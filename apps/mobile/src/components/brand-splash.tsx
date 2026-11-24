import { colors } from '@moment/shared';
import { Image } from 'expo-image';
import { StyleSheet, View, type ViewProps } from 'react-native';

// Figma: "Splash Screen" (node 6:1461). White background, the Moment "M"
// centred at its native 151 x 136. The native splash (app.json) uses a PNG
// export of the same logo at the same size, so the hand-off is seamless.
const LOGO_WIDTH = 151;
const LOGO_HEIGHT = 136;

export function BrandSplash({ onLayout }: Pick<ViewProps, 'onLayout'>) {
  return (
    <View style={styles.container} onLayout={onLayout} accessibilityLabel="Moment" accessibilityRole="image">
      <Image source={require('../../assets/logo.svg')} style={styles.logo} contentFit="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
  },
});
