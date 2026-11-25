import { colors } from '@moment/shared';
import { useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button, Icon, Text } from '@/components/ui';
import { useLoginSheet } from '@/features/auth/login-sheet-provider';
import { useSession } from '@/features/auth/use-session';
import { useBucketSheets } from '@/features/bucket-list/bucket-sheets';
import { useSavedListings } from '@/features/bucket-list/queries';
import { AboutSection } from '@/features/business/components/about-section';
import { BusinessHeader, businessAddress } from '@/features/business/components/business-header';
import { CartBar } from '@/features/business/components/cart-bar';
import { FilterChips } from '@/features/business/components/filter-chips';
import { HeroCarousel } from '@/features/business/components/hero-carousel';
import { PhotoViewer } from '@/features/business/components/photo-viewer';
import { PlanCard } from '@/features/business/components/plan-card';
import { ReviewItem } from '@/features/business/components/review-item';
import { ServiceCard } from '@/features/business/components/service-card';
import { ShareSheet } from '@/features/business/components/share-sheet';
import { TabPills, type BusinessTab } from '@/features/business/components/tab-pills';
import { serviceCart, useServiceCart } from '@/features/business/cart';
import { BIZ } from '@/features/business/layout';
import {
  useBusiness,
  useBusinessLocation,
  useBusinessPopular,
  useBusinessReviews,
  useBusinessServices,
  useReviewableBookings,
  useReviewStats,
  type Business,
} from '@/features/business/queries';
import { Skeleton } from '@/features/home/components/skeleton';

/** Figma frames include a 44pt status bar; on device we use the real inset. */
const FRAME_STATUS = 44;

/** Link to a business (opening it in the app is wired later). */
export const businessLink = (slug: string) => `moment://business/${slug}`;

/** Opens the address in Apple Maps / Google Maps. */
function openInMaps(business: Business, point: { lat: number; lng: number } | null) {
  const label = encodeURIComponent(business.name);
  const address = encodeURIComponent(businessAddress(business) ?? business.name);
  const url = point
    ? Platform.select({
        ios: `http://maps.apple.com/?ll=${point.lat},${point.lng}&q=${label}`,
        default: `geo:${point.lat},${point.lng}?q=${point.lat},${point.lng}(${label})`,
      })
    : Platform.select({ ios: `http://maps.apple.com/?q=${address}`, default: `geo:0,0?q=${address}` });
  void Linking.openURL(url);
}

/**
 * Business page (Figma "Business Look" 25:2265 ... 47:3245).
 *
 * The page is one scroll view starting at the expanded panel's top edge. Its
 * transparent top area shows the hero behind it (and swipes the photos);
 * scrolling up slides the panel over the hero, snapping between collapsed and
 * expanded, after which the tabs stay pinned (sticky) and the content scrolls.
 */
export default function BusinessScreen() {
  /** `tab=services`: the Cart opens the business on its Services tab, with the saved cart. */
  const { slug, tab: startTab } = useLocalSearchParams<{ slug: string; tab?: string }>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const session = useSession();
  const { openLoginSheet } = useLoginSheet();
  const bucket = useBucketSheets();
  const saved = useSavedListings();

  const business = useBusiness(slug);
  const biz = business.data;
  const location = useBusinessLocation(biz?.id);
  const services = useBusinessServices(biz?.id);
  const popular = useBusinessPopular(biz?.id);
  const cart = useServiceCart(biz?.id);
  const reviewable = useReviewableBookings(biz?.id);

  const [tab, setTab] = useState<BusinessTab>(startTab === 'services' ? 'Services' : 'Popular');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const reviews = useBusinessReviews(biz?.id, ratingFilter);
  const stats = useReviewStats(biz?.id);
  const [viewer, setViewer] = useState<{ photos: string[]; index: number } | null>(null);
  const [sheet, setSheet] = useState<'share' | 'not-eligible' | null>(null);

  // Geometry: the scroll view starts where the expanded panel's top is.
  const offset = insets.top - FRAME_STATUS;
  const expandedTop = BIZ.panelExpanded + offset;
  const collapsedTop = BIZ.panelCollapsed + offset;
  const heroHeight = BIZ.heroHeight + offset;
  const spacer = collapsedTop - expandedTop;
  /** Scroll offset where the tabs pin (measured from the layout). */
  const [pinAt, setPinAt] = useState(spacer + 160);

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });
  const pagerRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const pagerX = useSharedValue(0);

  // Hero: stays put while the panel slides over it, then dims (47:1697).
  const heroStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -pagerX.get() }] }));
  const dimStyle = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.get(), [0, pinAt], [0, 1], Extrapolation.CLAMP) }));
  const dotsStyle = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.get(), [0, 40], [1, 0], Extrapolation.CLAMP) }));
  // The pinned handle (pointing down) shows once the tabs are pinned.
  const pinnedHandleStyle = useAnimatedStyle(() => ({ opacity: scrollY.get() >= pinAt - 2 ? 1 : 0 }));

  const expanded = () => scrollRef.current?.scrollTo({ y: pinAt, animated: !reduceMotion });
  const collapse = () => scrollRef.current?.scrollTo({ y: 0, animated: !reduceMotion });

  const photos = useMemo(() => {
    const list = (biz?.photos ?? []).map((p) => p.url);
    return list.length ? list : biz?.cover_url ? [biz.cover_url] : [];
  }, [biz]);

  const bookings = (popular.data ?? []).reduce((sum, l) => sum + l.booking_count, 0);
  const serviceById = new Map((services.data ?? []).map((s) => [s.id, s]));
  const cartTotal = cart.reduce((sum, id) => sum + (serviceById.get(id)?.price_amount ?? 0), 0);
  const currency = biz?.currency ?? 'PKR';

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of services.data ?? []) if (s.category && !seen.has(s.category.slug)) seen.set(s.category.slug, s.category.name);
    return [...seen].map(([value, label]) => ({ value, label }));
  }, [services.data]);
  const shownServices = (services.data ?? []).filter((s) => serviceFilter === 'all' || s.category?.slug === serviceFilter);
  const serviceHeading = serviceFilter === 'all' ? 'All Services' : (categories.find((c) => c.value === serviceFilter)?.label ?? 'Services');

  const openListing = (id: string) => router.push({ pathname: '/listing/[id]', params: { id } });
  const toggleCart = (serviceId: string) => biz && serviceCart.toggle(biz.id, serviceId);
  const continueToBooking = () =>
    biz && router.push({ pathname: '/booking/new', params: { businessId: biz.id, services: cart.join(',') } });

  const writeReview = () => {
    if (!session) {
      openLoginSheet();
      return;
    }
    if (!reviewable.data?.length) {
      setSheet('not-eligible');
      return;
    }
    router.push({ pathname: '/business/[slug]/review', params: { slug } });
  };

  // Back from "Write a review": refresh the reviews, rating and stats.
  const firstFocus = useRef(true);
  const businessId = biz?.id;
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      if (businessId) {
        void queryClient.invalidateQueries({ queryKey: ['business', businessId] });
        void queryClient.invalidateQueries({ queryKey: ['business', slug] });
      }
    }, [businessId, slug, queryClient]),
  );

  const switchTab = (next: BusinessTab) => {
    setTab(next);
    // Keep the tabs where they are: if pinned, show the new tab from its top.
    if (scrollY.get() > pinAt) scrollRef.current?.scrollTo({ y: pinAt, animated: false });
  };

  if (business.isPending) {
    return (
      <View style={styles.screen}>
        <Skeleton width="100%" height={heroHeight} radius={0} />
        <View style={styles.loadingPanel}>
          <Skeleton width={200} height={24} radius={6} />
          <Skeleton width={280} height={16} radius={6} />
          <Skeleton width="100%" height={BIZ.card.height} radius={BIZ.card.radius} />
        </View>
      </View>
    );
  }
  if (business.isError || !biz) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <Text variant="h4" color="secondary" align="center">
          Couldn’t load this business
        </Text>
        <View style={styles.errorButtons}>
          <Button label="Try again" size="small" variant="dark" onPress={() => void business.refetch()} />
          <Button label="Go back" size="small" variant="ghost" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  const tabContent = () => {
    switch (tab) {
      case 'Popular':
        return (
          <View>
            <SectionTitle title="Popular" subtitle="Most booked right now." />
            <CardList loading={popular.isPending} empty="Nothing booked here yet.">
              {(popular.data ?? []).map((l) => (
                <ServiceCard
                  key={l.id}
                  title={l.title}
                  photo={l.media[0]?.url}
                  bookings={l.booking_count}
                  price={l.price_amount}
                  currency={l.currency}
                  onPress={() => openListing(l.id)}
                  inCart={cart.includes(l.id)}
                  onToggleCart={l.type === 'service' ? () => toggleCart(l.id) : undefined}
                />
              ))}
            </CardList>
          </View>
        );
      case 'Services':
        return (
          <View>
            {categories.length > 1 && (
              <View style={styles.chips}>
                <FilterChips chips={[{ value: 'all', label: 'All Services' }, ...categories]} value={serviceFilter} onChange={setServiceFilter} />
              </View>
            )}
            <SectionTitle title={serviceHeading} subtitle="Most booked right now." />
            <CardList loading={services.isPending} empty="No services to book yet.">
              {shownServices.map((s) => (
                <ServiceCard
                  key={s.id}
                  title={s.title}
                  photo={s.media[0]?.url}
                  bookings={s.booking_count}
                  price={s.price_amount}
                  currency={s.currency}
                  onPress={() => openListing(s.id)}
                  inCart={cart.includes(s.id)}
                  onToggleCart={() => toggleCart(s.id)}
                />
              ))}
            </CardList>
          </View>
        );
      case 'Membership':
        return (
          <View style={styles.cards}>
            {biz.plans.length === 0 ? (
              <EmptyText text="No memberships yet." />
            ) : (
              biz.plans.map((plan, i) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  currency={plan.currency}
                  photo={photos.length ? (photos[(i + 1) % photos.length] ?? null) : null}
                  onPress={() => router.push({ pathname: '/membership/[id]', params: { id: plan.id } })}
                />
              ))
            )}
          </View>
        );
      case 'Reviews': {
        const counts = stats.data?.counts;
        const chips = [
          { value: null, label: 'All Ratings' },
          ...[5, 4, 3, 2, 1].filter((n) => (counts?.[n as 1] ?? 0) > 0).map((n) => ({ value: n, label: `${n} Star${n === 1 ? '' : 's'} (${counts?.[n as 1] ?? 0})` })),
        ];
        return (
          <View>
            <SectionTitle title="Reviews" subtitle="What other customers are saying" />
            <View style={styles.chips}>
              <FilterChips chips={chips} value={ratingFilter} onChange={setRatingFilter} />
            </View>
            <Pressable onPress={writeReview} style={({ pressed }) => [styles.writeCard, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Write a review. Tap to share your thoughts with other customers">
              <Icon name="file-signature" size={32} color="black" />
              <View style={styles.writeText}>
                <Text variant="subText16" weight="bold" color="secondary">
                  Write a review
                </Text>
                <Text variant="subText12" color="secondaryTint2" numberOfLines={1}>
                  Tap to share your thoughts with other customers
                </Text>
              </View>
            </Pressable>
            <View style={styles.reviews}>
              {reviews.isPending ? (
                <View style={styles.cards}>
                  <Skeleton width="100%" height={90} radius={10} />
                </View>
              ) : (reviews.data ?? []).length === 0 ? (
                <EmptyText text={ratingFilter ? 'No reviews with this rating.' : 'No reviews yet. Be the first after your visit.'} />
              ) : (
                (reviews.data ?? []).map((r) => <ReviewItem key={r.id} review={r} onOpenPhoto={(p, i) => setViewer({ photos: p, index: i })} />)
              )}
            </View>
          </View>
        );
      }
      case 'About':
        return <AboutSection description={biz.description} point={location.point} onOpenMap={() => openInMaps(biz, location.point)} />;
    }
  };

  return (
    <View style={styles.screen}>
      {/* Hero photos, fixed behind the panel */}
      <View style={[styles.hero, { height: heroHeight }]}>
        <Animated.View style={[styles.heroRow, { width: width * Math.max(photos.length, 1) }, heroStyle]}>
          {photos.length ? (
            photos.map((p, i) => <HeroCarousel.Photo key={`${i}-${p}`} uri={p} width={width} height={heroHeight} />)
          ) : (
            <View style={{ width, height: heroHeight, backgroundColor: colors.secondaryTint5 }} />
          )}
        </Animated.View>
        <Animated.View style={[styles.dots, dotsStyle]} pointerEvents="none">
          <HeroCarousel.Dots count={photos.length} pagerX={pagerX} width={width} />
        </Animated.View>
      </View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.dim, dimStyle]} pointerEvents="none" />

      <Animated.ScrollView
        ref={scrollRef}
        style={[styles.scroll, { top: expandedTop }]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        stickyHeaderIndices={[2]}
        snapToOffsets={[0, pinAt]}
        snapToEnd={false}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + (cart.length ? BIZ.cart.height + 40 : 40) }}
      >
        {/* 0: see-through area over the hero; swipes the photos */}
        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => pagerX.set(e.nativeEvent.contentOffset.x)}
          style={{ height: spacer }}
          accessibilityLabel={`Photos of ${biz.name}`}
        >
          {(photos.length ? photos : ['']).map((p, i) => (
            <View key={`${i}-${p}`} style={{ width, height: spacer }} />
          ))}
        </ScrollView>

        {/* 1: panel top: handle, logo, name, address, meta */}
        <View style={styles.panelTop}>
          <Pressable onPress={expanded} hitSlop={12} style={styles.handle} accessibilityRole="button" accessibilityLabel="Show more">
            <Icon name="handle-chevron" size={24} color="secondaryTint3" />
          </Pressable>
          <View style={styles.inset}>
            <BusinessHeader business={biz} distanceKm={location.distanceKm} bookings={bookings} onAddress={() => openInMaps(biz, location.point)} />
          </View>
        </View>

        {/* 2: pinned when expanded: handle (pointing down), tabs, divider */}
        <View style={styles.tabsBlock} onLayout={(e) => setPinAt(e.nativeEvent.layout.y)}>
          <Animated.View style={[styles.pinnedHandle, pinnedHandleStyle]}>
            <Pressable onPress={collapse} hitSlop={12} accessibilityRole="button" accessibilityLabel="Show less">
              <Icon name="handle-chevron" size={24} color="secondaryTint3" style={styles.down} />
            </Pressable>
          </Animated.View>
          <TabPills value={tab} onChange={switchTab} />
          <View style={styles.divider} />
        </View>

        {/* 3: tab content; tall enough that the panel can always expand */}
        <View style={[styles.content, { minHeight: height }]}>{tabContent()}</View>
      </Animated.ScrollView>

      {/* Top buttons stay above everything */}
      <View style={[styles.topButtons, { top: insets.top + BIZ.topButton.top }]} pointerEvents="box-none">
        <TopButton icon="chevron-left" label="Back" onPress={() => router.back()} />
        <View style={styles.topRight}>
          <TopButton
            icon={saved.isTargetSaved({ kind: 'business', id: biz.id }) ? 'heart-solid' : 'heart'}
            label={saved.isTargetSaved({ kind: 'business', id: biz.id }) ? 'Saved to your bucket list' : 'Save to bucket list'}
            onPress={() => bucket.openForBusiness(biz.id)}
            tint={saved.isTargetSaved({ kind: 'business', id: biz.id }) ? 'error' : 'black'}
          />
          <TopButton icon="share" label="Share" onPress={() => setSheet('share')} />
        </View>
      </View>

      {cart.length > 0 && (
        <CartBar
          total={cartTotal}
          count={cart.length}
          currency={currency}
          bottom={insets.bottom + BIZ.cart.bottomGap}
          onClear={() => serviceCart.clear(biz.id)}
          onContinue={continueToBooking}
        />
      )}

      <ShareSheet visible={sheet === 'share'} onClose={() => setSheet(null)} title={`${biz.name} on Moment`} url={businessLink(biz.slug)} />

      <BottomSheet visible={sheet === 'not-eligible'} onRequestClose={() => setSheet(null)} accessibilityLabel="You can review after your visit" backgroundColor={colors.backgroundMuted}>
        <View style={[styles.notEligible, { paddingBottom: insets.bottom + 18 }]}>
          <Text variant="h4" color="secondary" align="center">
            You can review after your visit
          </Text>
          <Text variant="body15" weight="medium" color="secondaryTint2" align="center" style={styles.notEligibleBody}>
            Reviews come from customers who booked {biz.name} through Moment, so everyone can trust them.
          </Text>
          <Button label="Got it" onPress={() => setSheet(null)} style={styles.notEligibleButton} />
        </View>
      </BottomSheet>

      <PhotoViewer photos={viewer?.photos ?? null} index={viewer?.index ?? 0} onClose={() => setViewer(null)} />
    </View>
  );
}

function TopButton({ icon, label, onPress, tint = 'black' }: { icon: 'chevron-left' | 'heart' | 'heart-solid' | 'share'; label: string; onPress: () => void; tint?: 'black' | 'error' }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.topButton, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={label}>
      <Icon name={icon} size={24} color={tint} />
    </Pressable>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.sectionTitle}>
      <Text variant="h4" color="secondary" accessibilityRole="header">
        {title}
      </Text>
      <Text variant="subText12" color="secondaryTint2">
        {subtitle}
      </Text>
    </View>
  );
}

function CardList({ loading, empty, children }: { loading: boolean; empty: string; children: React.ReactNode[] }) {
  if (loading) {
    return (
      <View style={styles.cards}>
        <Skeleton width="100%" height={BIZ.card.height} radius={BIZ.card.radius} />
        <Skeleton width="100%" height={BIZ.card.height} radius={BIZ.card.radius} />
      </View>
    );
  }
  if (children.length === 0) return <EmptyText text={empty} />;
  return <View style={styles.cards}>{children}</View>;
}

function EmptyText({ text }: { text: string }) {
  return (
    <Text variant="body14" color="secondaryTint2" align="center" style={styles.empty}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  errorButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  loadingPanel: {
    marginTop: -46,
    borderTopLeftRadius: BIZ.panelRadius,
    borderTopRightRadius: BIZ.panelRadius,
    backgroundColor: colors.backgroundMuted,
    padding: BIZ.inset,
    gap: 14,
  },
  hero: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  heroRow: {
    flexDirection: 'row',
  },
  dots: {
    position: 'absolute',
    bottom: BIZ.dots.bottom,
    alignSelf: 'center',
  },
  dim: {
    backgroundColor: colors.scrim,
  },
  scroll: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  panelTop: {
    backgroundColor: colors.backgroundMuted,
    borderTopLeftRadius: BIZ.panelRadius,
    borderTopRightRadius: BIZ.panelRadius,
    paddingTop: 2,
  },
  handle: {
    alignSelf: 'center',
    marginTop: 2,
  },
  inset: {
    paddingHorizontal: BIZ.inset,
  },
  tabsBlock: {
    backgroundColor: colors.backgroundMuted,
    borderTopLeftRadius: BIZ.panelRadius,
    borderTopRightRadius: BIZ.panelRadius,
  },
  pinnedHandle: {
    height: BIZ.pinnedTabsTop,
    alignItems: 'center',
    justifyContent: 'center',
  },
  down: {
    transform: [{ rotate: '180deg' }],
  },
  divider: {
    marginTop: BIZ.tabs.dividerGap,
    marginHorizontal: BIZ.inset,
    height: 1,
    backgroundColor: colors.chipBorder,
  },
  content: {
    backgroundColor: colors.backgroundMuted,
    paddingTop: BIZ.tabs.contentGap,
  },
  sectionTitle: {
    paddingHorizontal: BIZ.inset,
    gap: 4,
    marginBottom: 20,
  },
  chips: {
    marginBottom: 18,
  },
  cards: {
    paddingHorizontal: BIZ.inset,
    gap: BIZ.card.gap,
  },
  empty: {
    paddingVertical: 30,
    paddingHorizontal: 40,
  },
  writeCard: {
    marginHorizontal: BIZ.inset,
    height: 60,
    borderRadius: 15,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    gap: 17,
  },
  writeText: {
    flex: 1,
    paddingRight: 12,
  },
  reviews: {
    marginTop: 16,
  },
  topButtons: {
    position: 'absolute',
    left: BIZ.inset,
    right: BIZ.inset,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topRight: {
    flexDirection: 'row',
    gap: 10,
  },
  topButton: {
    width: BIZ.topButton.size,
    height: BIZ.topButton.size,
    borderRadius: BIZ.topButton.radius,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  notEligible: {
    paddingTop: 28,
    paddingHorizontal: BIZ.inset,
  },
  notEligibleBody: {
    marginTop: 10,
  },
  notEligibleButton: {
    marginTop: 28,
  },
});
