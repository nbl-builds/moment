import { colors } from '@moment/shared';
import * as Application from 'expo-application';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCollapsibleTabBarScroll, useHideTabBarWhile, useTabBarContentInset } from '@/components/tab-bar';
import { showToast } from '@/components/toast';
import { Button, Icon, Text } from '@/components/ui';
import { setGuestMode } from '@/features/auth/guest-mode';
import { useLoginSheet } from '@/features/auth/login-sheet-provider';
import { resetTo } from '@/features/auth/sign-in-flow';
import { useMyProfile, useSession } from '@/features/auth/use-session';
import { ConfirmSheet } from '@/features/groups/components/confirm-sheet';
import { useNewOffersCount } from '@/features/offers/seen';
import { FollowUsSheet } from '@/features/profile/components/follow-us-sheet';
import { CountBadge, MenuCard, MenuRow } from '@/features/profile/components/menu-card';
import { useAppSettings, useUnreadCount } from '@/features/profile/queries';
import { api } from '@/lib/api';

/** "Version 1.0.0 (12)": the store build's version; in Expo Go, the app.json version. */
function appVersion(): string {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return Constants.expoConfig?.version ?? '';
  const version = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '';
  const build = Application.nativeBuildVersion;
  return build ? `${version} (${build})` : version;
}

/** Profile tab (48:3255 full, 48:3423 top). Keeps the app's floating tab bar. */
export default function ProfileTab() {
  const insets = useSafeAreaInsets();
  const onScroll = useCollapsibleTabBarScroll();
  const bottomInset = useTabBarContentInset();
  const session = useSession();
  const me = useMyProfile();
  const unread = useUnreadCount();
  const newOffers = useNewOffersCount();
  const settings = useAppSettings();
  const { openLoginSheet } = useLoginSheet();
  const [sheet, setSheet] = useState<'signOut' | 'follow' | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  useHideTabBarWhile(sheet !== null);

  const signedIn = Boolean(session);
  /** Rows that need an account open the login sheet for guests. */
  const go = (href: Href, needsAccount = true) => (needsAccount && !signedIn ? openLoginSheet() : router.push(href));

  const rateUs = async () => {
    try {
      if ((await StoreReview.isAvailableAsync()) && (await StoreReview.hasAction())) {
        await StoreReview.requestReview();
        return;
      }
    } catch {
      // Fall through to the store page.
    }
    const url = Platform.OS === 'ios' ? settings.data?.storeUrls.ios : settings.data?.storeUrls.android;
    if (url) await Linking.openURL(url).catch(() => showToast('Couldn’t open the store'));
    else showToast('Rating opens once Moment is in the store');
  };

  const signOut = async () => {
    setSigningOut(true);
    await api.auth.signOut().catch(() => undefined);
    await setGuestMode(false);
    setSheet(null);
    resetTo('/onboarding');
  };

  const profile = me.data?.profile;
  const photo = api.media.url(profile?.avatar_url ?? null);
  const verified = Boolean(profile?.identity_verified_at);
  const name = profile?.display_name || 'Your profile';

  return (
    <View style={styles.screen}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: insets.top + 56, paddingBottom: bottomInset }}
      >
        <View style={styles.header}>
          <Text variant="h3" color="secondary" style={styles.title} accessibilityRole="header">
            Profile
          </Text>
          <Pressable
            onPress={() => go('/notifications')}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={unread.data ? `Notifications, ${unread.data} unread` : 'Notifications'}
          >
            <Icon name="bell" size={28} color="secondary" />
            {unread.data ? (
              <View style={styles.bellBadge}>
                <CountBadge count={unread.data} />
              </View>
            ) : null}
          </Pressable>
        </View>
        <View style={styles.divider} />

        {signedIn ? (
          <Pressable
            onPress={() => router.push('/me')}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`${name}${verified ? '' : ', identity not verified'}. Show profile`}
          >
            <View style={styles.avatar}>
              {photo ? (
                <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <Text variant="h4" color="blackTint2">
                  {name.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <View style={styles.cardText}>
              <View style={styles.nameRow}>
                <Text variant="h4" color="secondary" numberOfLines={1} style={styles.name}>
                  {name}
                </Text>
                {!verified && profile && <Icon name="alert-badge" size={14.6} />}
              </View>
              <Text variant="subText12" color="blackTint1" style={styles.show}>
                Show Profile
              </Text>
            </View>
            <Icon name="chevron-right" size={16} color="secondary" />
          </Pressable>
        ) : (
          <View style={[styles.card, styles.guestCard]}>
            <Text variant="h4" color="secondary">
              Sign in or create an account
            </Text>
            <Text variant="subText14" color="blackTint3" style={styles.guestNote}>
              Book experiences, save favourites and plan with friends.
            </Text>
            <Button label="Sign in" size="small" variant="dark" onPress={() => openLoginSheet()} style={styles.guestButton} />
          </View>
        )}

        <Text variant="h4" color="secondary" style={styles.section} accessibilityRole="header">
          General
        </Text>
        <MenuCard>
          <MenuRow icon="award" label="Membership" onPress={() => go('/memberships')} />
          <MenuRow icon="wallet" label="Wallet" onPress={() => go('/wallet')} />
          <MenuRow icon="credit-card" label="Payment method" onPress={() => go('/payment-methods')} />
          <MenuRow icon="percent" label="Offers" badge={signedIn ? newOffers : undefined} onPress={() => go('/offers')} />
          <MenuRow icon="file-key" label="Privacy & sharing" onPress={() => go('/privacy')} />
        </MenuCard>

        <Text variant="h4" color="secondary" style={styles.section} accessibilityRole="header">
          Support
        </Text>
        <MenuCard>
          <MenuRow icon="rocket" label="Get Started" onPress={() => go('/get-started', false)} />
          <MenuRow icon="help-circle" label="Receive Help" onPress={() => go('/help', false)} />
          <MenuRow icon="message-square" label="Give us feedback" onPress={() => go('/feedback')} />
          <MenuRow icon="smile" label="Follow us" onPress={() => setSheet('follow')} />
          <MenuRow icon="star-outline" label="Rate us" onPress={() => void rateUs()} />
        </MenuCard>

        <Text variant="h4" color="secondary" style={styles.section} accessibilityRole="header">
          Legal
        </Text>
        <MenuCard>
          <MenuRow icon="file-text" label="Privacy policy" onPress={() => go({ pathname: '/legal/[type]', params: { type: 'privacy' } }, false)} />
          <MenuRow icon="heart-handshake" label="Terms & conditions" onPress={() => go({ pathname: '/legal/[type]', params: { type: 'terms' } }, false)} />
        </MenuCard>

        {signedIn && <Button label="Sign Out" variant="quiet" onPress={() => setSheet('signOut')} style={styles.signOut} />}
        <Text variant="subText12" color="secondary" align="center" style={styles.version}>
          Version {appVersion()}
        </Text>
      </Animated.ScrollView>

      <ConfirmSheet
        visible={sheet === 'signOut'}
        title="Sign out of Moment?"
        body="You can sign back in any time with your phone number or email."
        confirmLabel="Sign Out"
        loading={signingOut}
        onConfirm={() => void signOut()}
        onClose={() => setSheet(null)}
      />
      <FollowUsSheet visible={sheet === 'follow'} onClose={() => setSheet(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  header: {
    marginLeft: 18,
    marginRight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    letterSpacing: 0.24,
  },
  bellBadge: {
    position: 'absolute',
    top: -3,
    left: -5,
  },
  divider: {
    marginTop: 11,
    marginHorizontal: 20,
    height: 1,
    backgroundColor: colors.chipBorder,
  },
  card: {
    marginTop: 20,
    marginHorizontal: 20,
    minHeight: 80,
    borderRadius: 15,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 13,
    paddingRight: 15,
    gap: 14,
    shadowColor: colors.black,
    shadowOpacity: 0.03,
    shadowRadius: 27,
    shadowOffset: { width: 10, height: 24 },
  },
  pressed: {
    opacity: 0.9,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.white,
    overflow: 'hidden',
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flexShrink: 1,
    letterSpacing: 0.2,
  },
  show: {
    marginTop: 3,
  },
  guestCard: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: 20,
    gap: 0,
  },
  guestNote: {
    marginTop: 6,
  },
  guestButton: {
    marginTop: 14,
  },
  section: {
    marginTop: 30,
    marginBottom: 18,
    marginHorizontal: 20,
    letterSpacing: 0.2,
  },
  signOut: {
    marginTop: 30,
    marginHorizontal: 20,
    width: undefined,
    alignSelf: 'stretch',
  },
  version: {
    marginTop: 10,
    marginBottom: 10,
  },
});
