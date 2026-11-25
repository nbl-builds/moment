import { colors, createGroupSchema, LIMITS } from '@moment/shared';
import { File } from 'expo-file-system';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton, Button, Icon, Text, textStyle } from '@/components/ui';
import { SuccessSheet } from '@/features/booking/components/success-sheet';
import { useRefreshGroups } from '@/features/groups/queries';
import { useUserPlace } from '@/features/home/use-user-place';
import { api } from '@/lib/api';

const INSET = 20;

/** New Group (48:4074) and the Congratulations sheet (48:4118). */
export default function NewGroupScreen() {
  const insets = useSafeAreaInsets();
  const { place } = useUserPlace();
  const refresh = useRefreshGroups();
  const [cover, setCover] = useState<{ uri: string; mimeType: string } | null>(null);
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [388, 174] });
    const asset = result.canceled ? null : result.assets[0];
    if (asset) setCover({ uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' });
  };

  const create = async () => {
    const parsed = createGroupSchema.safeParse({
      name,
      description: topic,
      destinationCity: place.city ?? undefined,
      visibility: 'private',
      isOpenToMatch: false,
      interestTagIds: [],
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Give your group a name');
      return;
    }
    setSaving(true);
    try {
      let coverUrl: string | undefined;
      if (cover) {
        const body = await new File(cover.uri).arrayBuffer();
        coverUrl = await api.groups.uploadCover({ body, contentType: cover.mimeType, extension: cover.mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg' });
      }
      const group = await api.groups.create({ ...parsed.data, coverUrl });
      await refresh();
      setCreated(group.id);
    } catch (e) {
      Alert.alert('Couldn’t create the group', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <View style={styles.inset}>
          <BackButton />
          <Text variant="h3" color="secondary" style={styles.title} accessibilityRole="header">
            New Group
          </Text>
          <View style={styles.divider} />

          <Pressable
            onPress={() => void pickCover()}
            style={styles.cover}
            accessibilityRole="button"
            accessibilityLabel={cover ? 'Change cover photo' : 'Upload cover photo'}
          >
            {cover && <Image source={cover.uri} style={StyleSheet.absoluteFill} contentFit="cover" />}
            <Icon name="camera-button" size={41} />
          </Pressable>

          <View style={styles.card}>
            <Text variant="subText14" weight="medium" color="secondary">
              Group Name*
            </Text>
            <TextInput
              value={name}
              onChangeText={(t) => {
                setName(t);
                if (error) setError(null);
              }}
              placeholder="e.g. Hunza in June"
              placeholderTextColor={colors.secondaryTint3}
              maxLength={80}
              autoCorrect={false}
              autoCapitalize="words"
              style={[styles.input, error && styles.inputError]}
              accessibilityLabel="Group name, required"
              returnKeyType="next"
            />
            {error && (
              <Text variant="body12" color="error" style={styles.error} accessibilityLiveRegion="polite">
                {error}
              </Text>
            )}
            <Text variant="subText14" weight="medium" color="secondary" style={styles.label}>
              Group Topic{' '}
              <Text variant="subText10" weight="medium" color="secondary">
                (Optional)
              </Text>
            </Text>
            <TextInput
              value={topic}
              onChangeText={setTopic}
              placeholder="What are you planning?"
              placeholderTextColor={colors.secondaryTint3}
              maxLength={LIMITS.groupDescription}
              style={styles.input}
              accessibilityLabel="Group topic, optional"
            />
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + 16 }]}>
        <Button label="Create Group" variant="dark" onPress={() => void create()} loading={saving} disabled={!name.trim()} />
      </View>

      <SuccessSheet
        visible={created !== null}
        kind="group"
        onDone={() => {
          const id = created;
          setCreated(null);
          if (id) router.replace({ pathname: '/group/[id]', params: { id } });
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  inset: {
    paddingHorizontal: INSET,
  },
  title: {
    marginTop: 24,
  },
  divider: {
    marginTop: 9,
    height: 1,
    backgroundColor: colors.divider,
  },
  cover: {
    marginTop: 20,
    height: 174,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.chipBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    marginTop: 30,
    padding: 15,
    paddingBottom: 25,
    borderRadius: 15,
    backgroundColor: colors.surface,
  },
  label: {
    marginTop: 24,
  },
  input: {
    ...textStyle('subText16'),
    marginTop: 10,
    height: 58,
    borderRadius: 15,
    paddingHorizontal: 18,
    backgroundColor: colors.track,
    color: colors.secondary,
  },
  inputError: {
    borderWidth: 1,
    borderColor: colors.errorBorder,
    backgroundColor: colors.errorSurface,
  },
  error: {
    marginTop: 6,
  },
  bar: {
    paddingHorizontal: INSET,
    paddingTop: 8,
  },
});
