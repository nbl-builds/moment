import {
  CANCELLATION_POLICIES,
  colors,
  formatDuration,
  formatHour,
  formatPrice,
  getZonedParts,
  priceBreakdown,
  refundNote,
  type CancellationPolicyKey,
} from '@moment/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showToast } from '@/components/toast';
import { Button, Icon, Text, type IconName } from '@/components/ui';
import { DateSheet } from '@/features/booking/components/date-sheet';
import { PriceDetails } from '@/features/booking/components/price-details';
import { TimeSheet, type StaffInfo } from '@/features/booking/components/time-sheet';
import { hourRange } from '@/features/booking/format';
import type { ChainedVisit } from '@/features/booking/chain';
import { CountBadge } from '@/features/bookings/components/count-badge';
import { RESERVATION } from '@/features/bookings/layout';
import { rescheduleBooking, rescheduledTime } from '@/features/bookings/mock';
import { bookingsKeys, useBooking, useUnread, type BookingDetail } from '@/features/bookings/queries';
import { isActive, statusMeta } from '@/features/bookings/status';
import { useSession } from '@/features/auth/use-session';
import { useBusiness, useBusinessLocation } from '@/features/business/queries';
import { ComingNext } from '@/features/placeholders/coming-next';
import { api } from '@/lib/api';

const R = RESERVATION;
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Reservation details (47:6385 pending, 52:9299 confirmed, 47:6493 completed;
 * cancelled has no frame and uses the pending layout with a red status).
 */
export default function ReservationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useSession();
  const booking = useBooking(id);
  if (session === null) return <ComingNext title="Reservation" note="Log in to see this reservation." />;
  if (booking.isPending) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.secondary} />
      </View>
    );
  }
  if (booking.isError || !booking.data) {
    return <ComingNext title="Reservation" note="Couldn’t load this reservation. Go back and try again." />;
  }
  return <Reservation booking={booking.data} refreshing={booking.isRefetching} onRefresh={() => void booking.refetch()} />;
}

function Reservation({ booking: b, refreshing, onRefresh }: { booking: BookingDetail; refreshing: boolean; onRefresh: () => void }) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const unread = useUnread();
  const location = useBusinessLocation(b.business.id);
  const business = useBusiness(b.business.id);
  const [cancelling, setCancelling] = useState(false);
  const [sheet, setSheet] = useState<'date' | 'time' | null>(null);
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  // Reschedule is mocked (features/bookings/mock.ts): show the moved time for this session.
  const [moved, setMoved] = useState(() => rescheduledTime(b.id));
  const [now] = useState(() => Date.now());

  const startsAt = moved?.startsAt ?? b.starts_at;
  const endsAt = moved?.endsAt ?? b.ends_at;
  const meta = statusMeta(b.status);
  const policy = b.listing.cancellation_policy as CancellationPolicyKey;
  const unreadCount = unread.byBusiness.get(b.business.id) ?? 0;
  const canCancel = isActive(b.status) && new Date(startsAt).getTime() > now;
  const canReschedule = b.status === 'confirmed' && b.listing.booking_mode === 'appointment' && canCancel;
  const reviewed = (Array.isArray(b.review) ? b.review.length : b.review ? 1 : 0) > 0;
  const payment = b.payments?.[0];

  const openChat = () => router.push({ pathname: '/chat/[businessId]', params: { businessId: b.business.id } });

  const openMaps = () => {
    const label = encodeURIComponent(b.business.name);
    const p = location.point;
    const address = [b.location?.address_line1, b.location?.area, b.location?.city].filter(Boolean).join(', ');
    const url = p
      ? Platform.OS === 'ios'
        ? `maps:0,0?q=${label}@${p.lat},${p.lng}`
        : `geo:0,0?q=${p.lat},${p.lng}(${label})`
      : Platform.OS === 'ios'
        ? `maps:0,0?q=${encodeURIComponent(address)}`
        : `geo:0,0?q=${encodeURIComponent(address)}`;
    Linking.openURL(url).catch(() => Alert.alert('Couldn’t open maps', address));
  };

  const cancel = () => {
    const breakdown = priceBreakdown(b.subtotal_amount, b.discount_amount);
    const rule = CANCELLATION_POLICIES[policy];
    const deadline = rule.freeUntilHours === null ? null : new Date(startsAt).getTime() - rule.freeUntilHours * 3_600_000;
    const free = deadline !== null && deadline > Date.now();
    const outcome = free
      ? `Free cancellation applies: you get a full refund of ${formatPrice(breakdown.total)}.`
      : 'Free cancellation has ended, so this reservation is non-refundable.';
    const refund = b.payment_status === 'unpaid' ? `${outcome}\n\nYou haven’t paid yet, so nothing will be charged.` : outcome;
    Alert.alert('Cancel this reservation?', `${refund}\n\n${b.business.name} will be told right away.`, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel reservation',
        style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            await api.bookings.cancel({ bookingId: b.id, reason: 'Cancelled in the app' });
            await queryClient.invalidateQueries({ queryKey: bookingsKeys.all });
            showToast('Reservation cancelled');
          } catch (e) {
            Alert.alert('Couldn’t cancel', e instanceof Error ? e.message : 'Please try again.');
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  const saveReschedule = async (visit: ChainedVisit) => {
    setSheet(null);
    try {
      const next = await rescheduleBooking({ bookingId: b.id, startsAt: visit.startsAt, endsAt: visit.endsAt, staffId: visit.times[0]?.staff_id });
      setMoved({ startsAt: next.startsAt, endsAt: next.endsAt });
      showToast(`Moved to ${longDay(next.startsAt)}, ${hourRange(next.startsAt, next.endsAt)}`);
    } catch (e) {
      Alert.alert('Couldn’t reschedule', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  const bookAgain = () =>
    b.listing.booking_mode === 'slot'
      ? router.push({ pathname: '/booking/dates/[listingId]', params: { listingId: b.listing.id } })
      : router.push({ pathname: '/business/[slug]', params: { slug: b.business.slug, tab: 'services' } });

  const minutes = Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60_000);
  const lines = b.items.length
    ? b.items.map((i) => ({ label: `${i.quantity}x ${i.name}`, value: formatPrice(i.total_amount, { currency: b.currency }) }))
    : [{ label: `1x ${b.listing.title}`, value: formatPrice(b.subtotal_amount, { currency: b.currency }) }];
  const staff = new Map<string, StaffInfo>((business.data?.staff ?? []).map((s) => [s.id, { name: s.display_name, avatarUrl: s.avatar_url }]));

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.white} />}
        showsVerticalScrollIndicator={false}
      >
        <Photos urls={b.listing.media.slice().sort((x, y) => x.sort_order - y.sort_order).map((m) => m.url)} />
        <Pressable
          onPress={() => router.back()}
          style={[styles.close, { top: insets.top + 12 }]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Icon name="close-thin" size={24} color="secondary" />
        </Pressable>

        {/* Status, business, date, time, address, payment */}
        <View style={[styles.section, styles.first]}>
          <View style={styles.statusRow}>
            <View style={styles.statusText}>
              <View style={styles.titleRow}>
                <Text variant="h4" color={meta.cancelled ? 'invalid' : 'secondary'} accessibilityRole="header">
                  {meta.title}
                </Text>
                {meta.icon && <Icon name={meta.icon} size={24} />}
              </View>
              <Text variant="body14" color="secondaryTint2" style={styles.going}>
                {b.status === 'completed' ? 'You went to ' : meta.cancelled ? 'You were going to ' : 'You are going to '}
                <Text
                  variant="body14"
                  weight="bold"
                  color="secondary"
                  style={styles.underline}
                  onPress={() => router.push({ pathname: '/business/[slug]', params: { slug: b.business.slug } })}
                  accessibilityRole="link"
                >
                  {b.business.name}
                </Text>
              </Text>
            </View>
            <Pressable
              onPress={openChat}
              style={({ pressed }) => [styles.chat, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={unreadCount ? `Chat with ${b.business.name}, ${unreadCount} unread` : `Chat with ${b.business.name}`}
            >
              <Icon name="message" size={R.chat.icon} color="black" />
              <CountBadge count={unreadCount} size={16} style={styles.chatBadge} />
            </Pressable>
          </View>
          <View style={styles.divider} />
          <InfoRow icon="calendar-days" title={longDay(startsAt)} note={dayNote(startsAt, b.status)} />
          <InfoRow icon="clock-outline" title={hourRange(startsAt, endsAt)} note={`You booked a ${formatDuration(minutes)} slot. Done by ${formatHour(endsAt)}.`} />
          <InfoRow
            icon="map-pin"
            title="Address"
            note={[b.location?.address_line1, b.location?.area, b.location?.city].filter(Boolean).join(', ') || b.business.name}
            onPress={openMaps}
            actionLabel="Opens maps"
          />
          <InfoRow
            icon="credit-card"
            title="Payment Method"
            note={payment ? (payment.method_summary ?? payment.method ?? payment.provider) : b.payment_status === 'unpaid' ? 'Not paid yet (test payment)' : 'Paid'}
          />
          {(b.status === 'completed' || meta.cancelled) && (
            <View style={styles.actions}>
              <Button label="Book again" onPress={bookAgain} />
              {b.status === 'completed' && !reviewed && (
                <Button
                  label="Write a review"
                  variant="outline"
                  onPress={() => router.push({ pathname: '/business/[slug]/review', params: { slug: b.business.slug, bookingId: b.id } })}
                />
              )}
            </View>
          )}
        </View>

        {/* Your Reservation, Guest Details, Notes */}
        <View style={styles.section}>
          <Text variant="body18" weight="bold" color="secondary" accessibilityRole="header">
            Your Reservation
          </Text>
          <View style={styles.lines}>
            {lines.map((l) => (
              <Line key={l.label} label={l.label} value={l.value} />
            ))}
          </View>
          <Text variant="body18" weight="bold" color="secondary" style={styles.subhead} accessibilityRole="header">
            Guest Details
          </Text>
          <View style={styles.lines}>
            <Line label={`${b.guest_count} ${b.guest_count === 1 ? 'guest' : 'guests'}${b.is_private ? ' · Private group' : ''}`} />
          </View>
          {b.notes ? (
            <>
              <Text variant="body18" weight="bold" color="secondary" style={styles.subhead} accessibilityRole="header">
                Notes
              </Text>
              <Text variant="body15" weight="medium" color="secondaryTint2" style={styles.notes}>
                {b.notes}
              </Text>
            </>
          ) : null}
        </View>

        <View style={styles.priceWrap}>
          <PriceDetails
            style={styles.priceSection}
            itemsLabel={b.items.length > 1 ? `${b.items.length} Services` : b.listing.type === 'service' ? '1 Service' : `${b.guest_count} Guest${b.guest_count === 1 ? '' : 's'}`}
            subtotal={b.subtotal_amount}
            discount={b.discount_amount - b.offer_discount_amount}
            offer={{ amount: b.offer_discount_amount, label: b.offer_label }}
            loading={false}
            error={false}
          />
        </View>

        <View style={styles.section}>
          <Text variant="body18" weight="bold" color="secondary" accessibilityRole="header">
            Cancellation
          </Text>
          <Text variant="body15" weight="medium" color="secondaryTint2" style={styles.cardBody}>
            {cancellationText(b, policy, startsAt)}
          </Text>
          {(canCancel || canReschedule) && (
            <View style={styles.links}>
              {canCancel && (
                <Text
                  variant="subText12"
                  weight="bold"
                  color="cancel"
                  style={styles.underline}
                  onPress={cancelling ? undefined : cancel}
                  accessibilityRole="button"
                >
                  {cancelling ? 'Cancelling…' : 'Cancel reservation'}
                </Text>
              )}
              {canReschedule && (
                <Text variant="subText12" weight="bold" color="black" style={styles.underline} onPress={() => setSheet('date')} accessibilityRole="button">
                  Reschedule Reservation
                </Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text variant="body18" weight="bold" color="secondary" accessibilityRole="header">
            Get support anytime
          </Text>
          <Text variant="body15" weight="medium" color="secondaryTint2" style={styles.cardBody}>
            If you need help, we’re available 24/7 from anywhere in the world.
          </Text>
          <Pressable onPress={() => router.push('/support')} style={styles.support} accessibilityRole="button" accessibilityLabel="Contact Moment Support">
            <Icon name="moment-mark" size={28} color="secondary" />
            <Text variant="subText12" weight="bold" color="secondary" style={styles.supportLabel}>
              Contact Moment Support
            </Text>
            <Icon name="chevron-small" size={18} color="black" style={styles.chevronRight} />
          </Pressable>
        </View>
      </ScrollView>

      {canReschedule && (
        <>
          <DateSheet
            visible={sheet === 'date'}
            serviceIds={[b.listing.id]}
            value={pickedDate}
            onSelect={(d) => {
              setPickedDate(d);
              setSheet('time');
            }}
            onClose={() => setSheet(null)}
          />
          <TimeSheet
            visible={sheet === 'time'}
            serviceIds={[b.listing.id]}
            date={pickedDate}
            price={b.subtotal_amount}
            staff={staff}
            fallbackName={b.business.name}
            value={null}
            onSave={(v) => void saveReschedule(v)}
            onBack={() => setSheet('date')}
            onClose={() => setSheet(null)}
          />
        </>
      )}
    </View>
  );
}

/** Photo carousel with page dots (47:6385: 454pt, white dots). */
function Photos({ urls }: { urls: string[] }) {
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const shown = urls.length ? urls : [null];
  return (
    <View style={styles.photos}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        accessibilityLabel={`Photos, ${shown.length}`}
      >
        {shown.map((u, i) => (
          <View key={i} style={{ width, height: R.photo }}>
            {u && <Image source={api.media.url(u)} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />}
          </View>
        ))}
      </ScrollView>
      {shown.length > 1 && (
        <View style={styles.dots} pointerEvents="none">
          {shown.slice(0, 10).map((_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

function InfoRow({ icon, title, note, onPress, actionLabel }: { icon: IconName; title: string; note: string; onPress?: () => void; actionLabel?: string }) {
  const content = (
    <>
      <Icon name={icon} size={R.infoIcon} color="secondary" style={styles.infoIcon} />
      <View style={styles.infoText}>
        <Text variant="body16" weight="bold" color="secondary">
          {title}
        </Text>
        <Text variant="body15" weight="medium" color="secondaryTint2" style={onPress && styles.underline}>
          {note}
        </Text>
      </View>
    </>
  );
  return onPress ? (
    <Pressable onPress={onPress} style={styles.info} accessibilityRole="button" accessibilityLabel={`${title}, ${note}`} accessibilityHint={actionLabel}>
      {content}
    </Pressable>
  ) : (
    <View style={styles.info} accessible accessibilityLabel={`${title}, ${note}`}>
      {content}
    </View>
  );
}

function Line({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.line}>
      <Text variant="body15" weight="medium" color="secondaryTint2" style={styles.lineLabel}>
        {label}
      </Text>
      {value && (
        <Text variant="body15" weight="medium" color="secondaryTint2">
          {value}
        </Text>
      )}
    </View>
  );
}

/** "Tuesday, 24 Nov 2026" in Pakistan time. */
function longDay(iso: string) {
  const p = getZonedParts(iso);
  return `${DAYS[p.weekday]}, ${p.day} ${MONTHS[p.month - 1]} ${p.year}`;
}

/** Under the date: how far away it is, or what happened. */
function dayNote(iso: string, status: BookingDetail['status']) {
  if (status === 'completed') return 'Thanks for visiting.';
  if (status === 'no_show') return 'This reservation was missed.';
  if (status === 'cancelled_by_consumer' || status === 'cancelled_by_business') return 'This reservation was cancelled.';
  const days = Math.round((startOfDay(iso) - startOfDay(new Date().toISOString())) / 86_400_000);
  if (days <= 0) return 'Today. Please arrive 10 minutes early.';
  if (days === 1) return 'Tomorrow. Please arrive 10 minutes early.';
  return `In ${days} days. Please arrive 10 minutes early.`;
}

const startOfDay = (iso: string) => {
  const p = getZonedParts(iso);
  return Date.UTC(p.year, p.month - 1, p.day);
};

function cancellationText(b: BookingDetail, policy: CancellationPolicyKey, startsAt: string) {
  if (b.status === 'cancelled_by_business') return `Cancelled by ${b.business.name}${b.cancellation_reason ? `: “${b.cancellation_reason}”` : '.'}`;
  if (b.status === 'cancelled_by_consumer') return 'You cancelled this reservation.';
  if (b.status === 'completed' || b.status === 'no_show') return CANCELLATION_POLICIES[policy].summary;
  return refundNote(policy, startsAt);
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
  photos: {
    height: R.photo,
    backgroundColor: colors.secondaryTint6,
  },
  dots: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.white,
    opacity: 0.5,
  },
  dotActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    opacity: 1,
  },
  close: {
    position: 'absolute',
    left: 20,
    width: R.close,
    height: R.close,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginTop: R.sectionGap,
    backgroundColor: colors.surface,
    paddingHorizontal: 40,
    paddingTop: R.padTop,
    paddingBottom: R.padTop,
  },
  first: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  statusText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  going: {
    marginTop: 8,
  },
  underline: {
    textDecorationLine: 'underline',
  },
  chat: {
    width: R.chat.size,
    height: R.chat.size,
    borderRadius: R.chat.radius,
    backgroundColor: colors.track,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  chatBadge: {
    position: 'absolute',
    top: -7,
    right: -4,
  },
  pressed: {
    opacity: 0.7,
  },
  divider: {
    marginTop: 20,
    marginBottom: 8,
    height: 1,
    backgroundColor: colors.divider,
  },
  info: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingLeft: 20,
    gap: 18,
  },
  infoIcon: {
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    gap: 2,
  },
  actions: {
    marginTop: 16,
    gap: 12,
  },
  lines: {
    marginTop: 12,
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 14.5,
  },
  lineLabel: {
    flexShrink: 1,
  },
  subhead: {
    marginTop: 14,
  },
  notes: {
    marginTop: 12,
  },
  priceWrap: {
    marginTop: R.sectionGap,
  },
  priceSection: {
    marginHorizontal: 0,
    borderRadius: 0,
    paddingHorizontal: 40,
    paddingVertical: R.padTop,
  },
  cardBody: {
    marginTop: 12,
  },
  links: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  support: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  supportLabel: {
    flex: 1,
  },
  chevronRight: {
    transform: [{ rotate: '-90deg' }],
  },
});
