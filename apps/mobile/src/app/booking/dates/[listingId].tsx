import { colors, formatPrice, refundNote, type CancellationPolicyKey } from '@moment/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton, Button, Icon, Text } from '@/components/ui';
import { GuestsSheet } from '@/features/booking/components/guests-sheet';
import { SlotCard } from '@/features/booking/components/slot-card';
import { bookingDraft, guestsLabel, type DraftGuests } from '@/features/booking/draft';
import { hourRange, shortDay } from '@/features/booking/format';
import { BOOK } from '@/features/booking/layout';
import { useListing, useUpcomingSlots, type UpcomingSlot } from '@/features/booking/queries';
import { FilterChips } from '@/features/business/components/filter-chips';

type Tab = 'dates' | 'guests' | 'private';

const TABS: { value: Tab; label: string }[] = [
  { value: 'dates', label: 'Dates' },
  { value: 'guests', label: 'Guests' },
  { value: 'private', label: 'Private group' },
];

/**
 * "Select dates" for an experience (47:4198 Dates, 47:4348 Guests, 47:4311
 * Private group): the next sessions; Choose starts the checkout.
 */
export default function SelectDatesScreen() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const insets = useSafeAreaInsets();
  const listing = useListing(listingId);
  const slots = useUpcomingSlots(listingId);
  const [tab, setTab] = useState<Tab>('dates');
  /** Guests picked per session on the Guests tab. */
  const [guestsBySlot, setGuestsBySlot] = useState<Record<string, DraftGuests>>({});
  const [editing, setEditing] = useState<UpcomingSlot | null>(null);

  const l = listing.data;
  const policy = (l?.cancellation_policy ?? 'flexible') as CancellationPolicyKey;
  const minGuests = Math.max(1, l?.min_guests ?? 1);
  const defaultGuests: DraftGuests = { adults: minGuests, children: 0, infants: 0, pets: 0 };
  const privatePrice = l?.private_price_amount ?? null;

  const shown = (slots.data ?? []).filter((s) => (tab === 'private' ? s.status === 'open' && s.seats_booked === 0 : true));

  const choose = (slot: UpcomingSlot, guests: DraftGuests) => {
    if (!l) return;
    bookingDraft.start(
      {
        kind: 'slot',
        businessId: l.business.id,
        listingId: l.id,
        title: l.title,
        slotId: slot.id,
        startsAt: slot.starts_at,
        endsAt: slot.ends_at,
        private: tab === 'private',
        hostName: slot.staff?.display_name ?? null,
        maxGuests: tab === 'private' ? l.max_guests : Math.min(l.max_guests, slot.capacity - slot.seats_booked),
        minGuests,
        petsAllowed: l.pets_allowed,
      },
      guests,
    );
    router.push('/booking/confirm');
  };

  const priceFor = () =>
    tab === 'private' && privatePrice !== null
      ? { price: formatPrice(privatePrice), note: 'per group' }
      : { price: formatPrice(l?.price_amount ?? 0), note: l?.price_unit === 'per_booking' ? 'per booking' : 'per person' };

  let body;
  if (listing.isPending || slots.isPending) {
    body = <ActivityIndicator style={styles.state} color={colors.secondary} />;
  } else if (listing.isError || slots.isError) {
    body = (
      <Empty
        title="Couldn’t load sessions"
        note="Check your connection and try again."
        action={{ label: 'Try again', onPress: () => (listing.refetch(), slots.refetch()) }}
      />
    );
  } else if (tab === 'private' && privatePrice === null) {
    body = (
      <Empty
        title="No private groups here"
        note={`${l?.business.name ?? 'This host'} doesn’t offer private sessions for this experience. Book a shared session instead.`}
        action={{ label: 'See shared dates', onPress: () => setTab('dates') }}
      />
    );
  } else if (shown.length === 0) {
    body = (
      <Empty
        title={tab === 'private' ? 'No empty sessions' : 'No sessions soon'}
        note={
          tab === 'private'
            ? 'Private groups need a session nobody has booked yet. Check back soon.'
            : 'There are no sessions in the next three weeks. Check back soon.'
        }
      />
    );
  } else {
    const { price, note } = priceFor();
    body = (
      <View style={styles.cards}>
        {shown.map((slot) => {
          const left = slot.capacity - slot.seats_booked;
          const soldOut = slot.status === 'full' || left <= 0;
          const picked = guestsBySlot[slot.id];
          const host = slot.staff?.display_name ?? l?.business.name ?? '';
          return (
            <SlotCard
              key={slot.id}
              startsAt={slot.starts_at}
              endsAt={slot.ends_at}
              hostName={host}
              hostAvatar={slot.staff?.avatar_url ?? l?.business.logo_url ?? null}
              price={price}
              priceNote={note}
              refund={refundNote(policy, slot.starts_at)}
              availability={soldOut ? 'Sold out' : tab !== 'private' && left <= 3 ? `${left} seat${left === 1 ? '' : 's'} left` : null}
              soldOut={soldOut}
              guests={tab === 'guests' ? { label: picked ? guestsLabel(picked) : null, onEdit: () => setEditing(slot) } : null}
              chooseDisabled={tab === 'guests' && !picked}
              onChoose={() => choose(slot, tab === 'guests' && picked ? picked : defaultGuests)}
              shareText={`${l?.title ?? 'Moment'} with ${host}, ${shortDay(slot.starts_at)}, ${hourRange(slot.starts_at, slot.ends_at)} (PKT). Book on Moment.`}
            />
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + BOOK.backTop, paddingBottom: insets.bottom + 32 }}
        refreshControl={<RefreshControl refreshing={slots.isRefetching} onRefresh={() => void slots.refetch()} />}
        showsVerticalScrollIndicator={false}
      >
        <BackButton style={styles.back} />
        <Text variant="h3" color="secondary" style={styles.title}>
          Select dates
        </Text>
        <View style={styles.divider} />
        <View style={styles.tabs}>
          <FilterChips chips={TABS} value={tab} onChange={setTab} />
        </View>
        {body}
      </ScrollView>
      {editing && l && (
        <GuestsSheet
          visible
          value={guestsBySlot[editing.id] ?? defaultGuests}
          maxGuests={Math.min(l.max_guests, editing.capacity - editing.seats_booked)}
          minGuests={minGuests}
          petsAllowed={l.pets_allowed}
          onSave={(g) => {
            setGuestsBySlot((prev) => ({ ...prev, [editing.id]: g }));
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </View>
  );
}

function Empty({ title, note, action }: { title: string; note: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name="users" size={32} color="secondary" />
      </View>
      <Text variant="h4" color="secondary" align="center">
        {title}
      </Text>
      <Text variant="body15" weight="medium" color="secondaryTint2" align="center" style={styles.emptyNote}>
        {note}
      </Text>
      {action && <Button label={action.label} variant="dark" size="small" onPress={action.onPress} style={styles.emptyAction} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  back: {
    marginLeft: BOOK.inset,
  },
  title: {
    marginTop: BOOK.titleTop - 6,
    marginHorizontal: BOOK.inset,
  },
  divider: {
    marginTop: BOOK.dividerTop - 6,
    marginHorizontal: BOOK.inset,
    height: 1,
    backgroundColor: colors.secondaryTint5,
  },
  tabs: {
    marginTop: BOOK.afterDivider,
  },
  cards: {
    marginTop: 39,
    gap: 20,
  },
  state: {
    marginTop: 60,
  },
  empty: {
    marginTop: 72,
    marginHorizontal: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyNote: {
    marginTop: 8,
  },
  emptyAction: {
    marginTop: 24,
    alignSelf: 'center',
  },
});
