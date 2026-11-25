import { localDateTimeToIso, toLocalDate, type Tables } from '@moment/shared';
import { useQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { useSession } from '@/features/auth/use-session';
import { profileKeys } from '@/features/profile/queries';
import { api } from '@/lib/api';
import type { PendingDeposit } from './mock';

export type WalletTransaction = Tables<'wallet_transactions'>;

/** "All Transactions" chips (48:3728). */
export const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '1y', label: '1 year' },
] as const;
export type Period = (typeof PERIODS)[number]['key'];

const DAY_MS = 86_400_000;

/** Start of the period; "Today" starts at midnight in Pakistan. */
export function periodStart(period: Period, now = Date.now()): Date {
  switch (period) {
    case 'today':
      return new Date(localDateTimeToIso(toLocalDate(now), '00:00'));
    case '7d':
      return new Date(now - 7 * DAY_MS);
    case '30d':
      return new Date(now - 30 * DAY_MS);
    case '1y':
      return new Date(now - 365 * DAY_MS);
  }
}

/** PKR balance in minor units; 0 when the user has no wallet activity yet. */
export function useWalletBalance() {
  const userId = useSession()?.user.id;
  return useQuery({
    queryKey: [...profileKeys.wallet(userId), 'balance'],
    queryFn: async () => {
      const rows = await api.account.wallet.balances();
      return rows.find((r) => r.currency === 'PKR')?.balance ?? 0;
    },
    enabled: Boolean(userId),
  });
}

/** Latest transactions, or those since the start of `period`. */
export function useWalletTransactions(period?: Period, limit = 30) {
  const userId = useSession()?.user.id;
  return useQuery({
    queryKey: [...profileKeys.wallet(userId), 'transactions', period ?? 'latest', limit],
    queryFn: () => api.account.wallet.transactions({ limit, since: period ? periodStart(period) : undefined }),
    enabled: Boolean(userId),
  });
}

// Deposits started this session (mock, nothing charged). They show at the top
// of the history as "Pending" until the app restarts.
let pending: PendingDeposit[] = [];
const listeners = new Set<() => void>();

export function addPendingDeposit(deposit: PendingDeposit) {
  pending = [deposit, ...pending];
  listeners.forEach((l) => l());
}

export function usePendingDeposits(): PendingDeposit[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => pending,
  );
}
