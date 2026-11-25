import { colors, type Tables } from '@moment/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Linking, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showToast } from '@/components/toast';
import { Button, Icon, Text } from '@/components/ui';
import { useLoginSheet } from '@/features/auth/login-sheet-provider';
import { useMyProfile, useSession } from '@/features/auth/use-session';
import { Bubble, type ChatItem } from '@/features/chat/bubble';
import { dayKey, messageDay } from '@/features/chat/format';
import { PageHeader, TextLink } from '@/features/profile/components/page-header';
import { useAppSettings } from '@/features/profile/queries';
import { openSupportTicket } from '@/features/support/api';
import { SupportComposer } from '@/features/support/components/support-composer';
import { supportKeys, useOpenTicket, useTicketMessages } from '@/features/support/queries';
import { api } from '@/lib/api';

type SupportMessage = Tables<'support_messages'>;
type Item = ChatItem & { staff: boolean };

/** Fallbacks if `app.support` is missing from platform settings. */
const DEFAULT_HOURS = 'Every day, 9am to 11pm';

/**
 * Contact Moment Support: a chat on the user's latest open support ticket.
 * Not in Figma; styled like Chat (47:5940). With no open ticket, the first
 * message opens one. Staff replies arrive by polling.
 */
export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const session = useSession();
  const settings = useAppSettings();
  const support = settings.data?.support;
  const { openLoginSheet } = useLoginSheet();

  const emailUs = () => {
    const email = support?.email;
    if (!email) return showToast('Email support isn’t available yet');
    Linking.openURL(`mailto:${email}?subject=${encodeURIComponent('Moment support')}`).catch(() => showToast(`Email us at ${email}`));
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <PageHeader title="Moment Support" right={<TextLink label="Email us" onPress={emailUs} />} />
      <View style={styles.hours} accessible accessibilityLabel={`Support hours: ${support?.hours ?? DEFAULT_HOURS}`}>
        <Icon name="clock-outline" size={18} color="blackTint3" />
        <Text variant="subText13" color="blackTint3" style={styles.hoursText} numberOfLines={2}>
          We reply {(support?.hours ?? DEFAULT_HOURS).replace(/^Every day/, 'every day')}
          {support?.email ? ` · ${support.email}` : ''}
        </Text>
      </View>

      {session === undefined ? (
        <Center>
          <ActivityIndicator color={colors.secondary} />
        </Center>
      ) : session === null ? (
        <View style={styles.state}>
          <Text variant="h4" color="black" align="center">
            Log in to chat with us
          </Text>
          <Text variant="body14" color="blackTint2" align="center">
            Or email us and we’ll get back to you.
          </Text>
          <Button label="Log in" size="small" variant="dark" onPress={() => openLoginSheet()} style={styles.stateButton} />
        </View>
      ) : (
        <Thread me={session.user.id} bottomInset={insets.bottom} />
      )}
    </KeyboardAvoidingView>
  );
}

function Thread({ me, bottomInset }: { me: string; bottomInset: number }) {
  const queryClient = useQueryClient();
  const profile = useMyProfile();
  const ticket = useOpenTicket();
  const ticketId = ticket.data?.id;
  const messages = useTicketMessages(ticketId);
  const [pending, setPending] = useState<Item[]>([]);
  const [sending, setSending] = useState(false);

  const send = async (text: string) => {
    const draft: Item = { id: `local-${Date.now()}`, mine: true, staff: false, body: text, createdAt: new Date().toISOString(), photos: [], sending: true };
    setPending((p) => [draft, ...p]);
    setSending(true);
    try {
      if (ticketId) {
        const sent = await api.support.reply(ticketId, text);
        queryClient.setQueryData<SupportMessage[]>(supportKeys.messages(ticketId), (old = []) =>
          old.some((m) => m.id === sent.id) ? old : [...old, sent],
        );
      } else {
        const created = await openSupportTicket(text);
        await queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
        await queryClient.invalidateQueries({ queryKey: supportKeys.messages(created.id) });
      }
      setPending((p) => p.filter((x) => x.id !== draft.id));
    } catch (e) {
      setPending((p) => p.map((x) => (x.id === draft.id ? { ...x, sending: false, failed: true } : x)));
      showToast(e instanceof Error ? e.message : 'Message not sent');
    } finally {
      setSending(false);
    }
  };

  const items: Item[] = [
    ...pending,
    ...(messages.data ?? []).map((m) => ({
      id: m.id,
      mine: !m.is_staff_reply && m.sender_id === me,
      staff: m.is_staff_reply,
      body: m.body,
      createdAt: m.created_at,
      photos: [],
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const myAvatar = profile.data?.profile.avatar_url ?? null;
  const loading = ticket.isPending || (Boolean(ticketId) && messages.isPending);
  const failed = ticket.isError || messages.isError;

  return (
    <>
      {failed ? (
        <View style={styles.state}>
          <Text variant="h4" color="black" align="center">
            Couldn’t load your messages
          </Text>
          <Button
            label="Try again"
            size="small"
            variant="dark"
            onPress={() => void (ticket.isError ? ticket.refetch() : messages.refetch())}
            style={styles.stateButton}
          />
        </View>
      ) : loading && !pending.length ? (
        <Center>
          <ActivityIndicator color={colors.secondary} />
        </Center>
      ) : items.length === 0 ? (
        <View style={styles.state}>
          <Text variant="h4" color="black" align="center">
            How can we help?
          </Text>
          <Text variant="body14" color="blackTint2" align="center">
            Tell us about a booking, a payment or anything else. Add your booking date and the business name so we can help faster.
          </Text>
        </View>
      ) : (
        <FlatList
          inverted
          data={items}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={Gap}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => {
            const older = items[index + 1];
            const day = !older || dayKey(older.createdAt) !== dayKey(item.createdAt) ? messageDay(item.createdAt) : undefined;
            // Name the team above the first reply in a run of replies.
            const named = !item.mine && (!older || older.mine || Boolean(day));
            return (
              <View>
                {day && (
                  <Text variant="body12" weight="medium" color="secondaryTint3" align="center" style={styles.day} accessibilityRole="header">
                    {day}
                  </Text>
                )}
                {named && (
                  <Text variant="body12" weight="semibold" color="blackTint3" style={styles.sender}>
                    {item.staff ? 'Moment Support' : 'Support team'}
                  </Text>
                )}
                <Bubble item={item} avatarUrl={item.mine ? myAvatar : null} showAvatar={item.mine} />
              </View>
            );
          }}
        />
      )}

      <View style={[styles.composer, { paddingBottom: Math.max(bottomInset, 12) + 4 }]}>
        <SupportComposer onSend={(t) => void send(t)} disabled={ticket.isPending || ticket.isError || (sending && !ticketId)} />
      </View>
    </>
  );
}

function Center({ children }: { children: ReactNode }) {
  return <View style={[styles.state, styles.center]}>{children}</View>;
}

function Gap() {
  return <View style={styles.gap} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  hours: {
    marginTop: 12,
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hoursText: {
    flex: 1,
  },
  state: {
    flex: 1,
    paddingHorizontal: 40,
    paddingTop: 100,
    gap: 8,
  },
  center: {
    alignItems: 'center',
    paddingTop: 0,
    justifyContent: 'center',
  },
  stateButton: {
    marginTop: 12,
    alignSelf: 'center',
  },
  list: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  gap: {
    height: 20,
  },
  day: {
    marginBottom: 16,
  },
  sender: {
    // Lines up with the bubble: row inset 20 + avatar column 45 + gap 13.
    marginLeft: 78,
    marginBottom: 6,
  },
  composer: {
    paddingHorizontal: 21,
    paddingTop: 8,
  },
});
