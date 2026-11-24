import { colors } from '@moment/shared';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Text } from '@/components/ui';
import { enableBiometricSignIn } from '@/features/auth/biometrics';
import { SkipForNow } from '@/features/auth/skip-for-now';
import { HOME_WITH_PERMISSIONS, resetTo } from '@/features/auth/sign-in-flow';

// Figma: "Passcode & Face ID" (7:999). Measured in the 428 x 926 frame below the 44pt status bar.
const GAP = {
  top: 59, // status bar -> title
  titleToSubtitle: 3,
  subtitleToArt: 55.5,
  artToNote: 42,
  buttonToSkip: 20,
  skipAboveSafeArea: 11,
} as const;
const ART = 260;
const NOTE_WIDTH = 353;
const INSET = 20;

export default function FaceIdScreen() {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  const next = () => resetTo(HOME_WITH_PERMISSIONS);

  const onActivate = async () => {
    setBusy(true);
    try {
      const result = await enableBiometricSignIn();
      if (result.status === 'enabled') return next();
      if (result.status === 'cancelled') return;
      const [title, message] =
        result.status === 'failed'
          ? ['Could not turn on Face ID', `Please try again later (${result.error}).`]
          : result.status === 'not_enrolled'
            ? ['Face ID is not set up', 'Set up Face ID in your phone’s Settings, then turn it on from your Moment profile.']
            : ['Face ID is not available', 'This device does not support Face ID. You can still sign in with your phone number.'];
      Alert.alert(title, message, [{ text: 'OK', onPress: next }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + GAP.top }]}>
      <Text variant="h3" color="secondary" align="center">
        Passcode & Face ID
      </Text>
      <Text variant="body15" weight="medium" color="secondaryTint2" align="center" style={styles.subtitle}>
        Sign in quickly with passcode or face ID
      </Text>

      <Image
        source={require('../../assets/illustrations/face-id.svg')}
        style={styles.art}
        contentFit="contain"
        accessible={false}
      />

      <Text variant="body15" weight="medium" color="secondaryTint2" align="center" style={styles.note}>
        We don’t recommend using this feature if you share your device, we also do not store your Face ID
        information.
      </Text>

      <View style={styles.spacer} />

      <View style={[styles.actions, { paddingBottom: insets.bottom + GAP.skipAboveSafeArea }]}>
        <Button label="Activate Face ID" onPress={onActivate} loading={busy} />
        <SkipForNow onPress={next} style={styles.skip} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  subtitle: {
    marginTop: GAP.titleToSubtitle,
  },
  art: {
    marginTop: GAP.subtitleToArt,
    width: ART,
    height: ART,
  },
  note: {
    marginTop: GAP.artToNote,
    maxWidth: NOTE_WIDTH,
  },
  spacer: {
    flex: 1,
  },
  actions: {
    alignSelf: 'stretch',
    paddingHorizontal: INSET,
  },
  skip: {
    marginTop: GAP.buttonToSkip,
  },
});
