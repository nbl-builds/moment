import { colors } from '@moment/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import { showToast } from '@/components/toast';
import { Button, Icon, Text, textStyle } from '@/components/ui';
import { BookingSheet } from '@/features/booking/components/booking-sheet';
import { api } from '@/lib/api';
import { PersonRow } from './person-row';

/** Invite others (share sheet 48:4668 > "Invite others"; no frame): find Moment users by name or phone. */
export function InviteSheet({
  visible,
  groupId,
  memberIds,
  onInvited,
  onClose,
}: {
  visible: boolean;
  groupId: string;
  /** Already in the group (active or invited). */
  memberIds: string[];
  onInvited: () => void;
  onClose: () => void;
}) {
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [sent, setSent] = useState<string[]>([]);
  const [sending, setSending] = useState<string | null>(null);

  // Search a moment after typing stops.
  useEffect(() => {
    const t = setTimeout(() => setQuery(text.trim()), 300);
    return () => clearTimeout(t);
  }, [text]);

  const people = useQuery({ queryKey: ['people', query], queryFn: () => api.groups.findPeople(query), enabled: visible && query.length >= 2 });

  const invite = async (id: string, name: string) => {
    setSending(id);
    try {
      await api.groups.invite(groupId, [id]);
      setSent((s) => [...s, id]);
      onInvited();
      showToast(`Invited ${name}`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Couldn’t send the invite');
    } finally {
      setSending(null);
    }
  };

  return (
    <BookingSheet visible={visible} onClose={onClose} title="Invite others" top={200} scrollContent>
      <View style={styles.field}>
        <Icon name="search" size={20} color="secondaryTint3" />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Name or phone number"
          placeholderTextColor={colors.secondaryTint3}
          autoCorrect={false}
          style={styles.input}
          accessibilityLabel="Search people by name or phone number"
        />
      </View>
      <View style={styles.list}>
        {query.length < 2 ? (
          <Text variant="body14" weight="medium" color="secondaryTint2" align="center" style={styles.hint}>
            Search by name, or type their full phone number (03xx xxxxxxx).
          </Text>
        ) : people.isPending ? (
          <ActivityIndicator style={styles.hint} color={colors.secondary} />
        ) : (people.data ?? []).length === 0 ? (
          <Text variant="body14" weight="medium" color="secondaryTint2" align="center" style={styles.hint}>
            No one on Moment matches “{query}”.
          </Text>
        ) : (
          (people.data ?? []).map((p) => {
            const already = memberIds.includes(p.id) || sent.includes(p.id);
            return (
              <PersonRow
                key={p.id}
                name={p.display_name}
                avatarUrl={p.avatar_url}
                right={
                  already ? (
                    <Text variant="body14" weight="bold" color="secondaryTint3">
                      {sent.includes(p.id) ? 'Invited' : 'In group'}
                    </Text>
                  ) : (
                    <Button
                      label="Invite"
                      size="small"
                      variant="dark"
                      loading={sending === p.id}
                      onPress={() => void invite(p.id, p.display_name)}
                      accessibilityLabel={`Invite ${p.display_name}`}
                    />
                  )
                }
              />
            );
          })
        )}
      </View>
    </BookingSheet>
  );
}

const styles = StyleSheet.create({
  field: {
    marginTop: 20,
    marginHorizontal: 20,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.secondaryTint5,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  input: {
    ...textStyle('subText16'),
    flex: 1,
    color: colors.secondary,
    paddingVertical: 0,
  },
  list: {
    marginTop: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  hint: {
    marginTop: 24,
  },
});
