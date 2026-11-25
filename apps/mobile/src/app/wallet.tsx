import { colors, formatPrice } from '@moment/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon, Text } from '@/components/ui';
import { useSession } from '@/features/auth/use-session';
import { Skeleton } from '@/features/home/components/skeleton';
import { PageHeader } from '@/features/profile/components/page-header';
import { DepositSheet } from '@/features/wallet/components/deposit-sheet';
import { PendingRow, ROW, TransactionRow } from '@/features/wallet/components/transaction-row';
import { TransactionsSheet } from '@/features/wallet/components/transactions-sheet';
import { usePendingDeposits, useWalletBalance, useWalletTransactions, type WalletTransaction } from '@/features/wallet/queries';

const LATEST = 5;

/** My Wallet (48:5297): balance, Deposit, the latest transactions; the arrow opens All Transactions (48:3728). */
export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const session = useSession();
  const balance = useWalletBalance();
  const latest = useWalletTransactions(undefined, LATEST);
  const pending = usePendingDeposits();
  const [sheet, setSheet] = useState<'deposit' | 'all' | null>(null);

  const openTransaction = (tx: WalletTransaction) => {
    if (!tx.booking_id) return;
    setSheet(null);
    router.push({ pathname: '/reservation/[id]', params: { id: tx.booking_id } });
  };

  const refresh = () => {
    void balance.refetch();
    void latest.refetch();
  };

  if (session === null) {
    return (
      <View style={styles.screen}>
        <PageHeader title="My Wallet" />
        <View style={styles.state}>
          <Text variant="body16" weight="bold" color="black" align="center">
            Sign in to see your wallet
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <PageHeader title="My Wallet" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={<RefreshControl refreshing={balance.isRefetching || latest.isRefetching} onRefresh={refresh} />}
      >
        <View style={styles.card}>
          {balance.isPending ? (
            <Skeleton width={200} height={56} radius={12} />
          ) : balance.isError ? (
            <Pressable onPress={() => void balance.refetch()} accessibilityRole="button" accessibilityLabel="Couldn’t load your balance. Try again">
              <Text variant="body16" weight="bold" color="black" align="center">
                Couldn’t load your balance
              </Text>
              <Text variant="subText14" color="blackTint3" align="center" style={styles.retry}>
                Tap to try again
              </Text>
            </Pressable>
          ) : (
            <Text variant="display40" weight="extrabold" color="black" numberOfLines={1} adjustsFontSizeToFit>
              {formatPrice(balance.data)}
            </Text>
          )}
          <Text variant="subText16" color="blackTint3" align="center" style={styles.available}>
            Available on your wallet
          </Text>
          <Pressable
            onPress={() => setSheet('deposit')}
            style={({ pressed }) => [styles.deposit, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Deposit"
          >
            <Icon name="add" size={24} color="black" />
            <Text variant="subText14" weight="medium" color="black">
              Deposit
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => setSheet('all')}
          style={styles.historyHeader}
          accessibilityRole="button"
          accessibilityLabel="Transaction History"
          accessibilityHint="Shows all transactions"
        >
          <Text variant="h4" color="black" style={styles.historyTitle}>
            Transaction History
          </Text>
          <Icon name="arrow-forward" size={28} color="blackTint3" />
        </Pressable>

        <View style={styles.rows}>
          {pending.map((d) => (
            <PendingRow key={d.id} deposit={d} />
          ))}
          {latest.isPending ? (
            [0, 1, 2].map((i) => <Skeleton key={i} width="100%" height={ROW.height} radius={ROW.radius} />)
          ) : latest.isError ? (
            <View style={styles.state}>
              <Text variant="body16" weight="bold" color="black" align="center">
                Couldn’t load your transactions
              </Text>
              <Button label="Try again" size="small" variant="dark" onPress={() => void latest.refetch()} />
            </View>
          ) : latest.data.length === 0 && pending.length === 0 ? (
            <View style={styles.state}>
              <Text variant="body16" weight="bold" color="black" align="center">
                No transactions yet
              </Text>
              <Text variant="subText14" color="blackTint3" align="center">
                Deposits, payments and refunds will show here.
              </Text>
            </View>
          ) : (
            latest.data.map((tx) => <TransactionRow key={tx.id} tx={tx} onPress={tx.booking_id ? () => openTransaction(tx) : undefined} />)
          )}
        </View>
      </ScrollView>

      <DepositSheet visible={sheet === 'deposit'} onClose={() => setSheet(null)} />
      <TransactionsSheet visible={sheet === 'all'} onClose={() => setSheet(null)} onOpenTransaction={openTransaction} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  // Figma: 232pt white card, amount 35 from the top, Deposit 37 from the bottom.
  card: {
    minHeight: 232,
    borderRadius: 15,
    backgroundColor: colors.white,
    alignItems: 'center',
    paddingTop: 35,
    paddingBottom: 37,
    paddingHorizontal: 20,
  },
  available: {
    marginTop: 6,
  },
  retry: {
    marginTop: 4,
  },
  deposit: {
    marginTop: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.black,
  },
  pressed: {
    backgroundColor: colors.pressedOverlay,
  },
  historyHeader: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyTitle: {
    flex: 1,
    letterSpacing: 0.2,
  },
  rows: {
    marginTop: 20,
    gap: ROW.gap,
  },
  state: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 24,
    paddingHorizontal: 20,
  },
});
