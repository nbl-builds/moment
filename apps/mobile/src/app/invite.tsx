import { colors, formatPrice } from '@moment/shared';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showToast } from '@/components/toast';
import { BackButton, Button, Text } from '@/components/ui';
import { useAppSettings } from '@/features/profile/queries';
import { InvitesSheet } from '@/features/referrals/components/invites-sheet';
import { useMyProfile } from '@/features/auth/use-session';
import { getMyReferral } from '@/features/referrals/mock';

const ART = require('../../assets/images/profile/invite-friends-illustration.png');

/** Invite friends (48:5873): reward copy, Refer (share sheet), personal link with Copy, past invites (48:5969). */
export default function InviteScreen() {
  const insets = useSafeAreaInsets();
  const settings = useAppSettings();
  const name = useMyProfile().data?.profile.display_name ?? '';
  const referral = useQuery({ queryKey: ['referrals', 'me', name], queryFn: () => getMyReferral(name) });
  const [sheet, setSheet] = useState(false);

  const reward = settings.data ? formatPrice(settings.data.referralReward) : null;
  const link = referral.data?.link;
  const body = reward
    ? `Give a friend ${reward} on Moment, and get ${reward} when they book their first experience.`
    : 'Give a friend credit on Moment, and get credit when they book their first experience.';

  const share = async () => {
    if (!link) return;
    try {
      await Share.share({
        message: `${reward ? `Here’s ${reward} off your first experience on Moment. ` : 'Join me on Moment. '}${link}`,
      });
    } catch {
      showToast('Could not open sharing');
    }
  };

  const copy = async () => {
    if (!link) return;
    try {
      await Clipboard.setStringAsync(link);
      showToast('Link copied');
    } catch {
      showToast('Couldn’t copy the link');
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
        <BackButton />
        <Image source={ART} style={styles.art} contentFit="contain" accessible={false} />

        <Text variant="display32" weight="extrabold" color="black" align="center" style={styles.title} accessibilityRole="header">
          Invite friends
        </Text>
        <Text variant="subText16" weight="medium" color="blackTint2" align="center" style={styles.body}>
          {body}
        </Text>

        <Button label="Refer" onPress={() => void share()} disabled={!link} loading={referral.isPending} style={styles.refer} />

        <Text variant="subText16" weight="medium" color="blackTint2" align="center" style={styles.or}>
          or
        </Text>

        <View style={styles.linkBox}>
          {referral.isError ? (
            <Pressable onPress={() => void referral.refetch()} style={styles.linkText} accessibilityRole="button">
              <Text variant="subText16" color="blackTint3" numberOfLines={1}>
                Couldn’t load your link. Tap to retry
              </Text>
            </Pressable>
          ) : (
            <Text variant="subText16" color="blackTint3" numberOfLines={1} style={styles.linkText} selectable>
              {link ?? 'Loading your link…'}
            </Text>
          )}
          <Pressable onPress={() => void copy()} disabled={!link} hitSlop={12} accessibilityRole="button" accessibilityLabel="Copy link">
            <Text variant="body14" weight="bold" color="black">
              Copy
            </Text>
          </Pressable>
        </View>

        <Pressable onPress={() => setSheet(true)} hitSlop={10} style={styles.past} accessibilityRole="button">
          <Text variant="subText16" weight="bold" color="black" align="center">
            View past invites
          </Text>
        </Pressable>
      </ScrollView>

      <InvitesSheet visible={sheet} onClose={() => setSheet(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  content: {
    paddingHorizontal: 20,
  },
  // Figma: 350 x 288 at x40, 42 below the back chevron.
  art: {
    alignSelf: 'center',
    width: 350,
    height: 288,
    maxWidth: '100%',
    marginTop: 42,
  },
  title: {
    marginTop: 57,
    lineHeight: 44,
  },
  body: {
    alignSelf: 'center',
    maxWidth: 316,
    marginTop: 8,
  },
  refer: {
    marginTop: 45,
    borderRadius: 15,
  },
  or: {
    marginTop: 32,
  },
  // Figma 48:5961: 58pt white field, 16 inside on both sides.
  linkBox: {
    marginTop: 22,
    height: 58,
    borderRadius: 15,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  linkText: {
    flex: 1,
  },
  past: {
    marginTop: 54,
    alignSelf: 'center',
  },
});
