import { colors } from '@moment/shared';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCollapsibleTabBarScroll, useTabBarContentInset } from '@/components/tab-bar';
import { Button, Icon, Text } from '@/components/ui';
import { useLoginSheet } from '@/features/auth/login-sheet-provider';
import { useSession } from '@/features/auth/use-session';
import { BusinessCard } from '@/features/booking/components/business-card';
import { CountBadge } from '@/features/bookings/components/count-badge';
import { usePickReservation } from '@/features/bookings/pick-reservation';
import { BOOKINGS } from '@/features/bookings/layout';
import { useActiveBookings, useUnread, type BookingRow } from '@/features/bookings/queries';
import { useServiceCarts } from '@/features/business/cart';
import { useBusinessLocation } from '@/features/business/queries';
import { Skeleton } from '@/features/home/components/skeleton';

const B = BOOKINGS;

/**
 * Bookings tab (52:8373 empty, 52:8565 with items): one row per business with
 * active bookings, its unread chat count, the cart and All Bookings in the header.
 */
export default function BookingsTab() {
  const insets = useSafeAreaInsets();
  const bottomInset = useTabBarContentInset();
  const onScroll = useCollapsibleTabBarScroll();
  const session = useSession();
  const { openLoginSheet } = useLoginSheet();
  const active = useActiveBookings();
  const unread = useUnread();
  const carts = useServiceCarts();
  const open = usePickReservation();

  // One row per business, soonest reservation first.
  const groups = new Map<string, BookingRow[]>();
  for (const b of active.data ?? []) groups.set(b.business.id, [...(groups.get(b.business.id) ?? []), b]);
  const rows = [...groups.values()];

  const refresh = () => {
    void active.refetch();
    void unread.refetch();
  };

  let body;
  if (session === null) {
    body = (
      <Empty
        title="Log in to see your bookings"
        note="Your reservations and messages from hosts show up here."
        action={{ label: 'Log in', onPress: () => openLoginSheet() }}
      />
    );
  } else if (session === undefined || active.isPending) {
    body = (
      <View style={styles.cards}>
        {[0, 1].map((i) => (
          <View key={i} style={styles.inset}>
            <Skeleton width="100%" height={B.card.height} radius={B.card.radius} />
          </View>
        ))}
      </View>
    );
  } else if (active.isError) {
    body = (
      <Empty title="Couldn’t load your bookings" note="Check your connection and try again." action={{ label: 'Try again', onPress: refresh }} />
    );
  } else if (rows.length === 0) {
    body = (
      <Empty
        title="No bookings yet"
        note="When you book an experience or a service, you’ll see it here."
        action={{ label: 'Explore', onPress: () => router.navigate('/explore') }}
      />
    );
  } else {
    body = (
      <View style={styles.cards}>
        {rows.map((bookings) => {
          const first = bookings[0];
          if (!first) return null;
          return <BusinessRow key={first.business.id} bookings={bookings} unread={unread.byBusiness.get(first.business.id) ?? 0} onPress={() => open(bookings)} />;
        })}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + B.titleTop, paddingBottom: bottomInset }}
        refreshControl={<RefreshControl refreshing={active.isRefetching} onRefresh={refresh} />}
      >
        <View style={[styles.inset, styles.header]}>
          <Text variant="h3" color="secondary" accessibilityRole="header">
            Bookings
          </Text>
          <View style={styles.headerIcons}>
            <Pressable
              onPress={() => router.push('/cart')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={carts.size ? `Cart, ${carts.size} saved` : 'Cart'}
            >
              <Icon name="cart" size={28} color="black" />
              <CountBadge count={carts.size} size={14} style={styles.iconBadge} />
            </Pressable>
            <Pressable onPress={() => router.push('/all-bookings')} hitSlop={8} accessibilityRole="button" accessibilityLabel="All bookings">
              <Icon name="more-dots" size={28} color="black" />
            </Pressable>
          </View>
        </View>
        <View style={styles.divider} />
        {body}
      </Animated.ScrollView>
    </View>
  );
}

function BusinessRow({ bookings, unread, onPress }: { bookings: BookingRow[]; unread: number; onPress: () => void }) {
  const biz = bookings[0]!.business;
  const { distanceKm } = useBusinessLocation(biz.id);
  return (
    <View>
      <BusinessCard
        name={biz.name}
        logoUrl={biz.logo_url}
        verified={biz.is_verified}
        distanceKm={distanceKm}
        area={[bookings[0]?.location?.area, bookings[0]?.location?.city].filter(Boolean).join(', ') || null}
        rating={Number(biz.rating_avg)}
        trailing={<CountBadge count={unread} />}
        onPress={onPress}
        accessibilityLabel={`${biz.name}, ${bookings.length} active reservation${bookings.length === 1 ? '' : 's'}${unread ? `, ${unread} unread messages` : ''}`}
      />
    </View>
  );
}

function Empty({ title, note, action }: { title: string; note: string; action: { label: string; onPress: () => void } }) {
  return (
    <View style={styles.empty}>
      <Image source={require('../../../assets/illustrations/koala-empty.svg')} style={styles.koala} contentFit="contain" accessible={false} />
      <Text variant="h4" color="secondary" align="center" style={styles.emptyTitle}>
        {title}
      </Text>
      <Text variant="body14" weight="medium" color="secondaryTint2" align="center" style={styles.emptyNote}>
        {note}
      </Text>
      <Button label={action.label} variant="dark" size="small" onPress={action.onPress} style={styles.emptyButton} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  inset: {
    paddingHorizontal: B.inset,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: B.headerIconGap,
  },
  iconBadge: {
    position: 'absolute',
    top: -3,
    right: -5,
  },
  divider: {
    marginTop: B.dividerTop,
    marginHorizontal: B.inset,
    height: 1,
    backgroundColor: colors.secondaryTint5,
  },
  cards: {
    marginTop: B.listTop,
    gap: B.card.gap,
  },
  empty: {
    marginTop: B.emptyTop,
    paddingHorizontal: 56,
    alignItems: 'center',
  },
  koala: {
    width: 130,
    height: 85,
  },
  emptyTitle: {
    marginTop: 29,
  },
  emptyNote: {
    marginTop: 14,
  },
  emptyButton: {
    marginTop: 24,
    alignSelf: 'center',
  },
});
