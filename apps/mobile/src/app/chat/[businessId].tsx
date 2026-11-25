import { colors, openingStatus, type Message } from '@moment/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { File } from 'expo-file-system';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon, Text } from '@/components/ui';
import { useMyProfile, useSession } from '@/features/auth/use-session';
import { CHAT } from '@/features/bookings/layout';
import { uploadVoiceNote } from '@/features/bookings/mock';
import { Bubble, TypingBubble, type ChatItem } from '@/features/chat/bubble';
import { Composer } from '@/features/chat/composer';
import { dayKey, messageDay } from '@/features/chat/format';
import { useBusiness } from '@/features/business/queries';
import { ComingNext } from '@/features/placeholders/coming-next';
import { api } from '@/lib/api';

/** How long "typing…" stays up after the last typing event. */
const TYPING_TTL_MS = 4000;
/** Send at most one typing event per this interval. */
const TYPING_THROTTLE_MS = 2500;

/**
 * Chat with a business (47:5940, attachments open 52:9442). One conversation
 * per business; live over Supabase Realtime, with typing and read state.
 */
export default function ChatScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>();
  const session = useSession();
  if (session === null) return <ComingNext title="Chat" note="Log in to chat with businesses." />;
  if (!session || !businessId) return <View style={[styles.screen, styles.center]}><ActivityIndicator color={colors.secondary} /></View>;
  return <Chat businessId={businessId} me={session.user.id} />;
}

function Chat({ businessId, me }: { businessId: string; me: string }) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const business = useBusiness(businessId);
  const profile = useMyProfile();
  const biz = business.data;

  const conversation = useQuery({
    queryKey: ['chat', 'conversation', businessId, me],
    queryFn: () => api.chat.startWithBusiness(businessId),
    staleTime: Infinity,
  });
  const conversationId = conversation.data?.id;
  const messagesKey = ['chat', 'messages', conversationId] as const;
  const messages = useQuery({
    queryKey: messagesKey,
    queryFn: () => api.chat.listMessages(conversationId as string, { limit: 100 }),
    enabled: Boolean(conversationId),
  });

  // Local-only items: messages being sent, and voice notes (upload is mocked).
  const [pending, setPending] = useState<ChatItem[]>([]);
  const [typingUntil, setTypingUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const channel = useRef<{ typing: () => void; leave: () => void } | null>(null);
  const lastTyping = useRef(0);

  const markRead = useCallback(() => {
    if (!conversationId) return;
    api.chat
      .markRead(conversationId)
      .then(() => queryClient.invalidateQueries({ queryKey: ['bookings', 'unread'] }))
      .catch(() => undefined);
  }, [conversationId, queryClient]);

  useEffect(() => {
    if (!conversationId) return;
    markRead();
    const joined = api.chat.join(
      conversationId,
      {
        message: ({ type, message }) => {
          queryClient.setQueryData<Message[]>(['chat', 'messages', conversationId], (old = []) =>
            type === 'INSERT'
              ? old.some((m) => m.id === message.id)
                ? old
                : [message, ...old]
              : old.map((m) => (m.id === message.id ? message : m)),
          );
          if (type === 'INSERT' && message.sender_id !== me) {
            setTypingUntil(0);
            markRead();
          }
        },
        typing: () => {
          const until = Date.now() + TYPING_TTL_MS;
          setTypingUntil(until);
          setNow(Date.now());
        },
      },
      me,
    );
    channel.current = joined;
    return () => {
      joined.leave();
      channel.current = null;
    };
  }, [conversationId, me, markRead, queryClient]);

  // Hide "typing…" when it goes stale.
  useEffect(() => {
    if (typingUntil <= now) return;
    const t = setTimeout(() => setNow(Date.now()), typingUntil - now + 50);
    return () => clearTimeout(t);
  }, [typingUntil, now]);

  const typing = () => {
    const t = Date.now();
    if (t - lastTyping.current < TYPING_THROTTLE_MS) return;
    lastTyping.current = t;
    channel.current?.typing();
  };

  const sendMessage = async (draft: ChatItem, attachments: { path: string; mimeType?: string }[] = []) => {
    if (!conversationId) return;
    setPending((p) => [draft, ...p]);
    try {
      const sent = await api.chat.send({ conversationId, body: draft.body ?? undefined, attachments });
      queryClient.setQueryData<Message[]>(['chat', 'messages', conversationId], (old = []) =>
        old.some((m) => m.id === sent.id) ? old : [sent, ...old],
      );
      setPending((p) => p.filter((x) => x.id !== draft.id));
    } catch (e) {
      setPending((p) => p.map((x) => (x.id === draft.id ? { ...x, sending: false, failed: true } : x)));
      Alert.alert('Message not sent', e instanceof Error ? e.message : 'Check your connection and try again.');
    }
  };

  const onSend = (text: string) =>
    void sendMessage({ id: `local-${Date.now()}`, mine: true, body: text, createdAt: new Date().toISOString(), photos: [], sending: true });

  const onPickPhoto = async () => {
    if (!conversationId) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    const id = `local-${Date.now()}`;
    setPending((p) => [{ id, mine: true, body: null, createdAt: new Date().toISOString(), photos: [], sending: true }, ...p]);
    try {
      const mimeType = asset.mimeType ?? 'image/jpeg';
      const body = await new File(asset.uri).arrayBuffer();
      const file = await api.chat.uploadAttachment(conversationId, { body, contentType: mimeType, extension: mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg' });
      setPending((p) => p.filter((x) => x.id !== id));
      await sendMessage({ id: `${id}-msg`, mine: true, body: null, createdAt: new Date().toISOString(), photos: [file.path], sending: true }, [file]);
    } catch (e) {
      setPending((p) => p.filter((x) => x.id !== id));
      Alert.alert('Photo not sent', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  const onVoiceNote = async (note: { uri: string; durationMs: number }) => {
    if (!conversationId) return;
    const saved = await uploadVoiceNote({ conversationId, uri: note.uri, durationMs: note.durationMs });
    setPending((p) => [
      { id: `voice-${Date.now()}`, mine: true, body: null, createdAt: new Date().toISOString(), photos: [], voice: { uri: saved.localUri, durationMs: saved.durationMs } },
      ...p,
    ]);
  };

  const items: ChatItem[] = [
    ...pending,
    ...(messages.data ?? []).map((m) => ({
      id: m.id,
      mine: m.sender_id === me && !m.sender_business_id,
      body: m.body,
      createdAt: m.created_at,
      photos: (m.attachments as { path?: string }[]).map((a) => a.path).filter((p): p is string => Boolean(p)),
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const status = biz ? openingStatus(biz.hours, now, biz.timezone) : null;
  const online = status?.open ?? false;
  const myAvatar = profile.data?.profile.avatar_url ?? null;
  const showTyping = typingUntil > now;
  const logo = api.media.url(biz?.logo_url);

  const call = () => {
    if (!biz?.phone) return Alert.alert('No phone number', `${biz?.name ?? 'This business'} hasn’t added a phone number.`);
    Linking.openURL(`tel:${biz.phone}`).catch(() => Alert.alert('Couldn’t start a call', biz.phone ?? ''));
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.header, { paddingTop: insets.top + 37 }]}>
        <View style={styles.who}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>{logo && <Image source={logo} style={StyleSheet.absoluteFill} contentFit="cover" />}</View>
            {online && <View style={styles.onlineDot} />}
          </View>
          <View style={styles.whoText}>
            <Text variant="subText16" weight="semibold" color="secondary" numberOfLines={1}>
              {biz?.name ?? ' '}
            </Text>
            <Text variant="subText13" color="secondary" numberOfLines={1}>
              {online ? 'Online' : status ? 'Replies when open' : ' '}
            </Text>
          </View>
        </View>
        <Pressable onPress={call} style={styles.headerButton} accessibilityRole="button" accessibilityLabel={`Call ${biz?.name ?? 'business'}`}>
          <Icon name="call" size={28} color="secondary" />
        </Pressable>
        <Pressable onPress={() => router.back()} style={styles.headerButton} accessibilityRole="button" accessibilityLabel="Close">
          <Icon name="close-thin" size={24} color="black" />
        </Pressable>
      </View>
      <View style={styles.divider} />

      {conversation.isError || messages.isError ? (
        <View style={styles.state}>
          <Text variant="h4" color="secondary" align="center">
            Couldn’t open this chat
          </Text>
          <Button label="Try again" size="small" variant="dark" onPress={() => void (conversation.isError ? conversation.refetch() : messages.refetch())} style={styles.stateButton} />
        </View>
      ) : !messages.data && !pending.length ? (
        <View style={[styles.state, styles.center]}>
          <ActivityIndicator color={colors.secondary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.state}>
          <Text variant="h4" color="secondary" align="center">
            Say salam 👋
          </Text>
          <Text variant="body14" weight="medium" color="secondaryTint2" align="center">
            Ask {biz?.name ?? 'the business'} about your booking, timings or anything else. They usually reply within a few hours.
          </Text>
        </View>
      ) : (
        <FlatList
          inverted
          data={items}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={showTyping ? <View style={styles.typing}><TypingBubble avatarUrl={biz?.logo_url ?? null} /></View> : undefined}
          ItemSeparatorComponent={Gap}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => {
            // Inverted list: the day label goes above the first message of each day.
            const older = items[index + 1];
            const day = !older || dayKey(older.createdAt) !== dayKey(item.createdAt) ? messageDay(item.createdAt, now) : undefined;
            return <Bubble item={item} avatarUrl={item.mine ? myAvatar : (biz?.logo_url ?? null)} showAvatar day={day} />;
          }}
        />
      )}

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
        <Composer
          onSend={onSend}
          onPickPhoto={() => void onPickPhoto()}
          onVoiceNote={(n) => void onVoiceNote(n)}
          onTyping={typing}
          disabled={!conversationId}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function Gap() {
  return <View style={{ height: 34 }} />;
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
  header: {
    paddingHorizontal: CHAT.inset,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  who: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrap: {
    width: CHAT.avatar,
    height: CHAT.avatar,
  },
  avatar: {
    width: CHAT.avatar,
    height: CHAT.avatar,
    borderRadius: CHAT.avatarRadius,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: colors.textDisabled,
    overflow: 'hidden',
  },
  onlineDot: {
    position: 'absolute',
    right: -1,
    bottom: 1,
    width: CHAT.dot,
    height: CHAT.dot,
    borderRadius: CHAT.dot / 2,
    backgroundColor: colors.online,
  },
  whoText: {
    flex: 1,
    gap: 6,
  },
  headerButton: {
    width: CHAT.headerButton,
    height: CHAT.headerButton,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    marginTop: 9,
    marginHorizontal: CHAT.inset,
    height: 1,
    backgroundColor: colors.divider,
  },
  list: {
    paddingTop: 16,
    paddingBottom: 49,
  },
  typing: {
    paddingTop: 34,
  },
  state: {
    flex: 1,
    paddingHorizontal: 40,
    paddingTop: 120,
    gap: 8,
  },
  stateButton: {
    marginTop: 12,
    alignSelf: 'center',
  },
  composer: {
    paddingHorizontal: CHAT.inset + 1,
    paddingTop: 8,
  },
});
