import { colors } from '@moment/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showToast } from '@/components/toast';
import { Button, Icon, Text } from '@/components/ui';
import { PageHeader } from '@/features/profile/components/page-header';
import { submitIdentityVerification } from '@/features/profile/mock';

type Slot = 'cnicFront' | 'cnicBack' | 'selfie';
const SLOTS: { key: Slot; title: string; note: string; selfie?: boolean }[] = [
  { key: 'cnicFront', title: 'CNIC front', note: 'The side with your photo. All four corners in view.' },
  { key: 'cnicBack', title: 'CNIC back', note: 'The side with the address and barcode.' },
  { key: 'selfie', title: 'Selfie', note: 'Your face, well lit, no sunglasses or cap.', selfie: true },
];

/** Identity Verification (no Figma frame): CNIC front and back plus a selfie. Submit is a mock. */
export default function VerifyIdentityScreen() {
  const insets = useSafeAreaInsets();
  const client = useQueryClient();
  const [photos, setPhotos] = useState<Partial<Record<Slot, string>>>({});
  const [sending, setSending] = useState(false);
  const ready = SLOTS.every((s) => photos[s.key]);

  const take = async (slot: (typeof SLOTS)[number]) => {
    const pick = async (camera: boolean) => {
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 0.7,
        cameraType: slot.selfie ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
      };
      try {
        if (camera) {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) return showToast('Allow camera access in Settings to take a photo');
        }
        const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
        const uri = result.canceled ? null : result.assets[0]?.uri;
        if (uri) setPhotos((p) => ({ ...p, [slot.key]: uri }));
      } catch {
        // The Simulator has no camera.
        showToast(camera ? 'No camera available. Choose a photo instead.' : 'Couldn’t open your photos');
      }
    };
    Alert.alert(slot.title, undefined, [
      { text: 'Take photo', onPress: () => void pick(true) },
      { text: 'Choose from photos', onPress: () => void pick(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const submit = async () => {
    if (!photos.cnicFront || !photos.cnicBack || !photos.selfie) return;
    setSending(true);
    try {
      await submitIdentityVerification({ cnicFrontUri: photos.cnicFront, cnicBackUri: photos.cnicBack, selfieUri: photos.selfie });
      await client.invalidateQueries({ queryKey: ['identity-verification'] });
      showToast('Thanks! We’ll check your documents within 24 hours.');
      router.back();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Couldn’t send your documents');
      setSending(false);
    }
  };

  return (
    <View style={styles.screen}>
      <PageHeader title="Verify Identity" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
        <View style={styles.intro}>
          <Icon name="shield-alert" size={40} />
          <Text variant="body15" color="blackTint2" style={styles.introText}>
            Hosts and groups trust verified guests more. Add your CNIC and a selfie; only the Moment team sees them.
          </Text>
        </View>
        <View style={styles.slots}>
          {SLOTS.map((slot, i) => {
            const uri = photos[slot.key];
            return (
              <Pressable
                key={slot.key}
                onPress={() => void take(slot)}
                style={({ pressed }) => [styles.slot, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`Step ${i + 1}: ${slot.title}${uri ? ', added. Tap to replace' : ''}`}
              >
                <View style={[styles.thumb, slot.selfie && styles.thumbRound]}>
                  {uri ? <Image source={uri} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Icon name="camera-button" size={41} />}
                </View>
                <View style={styles.slotText}>
                  <Text variant="subText16" weight="bold" color="black">
                    {i + 1}. {slot.title}
                  </Text>
                  <Text variant="subText12" color="blackTint3" style={styles.slotNote}>
                    {slot.note}
                  </Text>
                </View>
                {uri ? <Icon name="check-circle" size={24} color="price" /> : <Icon name="chevron-right" size={16} color="black" />}
              </Pressable>
            );
          })}
        </View>
        <Text variant="subText12" color="blackTint3" style={styles.privacy}>
          We store these privately and delete them once you’re verified, except what the law asks us to keep.
        </Text>
      </ScrollView>
      <View style={[styles.bar, { paddingBottom: insets.bottom + 16 }]}>
        <Button label="Submit" variant="dark" onPress={() => void submit()} loading={sending} disabled={!ready} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  intro: {
    marginTop: 20,
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  introText: {
    flex: 1,
  },
  slots: {
    marginTop: 20,
    marginHorizontal: 20,
    gap: 16,
  },
  slot: {
    minHeight: 100,
    borderRadius: 15,
    backgroundColor: colors.surface,
    padding: 10,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  pressed: {
    opacity: 0.85,
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.track,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbRound: {
    borderRadius: 40,
  },
  slotText: {
    flex: 1,
  },
  slotNote: {
    marginTop: 4,
  },
  privacy: {
    marginTop: 20,
    marginHorizontal: 24,
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.backgroundMuted,
  },
});
