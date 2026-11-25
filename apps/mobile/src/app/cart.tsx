import { colors, formatPrice } from '@moment/shared';
import { useQueries } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton, Icon, Text } from '@/components/ui';
import { BusinessCard } from '@/features/booking/components/business-card';
import { BOOKINGS } from '@/features/bookings/layout';
import { serviceCart, useServiceCarts } from '@/features/business/cart';
import { businessKeys, useBusinessLocation } from '@/features/business/queries';
import { api } from '@/lib/api';

const B = BOOKINGS;
/** Drag further left than this to remove a cart. */
const REMOVE_AT = -110;

/**
 * Cart (52:8690 empty, 52:8991 with items): the services picked at each
 * business, saved on the device. A row opens the business with its cart;
 * swipe left to remove it.
 */
export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const carts = useServiceCarts();
  const ids = [...carts.keys()].reverse();

  const businesses = useQueries({
    queries: ids.map((id) => ({ queryKey: ['business', id], queryFn: () => api.catalog.getBusiness(id) })),
  });
  const services = useQueries({
    queries: ids.map((id) => ({ queryKey: businessKeys.services(id), queryFn: () => api.catalog.listBusinessServices(id) })),
  });

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + B.backTop, paddingBottom: insets.bottom + 24 }}>
        <View style={styles.inset}>
          <BackButton />
          <Text variant="h3" color="secondary" style={styles.title} accessibilityRole="header">
            Cart
          </Text>
          <View style={styles.divider} />
        </View>

        {ids.length === 0 ? (
          <View style={styles.empty}>
            <Image source={require('../../assets/images/cart-empty.png')} style={styles.illustration} contentFit="contain" accessible={false} />
            <Text variant="h4" color="secondary" align="center">
              Your cart is empty
            </Text>
            <Text variant="body14" weight="medium" color="secondaryTint2" align="center" style={styles.emptyNote}>
              Services you add at a business will wait here.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {ids.map((id, i) => {
              const biz = businesses[i]?.data;
              const picked = (services[i]?.data ?? []).filter((s) => carts.get(id)?.includes(s.id));
              const total = picked.reduce((sum, s) => sum + s.price_amount, 0);
              const count = carts.get(id)?.length ?? 0;
              return (
                <SwipeToRemove key={id} label={biz?.name ?? 'cart'} onRemove={() => serviceCart.clear(id)}>
                  {biz ? (
                    <CartRow
                      businessId={id}
                      name={biz.name}
                      logoUrl={biz.logo_url}
                      verified={biz.is_verified}
                      rating={Number(biz.rating_avg)}
                      area={areaOf(biz.locations)}
                      note={`${count} service${count === 1 ? '' : 's'}${picked.length ? ` · ${formatPrice(total)}` : ''}`}
                      onPress={() => router.push({ pathname: '/business/[slug]', params: { slug: biz.slug, tab: 'services' } })}
                    />
                  ) : (
                    <View style={styles.placeholder} />
                  )}
                </SwipeToRemove>
              );
            })}
            <Text variant="body12" color="secondaryTint3" align="center" style={styles.hint}>
              Swipe left on a cart to remove it.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const areaOf = (locations: { area: string | null; city: string; is_primary: boolean }[]) => {
  const l = locations.find((x) => x.is_primary) ?? locations[0];
  return l ? [l.area, l.city].filter(Boolean).join(', ') : null;
};

function CartRow(p: {
  businessId: string;
  name: string;
  logoUrl: string | null;
  verified: boolean;
  rating: number;
  area: string | null;
  note: string;
  onPress: () => void;
}) {
  const { distanceKm } = useBusinessLocation(p.businessId);
  return (
    <BusinessCard
      name={p.name}
      logoUrl={p.logoUrl}
      verified={p.verified}
      distanceKm={distanceKm}
      area={p.area}
      rating={p.rating}
      note={p.note}
      trailing={<Icon name="clock-outline" size={24} color="black" />}
      onPress={p.onPress}
      accessibilityLabel={`${p.name} cart, ${p.note}. Opens the business. Swipe left to remove.`}
    />
  );
}

/** Swipe a row left past the threshold to remove it (with an accessible remove action). */
function SwipeToRemove({ children, label, onRemove }: { children: ReactNode; label: string; onRemove: () => void }) {
  const x = useSharedValue(0);
  const confirm = () =>
    Alert.alert('Remove this cart?', `The services you picked at ${label} will be removed.`, [
      { text: 'Keep', style: 'cancel', onPress: () => x.set(withTiming(0)) },
      { text: 'Remove', style: 'destructive', onPress: onRemove },
    ]);
  const pan = usePanGesture({
    activeOffsetX: [-12, 12],
    failOffsetY: [-10, 10],
    onUpdate: (e) => {
      'worklet';
      x.set(Math.min(0, e.translationX));
    },
    onDeactivate: () => {
      'worklet';
      if (x.value < REMOVE_AT) scheduleOnRN(confirm);
      else x.set(withTiming(0));
    },
  });
  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View
      style={styles.swipe}
      accessibilityActions={[{ name: 'remove', label: 'Remove cart' }]}
      onAccessibilityAction={(e) => e.nativeEvent.actionName === 'remove' && confirm()}
    >
      <View style={styles.removeBehind}>
        <Icon name="trash" size={24} color="white" />
        <Text variant="body12" weight="bold" color="white">
          Remove
        </Text>
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View style={rowStyle}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  inset: {
    paddingHorizontal: B.inset,
  },
  title: {
    marginTop: B.backToTitle,
  },
  divider: {
    marginTop: B.dividerTop,
    height: 1,
    backgroundColor: colors.secondaryTint5,
  },
  list: {
    marginTop: B.listTopPushed,
    gap: B.cartGap,
  },
  swipe: {
    justifyContent: 'center',
  },
  removeBehind: {
    ...StyleSheet.absoluteFill,
    marginHorizontal: B.inset,
    borderRadius: B.card.radius,
    backgroundColor: colors.danger,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 24,
    gap: 2,
  },
  placeholder: {
    marginHorizontal: B.inset,
    height: B.card.height,
    borderRadius: B.card.radius,
    backgroundColor: colors.surface,
  },
  hint: {
    marginTop: 4,
  },
  empty: {
    marginTop: 200,
    alignItems: 'center',
    paddingHorizontal: 55,
  },
  illustration: {
    width: 172,
    height: 172,
    marginBottom: -8,
  },
  emptyNote: {
    marginTop: 14,
  },
});
