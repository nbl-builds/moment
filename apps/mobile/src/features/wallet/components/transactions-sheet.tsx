import { colors } from '@moment/shared';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from '@/components/ui';
import { BookingSheet } from '@/features/booking/components/booking-sheet';
import { Skeleton } from '@/features/home/components/skeleton';
import { PERIODS, useWalletTransactions, type Period, type WalletTransaction } from '../queries';
import { ROW, TransactionRow } from './transaction-row';

/** "All Transactions" (48:3728): period chips, then the rows. */
export function TransactionsSheet({
  visible,
  onClose,
  onOpenTransaction,
}: {
  visible: boolean;
  onClose: () => void;
  onOpenTransaction: (tx: WalletTransaction) => void;
}) {
  const [period, setPeriod] = useState<Period>('7d');
  const txs = useWalletTransactions(visible ? period : undefined, 100);

  return (
    <BookingSheet visible={visible} onClose={onClose} title="All Transactions" top={334} scrollContent>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipScroll}
        accessibilityRole="tablist"
      >
        {PERIODS.map((p) => {
          const selected = p.key === period;
          return (
            <Pressable
              key={p.key}
              onPress={() => setPeriod(p.key)}
              style={[styles.chip, selected && styles.chipSelected]}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
            >
              <Text variant={selected ? 'subText14' : 'subText12'} weight="medium" color={selected ? 'black' : 'blackTint1'}>
                {p.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.divider} />

      <View style={styles.list}>
        {txs.isPending ? (
          [0, 1, 2].map((i) => <Skeleton key={i} width="100%" height={ROW.height} radius={ROW.radius} />)
        ) : txs.isError ? (
          <View style={styles.state}>
            <Text variant="body16" weight="bold" color="black" align="center">
              Couldn’t load your transactions
            </Text>
            <Button label="Try again" size="small" variant="dark" onPress={() => void txs.refetch()} />
          </View>
        ) : txs.data.length === 0 ? (
          <View style={styles.state}>
            <Text variant="body16" weight="bold" color="black" align="center">
              No transactions in this period
            </Text>
            <Text variant="subText14" color="blackTint3" align="center">
              Deposits, payments and refunds will show here.
            </Text>
          </View>
        ) : (
          txs.data.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} onPress={tx.booking_id ? () => onOpenTransaction(tx) : undefined} />
          ))
        )}
      </View>
    </BookingSheet>
  );
}

const styles = StyleSheet.create({
  chipScroll: {
    marginTop: 19,
    flexGrow: 0,
  },
  // Figma: 97 x 36 chips, 16 apart, from x21.
  chips: {
    paddingHorizontal: 21,
    gap: 16,
  },
  chip: {
    minWidth: 97,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: colors.primary,
  },
  divider: {
    marginTop: 14,
    marginHorizontal: 20,
    height: 1,
    backgroundColor: colors.divider,
  },
  list: {
    marginTop: 28,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: ROW.gap,
  },
  state: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 24,
  },
});
