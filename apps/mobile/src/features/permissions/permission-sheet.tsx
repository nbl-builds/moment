import { Image, type ImageSource } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button, Text } from '@/components/ui';
import { SkipForNow } from '@/features/auth/skip-for-now';

// Figma: "Location Message" sheets (20:2787 location, 20:2936 notifications).
// Sheet top 461 in the 926 frame; positions below are relative to it.
const GAP = {
  top: 40, // sheet top -> icon
  iconToTitle: 35,
  titleToBody: 6,
  bodyToButton: 60,
  buttonToSkip: 20,
  skipAboveSafeArea: 11,
} as const;
const ICON = 100;
const BODY_WIDTH = 353;
const INSET = 20;

export interface PermissionSheetProps {
  visible: boolean;
  icon: ImageSource | number;
  title: string;
  body: string;
  confirmLabel: string;
  /** Ask the OS for the permission. The sheet closes whatever the answer. */
  onConfirm: () => Promise<unknown>;
  /** "Skip for now", a swipe down, or after `onConfirm`. */
  onDone: () => void;
}

export function PermissionSheet({ visible, icon, title, body, confirmLabel, onConfirm, onDone }: PermissionSheetProps) {
  const insets = useSafeAreaInsets();
  const [asking, setAsking] = useState(false);

  const confirm = async () => {
    setAsking(true);
    try {
      await onConfirm();
    } catch {
      // A failed request is the same as a "no": carry on.
    } finally {
      setAsking(false);
      onDone();
    }
  };

  return (
    <BottomSheet visible={visible} onRequestClose={onDone} accessibilityLabel={title}>
      <View style={[styles.content, { paddingBottom: insets.bottom + GAP.skipAboveSafeArea }]}>
        <Image source={icon} style={styles.icon} contentFit="contain" accessible={false} />
        <Text variant="h3" color="secondary" align="center" style={styles.title}>
          {title}
        </Text>
        <Text variant="body15" weight="medium" color="secondaryTint2" align="center" style={styles.body}>
          {body}
        </Text>
        <Button label={confirmLabel} onPress={confirm} loading={asking} style={styles.button} />
        <SkipForNow onPress={onDone} style={styles.skip} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: GAP.top,
    paddingHorizontal: INSET,
    alignItems: 'center',
  },
  icon: {
    width: ICON,
    height: ICON,
  },
  title: {
    marginTop: GAP.iconToTitle,
  },
  body: {
    marginTop: GAP.titleToBody,
    maxWidth: BODY_WIDTH,
  },
  button: {
    marginTop: GAP.bodyToButton,
  },
  skip: {
    marginTop: GAP.buttonToSkip,
  },
});
