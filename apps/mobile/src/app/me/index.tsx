import { colors, toLocalDate } from '@moment/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { File } from 'expo-file-system';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showToast } from '@/components/toast';
import { Button, Icon, Text } from '@/components/ui';
import { useMyProfile } from '@/features/auth/use-session';
import { badgeIcon, withArticle } from '@/features/profile/badge';
import { InfoCard } from '@/features/profile/components/info-card';
import { cityLabel, LocationSheet } from '@/features/profile/components/location-sheet';
import { PageHeader } from '@/features/profile/components/page-header';
import { getVerificationStatus } from '@/features/profile/mock';
import { api } from '@/lib/api';

/** Show profile (48:3951 unverified, 48:6140 verified). */
export default function ShowProfileScreen() {
  const insets = useSafeAreaInsets();
  const me = useMyProfile();
  const client = useQueryClient();
  const verification = useQuery({ queryKey: ['identity-verification'], queryFn: getVerificationStatus });
  const [uploading, setUploading] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);

  if (me.isPending) {
    return (
      <View style={styles.screen}>
        <PageHeader title="Profile" />
        <ActivityIndicator color={colors.secondary} style={styles.loading} />
      </View>
    );
  }
  if (!me.data) {
    return (
      <View style={styles.screen}>
        <PageHeader title="Profile" />
        <View style={styles.error}>
          <Text variant="subText16" weight="bold" color="black" align="center">
            Couldn’t load your profile
          </Text>
          <Button label="Try again" size="small" variant="dark" onPress={() => void me.refetch()} style={styles.errorButton} />
        </View>
      </View>
    );
  }

  const { profile, private: details } = me.data;
  const photo = api.media.url(profile.avatar_url);
  const verified = Boolean(profile.identity_verified_at);
  const badge = profile.badge;
  const joined = toLocalDate(profile.created_at).slice(0, 4);
  const inReview = verification.data === 'in_review';
  const aboutLine = [details?.pronouns, details?.email].filter(Boolean).join(' · ') || 'Click edit to add your details.';

  const changePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    setUploading(true);
    try {
      const type = asset.mimeType ?? 'image/jpeg';
      const body = await new File(asset.uri).arrayBuffer();
      await api.profile.uploadAvatar({ body, contentType: type, extension: type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg' });
      await client.invalidateQueries({ queryKey: ['me'] });
      showToast('Profile photo updated');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Couldn’t upload the photo');
    } finally {
      setUploading(false);
    }
  };

  const saveCity = async (city: string) => {
    setLocationOpen(false);
    try {
      await api.profile.updateHomeCity(city);
      // Home's rails read the home city from `me`.
      await client.invalidateQueries({ queryKey: ['me'] });
      showToast(`Home city set to ${city}`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Couldn’t save your city');
    }
  };

  return (
    <View style={styles.screen}>
      <PageHeader title="Profile" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>
        <View style={styles.card}>
          <View style={styles.photoWrap}>
            <View style={styles.photo}>
              {photo ? (
                <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel="Your profile photo" />
              ) : (
                <Icon name="avatar-placeholder" size={134} />
              )}
              {uploading && (
                <View style={styles.uploading}>
                  <ActivityIndicator color={colors.white} />
                </View>
              )}
            </View>
            <Pressable
              onPress={() => void changePhoto()}
              disabled={uploading}
              hitSlop={8}
              style={styles.camera}
              accessibilityRole="button"
              accessibilityLabel={photo ? 'Change profile photo' : 'Add profile photo'}
            >
              <Icon name="camera-badge" size={30} />
            </Pressable>
          </View>

          <View style={styles.nameRow}>
            <Text variant="h3" color="black" align="center" style={styles.name}>
              {profile.display_name || 'Your name'}
            </Text>
            {verified && <Icon name="verified-shield" size={18} accessibilityLabel="Identity verified" />}
          </View>
          <Text variant="subText16" color="blackTint3" align="center" style={styles.joined}>
            Joined in {joined}
          </Text>

          {!verified && (
            <>
              <View style={styles.divider} />
              <View style={styles.verify}>
                <Icon name="shield-alert" size={40} />
                <View style={styles.verifyText}>
                  <Text variant="subText16" weight="medium" color="black">
                    Identity Verification
                  </Text>
                  <Text variant="subText10" color="blackTint3">
                    {inReview ? 'We’re checking your documents.' : 'Show the community you are real.'}
                  </Text>
                </View>
                {!inReview && (
                  <Button label="Verify Now" variant="outline" size="small" onPress={() => router.push('/me/verify')} style={styles.verifyButton} />
                )}
              </View>
            </>
          )}

          <View style={[styles.divider, verified && styles.dividerVerified]} />
          <Pressable
            onPress={() => router.push(badge ? '/me/badge' : '/quiz')}
            style={styles.badgeRow}
            accessibilityRole="button"
            accessibilityLabel={badge ? `Your MAQ badge: ${badge.name}` : 'Take the Adventure Quiz to get your badge'}
          >
            <View style={styles.badgeText}>
              <Text variant="subText16" weight="bold" color="black">
                Your MAQ badge
              </Text>
              <Text variant="subText12" color="blackTint3" style={styles.badgeLine}>
                {badge ? `You are ${withArticle(badge.name.toLowerCase())}!` : 'Take the Adventure Quiz to get one.'}
              </Text>
            </View>
            <Icon name={badgeIcon(badge?.code)} size={44} color="black" />
          </Pressable>
        </View>

        <View style={styles.cards}>
          <InfoCard title="Personal Information" subtitle={aboutLine} action="Edit" onAction={() => router.push('/me/edit')} />
          <InfoCard
            title="Adventure Quiz"
            subtitle={badge ? `You are ${withArticle(badge.name)}!` : 'Find your travel personality.'}
            action={badge ? 'Edit' : 'Start'}
            onAction={() => router.push(badge ? '/me/badge' : '/quiz')}
          />
          <InfoCard
            title="Location"
            subtitle={profile.home_city ? cityLabel(profile.home_city) : 'Add your home city for picks near you.'}
            action={profile.home_city ? 'Change' : 'Edit'}
            onAction={() => setLocationOpen(true)}
          />
        </View>
      </ScrollView>

      <LocationSheet visible={locationOpen} current={profile.home_city} onPick={(c) => void saveCity(c)} onClose={() => setLocationOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  loading: {
    marginTop: 80,
  },
  error: {
    marginTop: 80,
    alignItems: 'center',
  },
  errorButton: {
    marginTop: 12,
    alignSelf: 'center',
  },
  card: {
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: 15,
    backgroundColor: colors.surface,
    paddingTop: 30,
    paddingBottom: 20,
  },
  photoWrap: {
    alignSelf: 'center',
  },
  photo: {
    width: 130,
    height: 130,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.divider,
  },
  uploading: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  camera: {
    position: 'absolute',
    top: -11,
    right: -17,
  },
  nameRow: {
    marginTop: 8,
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11,
  },
  name: {
    flexShrink: 1,
    letterSpacing: 0.24,
  },
  joined: {
    marginTop: 4,
  },
  divider: {
    marginTop: 24,
    marginHorizontal: 20,
    height: 1,
    backgroundColor: colors.divider,
  },
  dividerVerified: {
    marginHorizontal: 15,
  },
  verify: {
    marginTop: 20,
    marginLeft: 12,
    marginRight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifyText: {
    flex: 1,
  },
  verifyButton: {
    borderWidth: 1,
    borderColor: colors.black,
    borderRadius: 12,
  },
  badgeRow: {
    marginTop: 20,
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    flex: 1,
  },
  badgeLine: {
    marginTop: 4,
  },
  cards: {
    marginTop: 20,
    gap: 16,
  },
});
