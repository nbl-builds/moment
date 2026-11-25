import { colors } from '@moment/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showToast } from '@/components/toast';
import { Button, Icon, Text } from '@/components/ui';
import { useSession } from '@/features/auth/use-session';
import { PromoCarousel } from '@/features/home/components/promo-carousel';
import { Skeleton } from '@/features/home/components/skeleton';
import { markOffersSeen } from '@/features/offers/seen';
import { PageHeader } from '@/features/profile/components/page-header';
import { profileKeys, useOffers, useSavedCoupons } from '@/features/profile/queries';
import { api } from '@/lib/api';

type Coupon = Awaited<ReturnType<typeof api.catalog.listPublicCoupons>>[number];

/** Offers (48:5415): promo banners, Coupons with Apply (saved for checkout), Referral. */
export default function OffersScreen() {
  const insets = useSafeAreaInsets();
  const userId = useSession()?.user.id;
  const client = useQueryClient();
  const offers = useOffers();
  const saved = useSavedCoupons();
  const savedIds = new Set((saved.data ?? []).map((s) => s.coupon_id));

  useEffect(() => {
    if (offers.data) void markOffersSeen(offers.data.map((c) => c.id));
  }, [offers.data]);

  const toggle = useMutation({
    mutationFn: ({ id, apply }: { id: string; apply: boolean }) => (apply ? api.account.savedCoupons.save(id) : api.account.savedCoupons.remove(id)),
    onSuccess: (_, { apply }) => showToast(apply ? 'Coupon applied. We’ll add it at checkout.' : 'Coupon removed'),
    onError: () => showToast('Couldn’t update the coupon. Try again.'),
    onSettled: () => client.invalidateQueries({ queryKey: profileKeys.savedCoupons(userId) }),
  });

  const refresh = () => {
    void offers.refetch();
    void saved.refetch();
  };

  return (
    <View style={styles.screen}>
      <PageHeader title="Offers" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        refreshControl={<RefreshControl refreshing={offers.isRefetching} onRefresh={refresh} />}
      >
        <View style={styles.carousel}>
          <PromoCarousel />
        </View>

        <View style={styles.section}>
          <Text variant="h4" color="black" style={styles.heading}>
            Coupons
          </Text>
          <View style={styles.coupons}>
            {userId === null ? (
              <View style={styles.state}>
                <Text variant="subText14" weight="medium" color="blackTint1" align="center">
                  Sign in to see your coupons.
                </Text>
              </View>
            ) : offers.isPending ? (
              <Skeleton width="100%" height={70} radius={15} />
            ) : offers.isError ? (
              <View style={styles.state}>
                <Text variant="subText14" weight="medium" color="blackTint1" align="center">
                  Couldn’t load coupons
                </Text>
                <Button label="Try again" size="small" variant="dark" onPress={() => void offers.refetch()} />
              </View>
            ) : offers.data.length === 0 ? (
              <View style={styles.state}>
                <Text variant="subText14" weight="medium" color="blackTint1" align="center">
                  No coupons right now. Check back soon.
                </Text>
              </View>
            ) : (
              offers.data.map((c) => {
                const applied = savedIds.has(c.id);
                const pending = toggle.isPending && toggle.variables.id === c.id;
                return (
                  <CouponRow
                    key={c.id}
                    coupon={c}
                    applied={pending ? toggle.variables.apply : applied}
                    disabled={pending || saved.isPending}
                    onPress={() => toggle.mutate({ id: c.id, apply: !applied })}
                  />
                );
              })
            )}
          </View>

          <Text variant="h4" color="black" style={[styles.heading, styles.referralHeading]}>
            Referral
          </Text>
          <Pressable
            onPress={() => router.push('/invite')}
            style={({ pressed }) => [styles.referral, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Refer a friend"
          >
            <Text variant="body15" weight="medium" color="black" style={styles.referralLabel}>
              Refer a friend
            </Text>
            <Icon name="chevron-right" size={16} color="black" />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function CouponRow({ coupon, applied, disabled, onPress }: { coupon: Coupon; applied: boolean; disabled: boolean; onPress: () => void }) {
  return (
    <View style={styles.coupon}>
      <View style={styles.couponText}>
        <Text variant="body15" weight="medium" color="black" numberOfLines={1} style={styles.couponTitle}>
          {coupon.title}
        </Text>
        <Text variant="subText12" color="blackTint3" numberOfLines={2}>
          {coupon.description ?? `Use code ${coupon.code}`}
        </Text>
      </View>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [styles.apply, applied && styles.applied, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={applied ? `${coupon.title}, applied. Remove` : `Apply ${coupon.title}`}
        accessibilityState={{ selected: applied, disabled }}
      >
        <Text variant="subText14" weight="medium" color="black">
          {applied ? 'Applied' : 'Apply'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  carousel: {
    marginTop: 20,
  },
  section: {
    paddingHorizontal: 20,
  },
  heading: {
    marginTop: 30,
    letterSpacing: 0.2,
  },
  coupons: {
    marginTop: 23,
    gap: 16,
  },
  // Figma 48:5442: 70pt white card, text 15 from the left, Apply 13 from the right.
  coupon: {
    minHeight: 70,
    borderRadius: 15,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 15,
    paddingRight: 13,
    paddingVertical: 12,
    gap: 12,
  },
  couponText: {
    flex: 1,
  },
  couponTitle: {
    lineHeight: 20,
    marginBottom: 4,
  },
  apply: {
    minWidth: 77,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.black,
  },
  applied: {
    backgroundColor: colors.primary,
  },
  pressed: {
    opacity: 0.7,
  },
  referralHeading: {
    marginTop: 45,
  },
  // Figma 48:5456: 60pt white row, label 23 from the left, chevron 16 from the right.
  referral: {
    marginTop: 23,
    height: 60,
    borderRadius: 15,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 23,
    paddingRight: 16,
  },
  referralLabel: {
    flex: 1,
  },
  state: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
});
