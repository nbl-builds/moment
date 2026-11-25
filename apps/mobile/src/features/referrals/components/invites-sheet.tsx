import { colors, formatPrice, formatShortDateTime } from '@moment/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Text } from '@/components/ui';
import { BookingSheet } from '@/features/booking/components/booking-sheet';
import { Skeleton } from '@/features/home/components/skeleton';
import { listMyInvites, type ReferralInvite } from '../mock';

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
] as const;

export function useMyInvites(enabled = true) {
  return useQuery({ queryKey: ['referrals', 'invites'], queryFn: listMyInvites, enabled });
}

/** My Recent Invites (48:5969): Pending / Accepted tabs, 60pt rows with reward and status. */
export function InvitesSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<ReferralInvite['status']>('pending');
  const invites = useMyInvites(visible);
  const rows = (invites.data ?? []).filter((i) => i.status === tab);

  return (
    <BookingSheet visible={visible} onClose={onClose} title="My Recent Invites" titleAlign="left" top={181} scrollContent>
      <View style={styles.tabs} accessibilityRole="tablist">
        {TABS.map((t) => {
          const selected = t.key === tab;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[styles.tab, selected && styles.tabSelected]}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
            >
              <Text variant="subText14" weight="medium" color={selected ? 'black' : 'blackTint1'}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.list}>
        {invites.isPending ? (
          [0, 1].map((i) => <Skeleton key={i} width="100%" height={60} radius={15} />)
        ) : invites.isError ? (
          <View style={styles.state}>
            <Text variant="body16" weight="bold" color="black" align="center">
              Couldn’t load your invites
            </Text>
            <Button label="Try again" size="small" variant="dark" onPress={() => void invites.refetch()} />
          </View>
        ) : rows.length === 0 ? (
          <View style={styles.state}>
            <Text variant="subText14" weight="medium" color="blackTint1" align="center">
              {tab === 'pending' ? 'No pending invites. Share your link to invite friends.' : 'No accepted invites yet.'}
            </Text>
          </View>
        ) : (
          rows.map((i) => <InviteRow key={i.id} invite={i} />)
        )}
      </View>
    </BookingSheet>
  );
}

function InviteRow({ invite }: { invite: ReferralInvite }) {
  const date = formatShortDateTime(invite.invited_at);
  const amount = formatPrice(invite.reward);
  const accepted = invite.status === 'accepted';
  return (
    <View style={styles.row} accessible accessibilityLabel={`${invite.name}, ${amount}, ${accepted ? 'Accepted' : 'Pending'}, ${date}`}>
      <View style={styles.rowLeft}>
        <Text variant="body15" weight="medium" color="black" numberOfLines={1} style={styles.line}>
          {invite.name}
        </Text>
        <Text variant="subText10" color="blackTint1">
          {date}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text variant="body14" weight="bold" color="black" style={styles.line}>
          {amount}
        </Text>
        <Text variant="subText10" color={accepted ? 'accepted' : 'invalid'}>
          {accepted ? 'Accepted' : 'Pending'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
    paddingHorizontal: 20,
  },
  tab: {
    minWidth: 97,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabSelected: {
    backgroundColor: colors.primary,
  },
  list: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  // Figma: 60pt row, text 19 from the left, amount 20 from the right.
  row: {
    height: 60,
    borderRadius: 15,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 19,
    paddingRight: 20,
  },
  rowLeft: {
    flex: 1,
    marginRight: 12,
    gap: 4,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  line: {
    lineHeight: 20,
  },
  state: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 24,
  },
});
