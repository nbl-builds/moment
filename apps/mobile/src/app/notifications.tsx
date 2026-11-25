import { colors, formatShortDateTime } from '@moment/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon, Text, type IconName } from '@/components/ui';
import { useSession } from '@/features/auth/use-session';
import { PageHeader } from '@/features/profile/components/page-header';
import { profileKeys, useNotifications } from '@/features/profile/queries';
import { api } from '@/lib/api';

type Row = NonNullable<ReturnType<typeof useNotifications>['data']>[number];
interface Target {
  screen?: string;
  booking_id?: string | null;
  group_id?: string;
  business_id?: string;
}

/** Where a notification leads. Unknown screens just mark it read. */
function hrefFor(data: Target): Href | null {
  if (data.booking_id) return { pathname: '/reservation/[id]', params: { id: data.booking_id } };
  switch (data.screen) {
    case 'wallet':
      return '/wallet';
    case 'offers':
      return '/offers';
    case 'group':
      return data.group_id ? { pathname: '/group/[id]', params: { id: data.group_id } } : '/groups';
    case 'chat':
      return data.business_id ? { pathname: '/chat/[businessId]', params: { businessId: data.business_id } } : '/bookings';
    default:
      return null;
  }
}

/** Payments and money get the card tile; bookings show the business logo. */
const TILE_ICON: Record<string, IconName> = {
  payment_received: 'creditcard',
  refund: 'creditcard',
  offer: 'percent',
  group_invite: 'users',
  new_message: 'message-square',
  review_reply: 'star-outline',
};

/** Notifications (48:4018): unread cards are grey; opening the screen marks them read. */
export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const userId = useSession()?.user.id;
  const client = useQueryClient();
  const list = useNotifications();
  // Unread styling as it was when the screen opened, so marking read doesn't flash.
  const [unreadAtOpen, setUnreadAtOpen] = useState<Set<string> | null>(null);
  const marked = useRef(false);

  const bookingIds = (list.data ?? []).map((n) => (n.data as Target).booking_id).filter((id): id is string => Boolean(id));
  const businesses = useQuery({
    queryKey: ['notification-businesses', userId, bookingIds.join(',')],
    queryFn: () => api.account.notifications.bookingBusinesses([...new Set(bookingIds)]),
    enabled: bookingIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (!list.data || marked.current) return;
    marked.current = true;
    const unread = list.data.filter((n) => !n.read_at).map((n) => n.id);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- snapshot once, when the feed first loads
    setUnreadAtOpen(new Set(unread));
    if (unread.length === 0) return;
    api.account.notifications
      .markAllRead()
      .then(() => client.invalidateQueries({ queryKey: profileKeys.unread(userId) }))
      .catch(() => undefined);
  }, [list.data, client, userId]);

  const open = (n: Row) => {
    const href = hrefFor(n.data as Target);
    if (href) router.push(href);
  };

  let body;
  if (list.isPending) {
    body = <ActivityIndicator color={colors.secondary} style={styles.center} />;
  } else if (list.isError) {
    body = (
      <View style={styles.state}>
        <Text variant="subText16" weight="bold" color="black" align="center">
          Couldn’t load notifications
        </Text>
        <Button label="Try again" size="small" variant="dark" onPress={() => void list.refetch()} style={styles.stateButton} />
      </View>
    );
  } else if (list.data.length === 0) {
    body = (
      <View style={styles.state}>
        <Icon name="bell" size={40} color="secondaryTint3" />
        <Text variant="subText16" weight="bold" color="black" align="center" style={styles.stateTitle}>
          No notifications yet
        </Text>
        <Text variant="subText14" color="blackTint3" align="center">
          Booking updates, payments and offers will show up here.
        </Text>
      </View>
    );
  } else {
    body = (
      <FlatList
        data={list.data}
        keyExtractor={(n) => n.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={() => void list.refetch()} />}
        renderItem={({ item }) => {
          const data = item.data as Target;
          const business = data.booking_id ? businesses.data?.[data.booking_id] : undefined;
          const logo = api.media.url(business?.logo_url ?? null);
          const unread = unreadAtOpen ? unreadAtOpen.has(item.id) : !item.read_at;
          const linked = hrefFor(data) !== null;
          return (
            <Pressable
              onPress={() => open(item)}
              disabled={!linked}
              style={({ pressed }) => [styles.card, unread && styles.unread, pressed && styles.pressed]}
              accessibilityRole={linked ? 'button' : undefined}
              accessibilityLabel={`${unread ? 'Unread. ' : ''}${item.title}. ${item.body ?? ''} ${formatShortDateTime(item.created_at)}`}
            >
              <View style={styles.tile}>
                {logo ? (
                  <Image source={logo} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : (
                  <Icon name={TILE_ICON[item.type] ?? 'tab-bookings'} size={item.type in TILE_ICON ? 32 : 28} color="secondary" />
                )}
              </View>
              <View style={styles.text}>
                <Text variant="subText16" weight="medium" color="secondary" numberOfLines={3}>
                  <Text variant="subText16" weight="bold" color="secondary">
                    {item.title}
                  </Text>
                  {item.body ? ` ${item.body}` : ''}
                </Text>
                <Text variant="subText10" color="secondary" style={styles.time}>
                  {formatShortDateTime(item.created_at)}
                </Text>
              </View>
              {linked && <Icon name="chevron-right" size={18} color="secondary" />}
            </Pressable>
          );
        }}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <PageHeader title="Notifications" />
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  center: {
    marginTop: 60,
  },
  list: {
    paddingTop: 20,
    paddingHorizontal: 20,
    gap: 16,
  },
  card: {
    minHeight: 93,
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  unread: {
    backgroundColor: colors.chipSelected,
  },
  pressed: {
    opacity: 0.85,
  },
  tile: {
    alignSelf: 'flex-start',
    width: 50,
    height: 50,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  time: {
    marginTop: 4,
  },
  state: {
    marginTop: 80,
    marginHorizontal: 40,
    alignItems: 'center',
    gap: 6,
  },
  stateTitle: {
    marginTop: 8,
  },
  stateButton: {
    marginTop: 12,
    alignSelf: 'center',
  },
});
