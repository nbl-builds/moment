import { colors } from '@moment/shared';
import { StyleSheet, View } from 'react-native';
import { Icon, Text } from '@/components/ui';
import { BOOK } from '../layout';
import { BookingSheet } from './booking-sheet';

const RING = 116;
const DOT = 76;

export type SuccessKind = 'request' | 'confirmed' | 'membership';

const COPY: Record<SuccessKind, { title: string; body: string }> = {
  request: {
    title: 'Wait for the owner to\naccept your reservation.',
    body: 'You can always see your reservation status\nin Bookings.',
  },
  confirmed: {
    title: 'Your reservation\nis confirmed.',
    body: 'You can always see your reservation status\nin Bookings.',
  },
  membership: {
    title: 'Your membership\nrequest is sent.',
    body: 'The business will confirm it shortly.\nWe’ll let you know.',
  },
};

/** Booking sent (47:5045): check badge, title, note and "Sounds Good!". */
export function SuccessSheet({ visible, kind, onDone }: { visible: boolean; kind: SuccessKind; onDone: () => void }) {
  const copy = COPY[kind];
  return (
    <BookingSheet visible={visible} onClose={onDone} hideClose top={BOOK.sheet.top.success} action={{ label: 'Sounds Good!', onPress: onDone }}>
      <View style={styles.content} accessibilityLiveRegion="polite">
        <View style={styles.ring}>
          <View style={styles.dot}>
            <Icon name="check-large" size={56} color="white" />
          </View>
        </View>
        <Text variant="h3" color="secondary" align="center" style={styles.title}>
          {copy.title}
        </Text>
        <Text variant="body16" weight="medium" color="secondaryTint2" align="center" style={styles.body}>
          {copy.body}
        </Text>
      </View>
    </BookingSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingHorizontal: BOOK.inset,
    marginTop: 44,
    marginBottom: 27,
  },
  ring: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 8,
    borderColor: colors.white,
    backgroundColor: colors.iconButtonMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 11,
  },
  body: {
    marginTop: 11,
  },
});
