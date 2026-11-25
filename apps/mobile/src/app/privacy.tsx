import { colors, type PrivacyPrefs } from '@moment/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showToast } from '@/components/toast';
import { Button, Icon, Text, Toggle } from '@/components/ui';
import { setGuestMode } from '@/features/auth/guest-mode';
import { resetTo } from '@/features/auth/sign-in-flow';
import { useMyProfile, useSession } from '@/features/auth/use-session';
import { ConfirmSheet } from '@/features/groups/components/confirm-sheet';
import { PageHeader } from '@/features/profile/components/page-header';
import { deactivateAccount, requestAccountDeletion, requestDataExport } from '@/features/profile/mock';
import { TitledSheet } from '@/features/support/components/titled-sheet';
import { api } from '@/lib/api';

const INSET = 20;
const DEFAULT_PREFS: PrivacyPrefs = { profile_public: true, likes_visible_to_groups: true, bookings_visible_to_hosts: true };

const SHARING: { key: keyof PrivacyPrefs; title: string; note: string }[] = [
  { key: 'profile_public', title: 'Public profile', note: 'Others can see your profile and personality badge.' },
  { key: 'likes_visible_to_groups', title: 'Show my likes to groups', note: 'Group members can see what you’ve liked.' },
  { key: 'bookings_visible_to_hosts', title: 'Show my bookings to hosts', note: 'Hosts can see your past bookings with them.' },
];

type Sheet = 'data' | 'sharing' | 'deactivate' | 'delete' | null;

/** Privacy & Sharing (48:5832). The two cards open sheets; their content is not in Figma. */
export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const session = useSession();
  const [sheet, setSheet] = useState<Sheet>(null);

  const open = (next: Sheet) => {
    if (!session) return showToast('Log in to manage your privacy');
    setSheet(next);
  };

  return (
    <View style={styles.screen}>
      <PageHeader title="Privacy & Sharing" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <Card
          title="Manage my data"
          lines={['Download your personal data, or request', 'to deactivate or delete your account.']}
          onPress={() => open('data')}
        />
        <Card title="Sharing" lines={['Decide how your profile and activity are', 'shown to others.']} onPress={() => open('sharing')} />
      </ScrollView>

      <ManageData sheet={sheet} setSheet={setSheet} />
      <Sharing visible={sheet === 'sharing'} onClose={() => setSheet(null)} />
    </View>
  );
}

function Card({ title, lines, onPress }: { title: string; lines: [string, string]; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={lines.join(' ')}
    >
      <View style={styles.cardText}>
        <Text variant="subText16" weight="semibold" color="black">
          {title}
        </Text>
        <Text variant="subText13" color="blackTint3">
          {lines[0]}
          {'\n'}
          {lines[1]}
        </Text>
      </View>
      <Icon name="chevron-right" size={18} color="black" />
    </Pressable>
  );
}

async function signOut() {
  await api.auth.signOut().catch(() => undefined);
  await setGuestMode(false);
  resetTo('/onboarding');
}

function ManageData({ sheet, setSheet }: { sheet: Sheet; setSheet: (s: Sheet) => void }) {
  const [busy, setBusy] = useState<'export' | 'deactivate' | 'delete' | null>(null);

  const download = async () => {
    setBusy('export');
    try {
      const res = await requestDataExport();
      setSheet(null);
      Alert.alert('We’re preparing your data', `We’ll email you a download link within ${res.readyWithinHours} hours.\n\nReference: ${res.reference}`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Couldn’t request your data');
    } finally {
      setBusy(null);
    }
  };

  const deactivate = async () => {
    setBusy('deactivate');
    try {
      await deactivateAccount();
      setSheet(null);
      showToast('Account deactivated. Sign in any time to come back.');
      await signOut();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Couldn’t deactivate your account');
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy('delete');
    try {
      const res = await requestAccountDeletion({});
      setSheet(null);
      Alert.alert(
        'Your account will be deleted',
        `You’ll be signed out now. Your account will be deleted for good in ${res.deleteAfterDays} days. Sign in before then if you change your mind.\n\nReference: ${res.reference}`,
        [{ text: 'OK', onPress: () => void signOut() }],
        { cancelable: false },
      );
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Couldn’t delete your account');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <TitledSheet visible={sheet === 'data'} title="Manage my data" onClose={() => setSheet(null)}>
        <View style={styles.sheetList}>
          <Row
            title="Download my data"
            note="Get a copy of your profile, bookings and activity by email."
            onPress={() => void download()}
            loading={busy === 'export'}
          />
          <Row title="Deactivate account" note="Hide your profile and pause notifications until you sign in again." onPress={() => setSheet('deactivate')} />
          <Row title="Delete account" note="Close your account and delete your data after 30 days." onPress={() => setSheet('delete')} danger />
        </View>
      </TitledSheet>
      <ConfirmSheet
        visible={sheet === 'deactivate'}
        title="Deactivate account?"
        body="Your profile will be hidden and you’ll be signed out. Sign in again any time to reactivate it."
        confirmLabel="Yes, deactivate"
        loading={busy === 'deactivate'}
        onConfirm={() => void deactivate()}
        onClose={() => setSheet('data')}
      />
      <ConfirmSheet
        visible={sheet === 'delete'}
        title="Delete account?"
        body="Your account will be closed now and deleted for good after 30 days. Booking and payment records are kept as the law requires."
        confirmLabel="Yes, delete"
        loading={busy === 'delete'}
        onConfirm={() => void remove()}
        onClose={() => setSheet('data')}
      />
    </>
  );
}

function Row({ title, note, onPress, loading, danger }: { title: string; note: string; onPress: () => void; loading?: boolean; danger?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={note}
      accessibilityState={{ busy: loading }}
    >
      <View style={styles.cardText}>
        <Text variant="subText16" weight="semibold" color={danger ? 'destructive' : 'black'}>
          {title}
        </Text>
        <Text variant="subText13" color="blackTint3">
          {note}
        </Text>
      </View>
      {loading ? <ActivityIndicator color={colors.secondary} /> : <Icon name="chevron-right" size={18} color="black" />}
    </Pressable>
  );
}

function Sharing({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const me = useMyProfile();
  const queryClient = useQueryClient();
  const [override, setOverride] = useState<Partial<PrivacyPrefs>>({});
  const saved = { ...DEFAULT_PREFS, ...((me.data?.private?.privacy_prefs ?? {}) as Partial<PrivacyPrefs>) };
  const prefs = { ...saved, ...override };

  const toggle = async (key: keyof PrivacyPrefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setOverride((o) => ({ ...o, [key]: value }));
    try {
      await api.profile.updatePrivacy(next);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      setOverride((o) => {
        const { [key]: _done, ...rest } = o;
        return rest;
      });
    } catch (e) {
      setOverride((o) => ({ ...o, [key]: !value }));
      showToast(e instanceof Error ? e.message : 'Couldn’t save the setting');
    }
  };

  return (
    <TitledSheet visible={visible} title="Sharing" onClose={onClose}>
      {me.isPending ? (
        <ActivityIndicator color={colors.secondary} style={styles.sheetState} />
      ) : me.isError ? (
        <View style={styles.sheetState}>
          <Text variant="body14" color="blackTint2" align="center">
            Couldn’t load your settings.
          </Text>
          <Button label="Try again" size="small" variant="dark" onPress={() => void me.refetch()} style={styles.retry} />
        </View>
      ) : (
        <View style={styles.sheetList}>
          {SHARING.map((s) => (
            <View key={s.key} style={styles.row}>
              <View style={styles.cardText}>
                <Text variant="subText16" weight="semibold" color="black">
                  {s.title}
                </Text>
                <Text variant="subText13" color="blackTint3">
                  {s.note}
                </Text>
              </View>
              <Toggle variant="mono" value={prefs[s.key]} onChange={(v) => void toggle(s.key, v)} accessibilityLabel={s.title} />
            </View>
          ))}
        </View>
      )}
    </TitledSheet>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  content: {
    paddingHorizontal: INSET,
    paddingTop: 26,
    gap: 16,
  },
  card: {
    minHeight: 90,
    borderRadius: 15,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 16,
    paddingVertical: 15,
    gap: 12,
  },
  pressed: {
    backgroundColor: colors.track,
  },
  cardText: {
    flex: 1,
    gap: 4,
  },
  sheetList: {
    marginTop: 24,
    gap: 12,
  },
  row: {
    minHeight: 76,
    borderRadius: 15,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  sheetState: {
    marginTop: 40,
    alignItems: 'center',
  },
  retry: {
    marginTop: 12,
  },
});
