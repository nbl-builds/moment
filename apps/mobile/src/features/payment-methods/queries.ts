import { PAYMENT_METHODS } from '@moment/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/features/auth/use-session';
import { profileKeys } from '@/features/profile/queries';
import { api } from '@/lib/api';
import type { TokenizedMethod } from './mock';

export type SavedPaymentMethod = Awaited<ReturnType<typeof api.account.paymentMethods.list>>[number];

export function usePaymentMethods() {
  const userId = useSession()?.user.id;
  return useQuery({
    queryKey: profileKeys.paymentMethods(userId),
    queryFn: () => api.account.paymentMethods.list(),
    enabled: Boolean(userId),
  });
}

/** "Visa •••• 4242", "JazzCash •••• 4567". */
export function methodTitle(m: Pick<SavedPaymentMethod, 'method' | 'brand' | 'last4'>) {
  const name = m.method === 'card' ? (m.brand ?? 'Card') : (PAYMENT_METHODS.find((p) => p.key === m.method)?.label ?? m.method);
  return `${name} •••• ${m.last4}`;
}

/** "Expires 08/28" for cards. */
export function methodExpiry(m: Pick<SavedPaymentMethod, 'exp_month' | 'exp_year'>) {
  if (!m.exp_month || !m.exp_year) return null;
  return `Expires ${String(m.exp_month).padStart(2, '0')}/${String(m.exp_year % 100).padStart(2, '0')}`;
}

export function usePaymentMethodMutations() {
  const client = useQueryClient();
  const userId = useSession()?.user.id;
  const refresh = () => client.invalidateQueries({ queryKey: profileKeys.paymentMethods(userId) });

  /** Saves a tokenised method: only the provider token and display details (call `tokenize` first). */
  const add = useMutation({
    mutationFn: (t: TokenizedMethod) =>
      api.account.paymentMethods.add({
        method: t.kind,
        last4: t.last4,
        brand: t.brand,
        expMonth: t.expMonth,
        expYear: t.expYear,
        holderName: t.holderName,
        provider: t.provider,
        providerToken: t.providerToken,
      }),
    onSuccess: refresh,
  });
  const setDefault = useMutation({ mutationFn: (id: string) => api.account.paymentMethods.setDefault(id), onSettled: refresh });
  const remove = useMutation({ mutationFn: (id: string) => api.account.paymentMethods.remove(id), onSettled: refresh });
  return { add, setDefault, remove };
}
