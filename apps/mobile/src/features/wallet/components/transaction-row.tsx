import { colors, formatPrice, formatShortDateTime } from '@moment/shared';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text, type IconName } from '@/components/ui';
import type { PendingDeposit } from '../mock';
import type { WalletTransaction } from '../queries';

/** Figma rows (48:5330): 70pt white card, 50pt tile, name, date, amount. */
export const ROW = { height: 70, gap: 16, radius: 15, tile: 50, tileRadius: 12 } as const;

const TYPE_ICONS: Record<WalletTransaction['type'] | 'pending', IconName> = {
  credit: 'add',
  refund_credit: 'arrow-up-down',
  promo: 'percent',
  debit: 'ticket',
  adjustment: 'wallet',
  pending: 'clock-outline',
};

const TYPE_FALLBACK: Record<WalletTransaction['type'], string> = {
  credit: 'Deposit',
  refund_credit: 'Refund',
  promo: 'Promo credit',
  debit: 'Payment',
  adjustment: 'Adjustment',
};

/** "+Rs 4,500" / "-Rs 2,000". */
export const signedAmount = (amount: number, currency = 'PKR') =>
  amount > 0 ? `+${formatPrice(amount, { currency })}` : formatPrice(amount, { currency });

export function TransactionRow({ tx, onPress }: { tx: WalletTransaction; onPress?: () => void }) {
  const title = tx.description || TYPE_FALLBACK[tx.type];
  const date = formatShortDateTime(tx.created_at);
  const amount = signedAmount(tx.amount, tx.currency);
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${title}, ${amount}, ${date}`}
      accessibilityHint={onPress ? 'Opens the reservation' : undefined}
    >
      <Tile icon={TYPE_ICONS[tx.type]} />
      <Body title={title} date={date} />
      <Text variant="body14" weight="bold" color={tx.amount < 0 ? 'debit' : 'price'} style={styles.amount}>
        {amount}
      </Text>
    </Pressable>
  );
}

/** A deposit started this session: shown on top until the provider confirms it. */
export function PendingRow({ deposit }: { deposit: PendingDeposit }) {
  const date = formatShortDateTime(deposit.created_at);
  const amount = signedAmount(deposit.amount, deposit.currency);
  return (
    <View style={styles.row} accessible accessibilityLabel={`${deposit.description}, ${amount}, pending, ${date}`}>
      <Tile icon={TYPE_ICONS.pending} />
      <Body title={deposit.description} date={date} />
      <View style={styles.right}>
        <Text variant="body14" weight="bold" color="blackTint3" style={styles.amount}>
          {amount}
        </Text>
        <Text variant="subText10" color="blackTint3">
          Pending
        </Text>
      </View>
    </View>
  );
}

function Tile({ icon }: { icon: IconName }) {
  return (
    <View style={styles.tile}>
      <Icon name={icon} size={24} color="black" />
    </View>
  );
}

function Body({ title, date }: { title: string; date: string }) {
  return (
    <View style={styles.body}>
      <Text variant="subText16" weight="medium" color="black" numberOfLines={1}>
        {title}
      </Text>
      <Text variant="subText10" color="blackTint1" style={styles.date}>
        {date}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: ROW.height,
    borderRadius: ROW.radius,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 15,
  },
  pressed: {
    opacity: 0.7,
  },
  tile: {
    width: ROW.tile,
    height: ROW.tile,
    borderRadius: ROW.tileRadius,
    backgroundColor: colors.backgroundMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Figma: text at x92 (12 after the tile), name 15 from the top, date 4 below.
  body: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  date: {
    marginTop: 4,
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    lineHeight: 19,
  },
});
