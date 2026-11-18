import type { Enums } from '../types';
import type { PageOptions } from './catalog';
import { fromPostgrestError, requireUserId, unwrap, type MomentSupabaseClient } from './errors';

// Profile > Wallet, Membership, Notifications, plus push token registration.

export function createAccountApi(db: MomentSupabaseClient) {
  return {
    wallet: {
      /** One row per currency; empty when the user has no wallet activity. */
      balances: async () => {
        const userId = await requireUserId(db);
        return unwrap(db.from('wallet_balances').select('currency, balance').eq('user_id', userId));
      },

      /** "Transactions". */
      transactions: async ({ limit = 30, offset = 0 }: PageOptions = {}) => {
        const userId = await requireUserId(db);
        return unwrap(
          db
            .from('wallet_transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1),
        );
      },
    },

    memberships: {
      /** Moment platform plans (`business_id` null) or one business's plans. */
      listPlans: (businessId?: string) => {
        let q = db.from('membership_plans').select('*').eq('is_active', true);
        q = businessId ? q.eq('business_id', businessId) : q.is('business_id', null);
        return unwrap(q.order('sort_order'));
      },

      /** "Membership Details". Paid memberships are created by backend code after payment. */
      listMine: async () => {
        const userId = await requireUserId(db);
        return unwrap(
          db
            .from('memberships')
            .select('*, plan:membership_plans!inner(id, name, description, price_amount, currency, interval, benefits), business:businesses(id, name, slug, logo_url)')
            .eq('user_id', userId)
            .order('started_at', { ascending: false }),
        );
      },
    },

    notifications: {
      list: async ({ unreadOnly = false, limit = 30, offset = 0 }: { unreadOnly?: boolean } & PageOptions = {}) => {
        const userId = await requireUserId(db);
        let q = db.from('notifications').select('*').eq('user_id', userId);
        if (unreadOnly) q = q.is('read_at', null);
        return unwrap(q.order('created_at', { ascending: false }).range(offset, offset + limit - 1));
      },

      unreadCount: async () => {
        const userId = await requireUserId(db);
        const { count, error, status } = await db
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .is('read_at', null);
        if (error) throw fromPostgrestError(error, status);
        return count ?? 0;
      },

      markRead: (ids: string[]) =>
        unwrap(db.from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids)),

      markAllRead: async () => {
        const userId = await requireUserId(db);
        return unwrap(
          db.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userId).is('read_at', null),
        );
      },

      remove: (id: string) => unwrap(db.from('notifications').delete().eq('id', id)),
    },

    /** Saves this device's Expo push token (idempotent per token). */
    registerPushToken: async ({
      token,
      platform,
      deviceName,
    }: {
      token: string;
      platform: Enums<'device_platform'>;
      deviceName?: string;
    }) => {
      const userId = await requireUserId(db);
      return unwrap(
        db
          .from('push_tokens')
          .upsert(
            { user_id: userId, token, platform, device_name: deviceName ?? null, last_seen_at: new Date().toISOString() },
            { onConflict: 'token' },
          ),
      );
    },

    unregisterPushToken: (token: string) => unwrap(db.from('push_tokens').delete().eq('token', token)),
  };
}
