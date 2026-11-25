import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui';
import { BookingSheet } from '@/features/booking/components/booking-sheet';
import type { GroupDetail } from '../queries';
import { PersonRow } from './person-row';

const ROLE = { owner: 'Owner', admin: 'Admin', member: 'Member' } as const;

/** Members (tap the faces on a group; no Figma frame): roles, remove for admins, Invite. */
export function MembersSheet({
  visible,
  group,
  me,
  canManage,
  onRemove,
  onInvite,
  onClose,
}: {
  visible: boolean;
  group: GroupDetail;
  me: string;
  canManage: boolean;
  onRemove: (userId: string, name: string) => void;
  onInvite: () => void;
  onClose: () => void;
}) {
  const order = { owner: 0, admin: 1, member: 2 } as const;
  const members = group.members
    .filter((m) => (m.status === 'active' || m.status === 'invited') && m.profile)
    .sort((a, b) => (a.status === b.status ? order[a.role] - order[b.role] : a.status === 'active' ? -1 : 1));
  const active = members.filter((m) => m.status === 'active').length;
  return (
    <BookingSheet
      visible={visible}
      onClose={onClose}
      title={`Members (${active})`}
      top={260}
      scrollContent
      action={{ label: 'Invite', onPress: onInvite, variant: 'dark' }}
    >
      <View style={styles.list}>
        {members.map((m) => {
          const name = m.profile!.display_name;
          const removable = canManage && m.role !== 'owner' && m.user_id !== me;
          return (
            <PersonRow
              key={m.user_id}
              name={m.user_id === me ? `${name} (you)` : name}
              avatarUrl={m.profile!.avatar_url}
              note={m.status === 'invited' ? 'Invited' : ROLE[m.role]}
              right={
                removable ? (
                  <Pressable
                    onPress={() =>
                      Alert.alert(`Remove ${name}?`, `${name} will leave ${group.name}.`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Remove', style: 'destructive', onPress: () => onRemove(m.user_id, name) },
                      ])
                    }
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${name}`}
                  >
                    <Text variant="body14" weight="bold" color="destructive" style={styles.remove}>
                      Remove
                    </Text>
                  </Pressable>
                ) : undefined
              }
            />
          );
        })}
      </View>
    </BookingSheet>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  remove: {
    textDecorationLine: 'underline',
  },
});
