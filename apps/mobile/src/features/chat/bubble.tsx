import { colors } from '@moment/shared';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui';
import { CHAT } from '@/features/bookings/layout';
import { api } from '@/lib/api';
import { messageTime } from './format';
import { VoiceNote } from './voice-note';

const A = CHAT.bubbleAvatar;

export interface ChatItem {
  id: string;
  mine: boolean;
  body: string | null;
  createdAt: string;
  /** Photos in `chat-attachments`. */
  photos: string[];
  /** A voice note kept on this device (upload is mocked). */
  voice?: { uri: string; durationMs: number };
  /** Optimistic message not confirmed by the server yet. */
  sending?: boolean;
  failed?: boolean;
}

/**
 * One message (47:5940): theirs on the left in white with the business logo,
 * mine on the right in near-black with my photo; the time sits by the avatar.
 */
export function Bubble({ item, avatarUrl, showAvatar, day }: { item: ChatItem; avatarUrl: string | null; showAvatar: boolean; day?: string }) {
  const avatar = api.media.url(avatarUrl);
  const side = (
    <View style={styles.side}>
      {showAvatar ? (
        <>
          {!item.mine && <Avatar uri={avatar} />}
          <Text variant="body10" color="secondary" numberOfLines={1} style={item.mine ? styles.timeMine : styles.timeTheirs}>
            {item.sending ? 'Sending' : item.failed ? 'Not sent' : messageTime(item.createdAt)}
          </Text>
          {item.mine && <Avatar uri={avatar} />}
        </>
      ) : null}
    </View>
  );
  const row = (
    <View style={[styles.row, item.mine && styles.rowMine]} accessible accessibilityLabel={`${item.mine ? 'You' : 'They'} said ${item.body ?? (item.voice ? 'a voice note' : 'a photo')}, ${messageTime(item.createdAt)}`}>
      {!item.mine && side}
      <View style={[styles.content, item.mine && styles.contentMine]}>
        {item.photos.map((path) => (
          <Photo key={path} path={path} />
        ))}
        {item.voice && <VoiceNote uri={item.voice.uri} durationMs={item.voice.durationMs} mine={item.mine} />}
        {item.body ? (
          <View style={[styles.bubble, item.mine ? styles.mine : styles.theirs, item.failed && styles.failed]}>
            <Text variant="body14" weight={item.mine ? 'regular' : 'medium'} color={item.mine ? 'white' : 'secondary'} style={item.mine ? undefined : styles.theirsText}>
              {item.body}
            </Text>
          </View>
        ) : null}
      </View>
      {item.mine && side}
    </View>
  );
  if (!day) return row;
  return (
    <View>
      <Text variant="body12" weight="medium" color="secondaryTint3" align="center" style={styles.day} accessibilityRole="header">
        {day}
      </Text>
      {row}
    </View>
  );
}

function Avatar({ uri }: { uri: string | null | undefined }) {
  return <View style={styles.avatar}>{uri && <Image source={uri} style={StyleSheet.absoluteFill} contentFit="cover" />}</View>;
}

/** A photo from the private bucket (short-lived signed URL). */
function Photo({ path }: { path: string }) {
  const url = useQuery({ queryKey: ['chat', 'attachment', path], queryFn: () => api.chat.attachmentUrl(path), staleTime: 50 * 60_000 });
  return (
    <View style={styles.photo}>
      {url.data && <Image source={url.data} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} accessibilityLabel="Photo" />}
    </View>
  );
}

/** "…" while the business is typing (47:5940: 62 x 32 white pill, grey dots). */
export function TypingBubble({ avatarUrl }: { avatarUrl: string | null }) {
  return (
    <View style={styles.row} accessible accessibilityLabel="Typing">
      <View style={styles.side}>
        <Avatar uri={api.media.url(avatarUrl)} />
      </View>
      <View style={styles.typing}>
        <View style={styles.dot} />
        <View style={[styles.dot, styles.dotBig]} />
        <View style={styles.dot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: CHAT.inset,
    gap: 13,
  },
  rowMine: {
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    gap: 23,
  },
  side: {
    width: A + 10,
    alignItems: 'center',
  },
  avatar: {
    width: A,
    height: A,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: colors.textDisabled,
    overflow: 'hidden',
  },
  day: {
    marginBottom: 20,
  },
  timeTheirs: {
    marginTop: 6,
  },
  timeMine: {
    marginBottom: 6,
  },
  content: {
    maxWidth: CHAT.bubbleMax,
    flexShrink: 1,
    gap: 6,
  },
  contentMine: {
    alignItems: 'flex-end',
  },
  bubble: {
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  theirs: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    borderBottomLeftRadius: 12,
  },
  theirsText: {
    lineHeight: 23.7,
  },
  mine: {
    backgroundColor: colors.secondary,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 4,
    paddingHorizontal: 22,
  },
  failed: {
    opacity: 0.5,
  },
  photo: {
    width: 200,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.secondaryTint6,
  },
  typing: {
    width: 62,
    height: 32,
    borderRadius: 16,
    borderTopLeftRadius: 3,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.divider,
  },
  dotBig: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
});
