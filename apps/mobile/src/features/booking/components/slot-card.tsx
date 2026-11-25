import { colors } from '@moment/shared';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { Button, Icon, Text } from '@/components/ui';
import { shortDay } from '../format';
import { BOOK } from '../layout';
import { HostLine } from './host-line';

const G = BOOK.slot.guestButton;

export interface SlotCardProps {
  startsAt: string;
  endsAt: string;
  hostName: string;
  hostAvatar: string | null;
  price: string;
  priceNote: string;
  refund: string;
  /** "Sold out" / "2 seats left": shown under the date. */
  availability: string | null;
  soldOut: boolean;
  /** Guests tab: the "Add Guest" row; null hides it. */
  guests: { label: string | null; onEdit: () => void } | null;
  chooseDisabled: boolean;
  onChoose: () => void;
  shareText: string;
}

/** A session on "Select dates" (47:4198 Dates tab, 47:4348 Guests tab). */
export function SlotCard(p: SlotCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.dateCol}>
          <Text variant="body16" weight="bold" color="secondary">
            {shortDay(p.startsAt)}
          </Text>
          {p.availability && (
            <Text variant="body12" weight="semibold" color={p.soldOut ? 'invalid' : 'third'}>
              {p.availability}
            </Text>
          )}
        </View>
        <Pressable
          onPress={() => Share.share({ message: p.shareText }).catch(() => undefined)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Share this session"
        >
          <Icon name="open-external" size={28} color="secondary" />
        </Pressable>
      </View>
      <View style={styles.divider} />
      <View style={styles.host}>
        <HostLine
          name={p.hostName}
          avatarUrl={p.hostAvatar}
          startsAt={p.startsAt}
          endsAt={p.endsAt}
          price={p.price}
          priceNote={p.priceNote}
        />
      </View>
      {p.guests && (
        <View style={styles.guests}>
          <View style={styles.guestText}>
            <Text variant="subText14" weight="bold" color="secondary">
              Add Guest
            </Text>
            <Text variant="subText10" color="secondaryTint2">
              {p.guests.label ?? 'Click on plus icon to add guests.'}
            </Text>
          </View>
          {p.guests.label ? (
            <Text
              variant="subText14"
              weight="bold"
              color="secondary"
              onPress={p.guests.onEdit}
              accessibilityRole="button"
              accessibilityLabel="Edit guests"
            >
              Edit
            </Text>
          ) : (
            <Pressable
              onPress={p.guests.onEdit}
              disabled={p.soldOut}
              hitSlop={8}
              style={[styles.add, p.soldOut && styles.addDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Add guests"
            >
              <Icon name="plus" size={20} color="white" />
            </Pressable>
          )}
        </View>
      )}
      <Button
        label={p.soldOut ? 'Sold out' : 'Choose'}
        onPress={p.onChoose}
        disabled={p.chooseDisabled || p.soldOut}
        style={[styles.choose, p.guests && styles.chooseGuests]}
      />
      <Text variant="subText10" color="secondaryTint2" style={styles.refund}>
        {p.refund}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: BOOK.inset,
    paddingHorizontal: BOOK.card.padding,
    paddingTop: 15,
    paddingBottom: 17,
    borderRadius: BOOK.card.radius,
    backgroundColor: colors.surface,
  },
  top: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  divider: {
    marginTop: 15,
    height: 1,
    backgroundColor: colors.secondaryTint5,
  },
  host: {
    marginTop: 19,
  },
  guests: {
    marginTop: 21,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  guestText: {
    gap: 4,
  },
  add: {
    width: G,
    height: G,
    borderRadius: G / 2,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addDisabled: {
    opacity: 0.3,
  },
  choose: {
    marginTop: 20,
  },
  chooseGuests: {
    marginTop: 22,
  },
  refund: {
    marginTop: 8,
    maxWidth: 300,
  },
});
