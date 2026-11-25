import { colors } from '@moment/shared';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui';
import { bookingDraft } from '@/features/booking/draft';
import { planPeriodLabel } from '@/features/business/components/plan-card';
import { ComingNext } from '@/features/placeholders/coming-next';
import { api } from '@/lib/api';

/**
 * Booking entry from a business page: `services` (comma-separated ids from
 * the cart, "Continue" on 48:7876) or `planId` ("Apply Membership"). Starts
 * the checkout and opens Confirm Reservation in its place.
 */
export default function BookingEntry() {
  const { businessId, services, planId } = useLocalSearchParams<{ businessId: string; services?: string; planId?: string }>();
  const ids = (services ?? '').split(',').filter(Boolean);

  const start = useQuery({
    queryKey: ['booking', 'entry', businessId, services ?? '', planId ?? ''],
    queryFn: async () => {
      if (planId) {
        const plan = await api.catalog.getMembershipPlan(planId);
        bookingDraft.start({
          kind: 'membership',
          businessId: plan.business_id ?? businessId,
          planId: plan.id,
          name: plan.name,
          price: plan.price_amount,
          period: planPeriodLabel(plan.interval),
        });
        return true;
      }
      const all = await api.catalog.listBusinessServices(businessId);
      const picked = ids.map((id) => all.find((s) => s.id === id)).filter((s) => s !== undefined);
      if (picked.length === 0) throw new Error('These services are no longer available.');
      bookingDraft.start({
        kind: 'services',
        businessId,
        services: picked.map((s) => ({ listingId: s.id, title: s.title, price: s.price_amount, durationMinutes: s.duration_minutes })),
        visit: null,
      });
      return true;
    },
    gcTime: 0,
    retry: 1,
  });

  useEffect(() => {
    if (start.data) router.replace('/booking/confirm');
  }, [start.data]);

  if (start.isError) {
    return (
      <ComingNext title="Booking" note={start.error instanceof Error ? start.error.message : 'Couldn’t start the booking.'}>
        <Button label="Try again" variant="dark" size="small" onPress={() => start.refetch()} style={styles.retry} />
      </ComingNext>
    );
  }
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.secondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundMuted,
  },
  retry: {
    alignSelf: 'flex-start',
    marginTop: 24,
  },
});
