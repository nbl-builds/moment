import { colors } from '@moment/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet } from '@/components/bottom-sheet';
import { showToast } from '@/components/toast';
import { BackButton, Icon, Text, Toggle } from '@/components/ui';
import { useSession } from '@/features/auth/use-session';
import { ConfirmSheet } from '@/features/groups/components/confirm-sheet';
import { useGroup, useRefreshGroups } from '@/features/groups/queries';
import { ComingNext } from '@/features/placeholders/coming-next';
import { api } from '@/lib/api';
import type { GroupSettings } from '@moment/shared';

const INSET = 20;
const LIKES = {
  everyone: { label: 'Everyone', note: 'Everyone in the group can see what you’ve liked' },
  only_me: { label: 'Only Me', note: 'Only you can see what you’ve liked' },
} as const;

/** Group Settings (48:5138), Who can see likes? (48:5184), Delete (48:5243). Owner only. */
export default function GroupSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const session = useSession();
  const group = useGroup(id);
  const refresh = useRefreshGroups();
  const [sheet, setSheet] = useState<'likes' | 'delete' | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pending, setPending] = useState<GroupSettings>({});

  if (group.isPending) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.secondary} />
      </View>
    );
  }
  const g = group.data;
  if (!g || g.owner_id !== session?.user.id) return <ComingNext title="Group Settings" note="Only the group’s owner can change its settings." />;

  // Show changes straight away; the server confirms.
  const sharing = pending.sharingEnabled ?? g.sharing_enabled;
  const isPrivate = (pending.visibility ?? g.visibility) === 'private';
  const likes = pending.likesVisibility ?? g.likes_visibility;

  const save = async (patch: GroupSettings) => {
    setPending((p) => ({ ...p, ...patch }));
    try {
      await api.groups.updateSettings(g.id, patch);
      await refresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Couldn’t save the setting');
    } finally {
      setPending({});
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await api.groups.remove(g.id);
      await refresh();
      setSheet(null);
      router.dismissTo('/groups');
      showToast(`${g.name} was deleted`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Couldn’t delete the group');
      setDeleting(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 16 }]}>
      <View style={styles.inset}>
        <BackButton />
        <Text variant="h3" color="secondary" style={styles.title} accessibilityRole="header">
          Group Settings
        </Text>
        <View style={styles.divider} />

        <View style={styles.rows}>
          <View style={styles.row}>
            <Text variant="subText16" weight="medium" color="secondary" style={styles.label}>
              Enable Sharing
            </Text>
            <Toggle variant="mono" value={sharing} onChange={(v) => void save({ sharingEnabled: v })} accessibilityLabel="Enable Sharing" />
          </View>
          <View style={styles.row}>
            <Text variant="subText16" weight="medium" color="secondary" style={styles.label}>
              Make Private
            </Text>
            <Toggle
              variant="mono"
              value={isPrivate}
              onChange={(v) => {
                if (v && g.is_open_to_match) showToast('Private groups leave Group Match');
                void save({ visibility: v ? 'private' : 'public' });
              }}
              accessibilityLabel="Make Private"
            />
          </View>
          <Pressable onPress={() => setSheet('likes')} style={styles.row} accessibilityRole="button" accessibilityLabel={`Who can see likes? ${LIKES[likes].label}`}>
            <Text variant="subText16" weight="medium" color="secondary" style={styles.label}>
              Who can see likes?
            </Text>
            <Text variant="subText16" weight="medium" color="secondaryTint2">
              {LIKES[likes].label}
            </Text>
            <Icon name="chevron-small" size={16} color="secondary" style={styles.chevron} />
          </Pressable>
          <Pressable onPress={() => setSheet('delete')} style={[styles.row, styles.delete]} accessibilityRole="button" accessibilityLabel="Delete Group">
            <Icon name="trash-red" size={28} />
            <Text variant="subText16" weight="medium" color="destructive">
              Delete Group
            </Text>
          </Pressable>
        </View>
      </View>

      <BottomSheet visible={sheet === 'likes'} onRequestClose={() => setSheet(null)} backgroundColor={colors.backgroundMuted} accessibilityLabel="Who can see likes?">
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.grabber} />
          {(['everyone', 'only_me'] as const).map((key) => {
            const selected = key === likes;
            return (
              <Pressable
                key={key}
                onPress={() => {
                  setSheet(null);
                  if (!selected) void save({ likesVisibility: key });
                }}
                style={[styles.option, selected && styles.optionSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <Text variant="subText16" weight="bold" color="black">
                  {LIKES[key].label}
                </Text>
                <Text variant="subText12" color="blackTint2">
                  {LIKES[key].note}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>

      <ConfirmSheet
        visible={sheet === 'delete'}
        title="Are you sure you want to delete this group?"
        body="You won’t be able to get this group back once you delete it."
        loading={deleting}
        onConfirm={() => void remove()}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
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
  rows: {
    marginTop: 20,
    gap: 20,
  },
  row: {
    height: 60,
    borderRadius: 15,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 10,
  },
  label: {
    flex: 1,
  },
  chevron: {
    transform: [{ rotate: '-90deg' }],
  },
  delete: {
    justifyContent: 'center',
    backgroundColor: colors.invalidSurface,
  },
  sheet: {
    paddingTop: 8,
    paddingHorizontal: INSET,
    gap: 19,
  },
  grabber: {
    alignSelf: 'center',
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.chipBorder,
    marginBottom: 10,
  },
  option: {
    minHeight: 60,
    borderRadius: 15,
    paddingHorizontal: 23,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  optionSelected: {
    backgroundColor: colors.surface,
  },
});
