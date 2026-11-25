import {
  CANCELLATION_POLICIES,
  colors,
  formatDistanceKm,
  formatDuration,
  formatPrice,
  parseEwkbPoint,
  type CancellationPolicyKey,
} from '@moment/shared';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapFallback } from '@/components/map-fallback';
import { Button, Icon, Text, type IconName } from '@/components/ui';
import { Card, SectionHeader } from '@/features/booking/components/card';
import { useListing } from '@/features/booking/queries';
import { bookingsLabel } from '@/features/business/components/business-header';
import { HeroCarousel } from '@/features/business/components/hero-carousel';
import { PhotoViewer } from '@/features/business/components/photo-viewer';
import { ReviewItem } from '@/features/business/components/review-item';
import { ShareSheet } from '@/features/business/components/share-sheet';
import { openHost } from '@/features/business/navigation';
import { BookBar } from '@/features/experience/book-bar';
import { MAPS_AVAILABLE } from '@/lib/env';
import { experienceLink } from '@/features/experience/links';
import { openInMaps } from '@/features/experience/maps';
import { PhotoGrid } from '@/features/experience/photo-grid';
import { ReadMore } from '@/features/experience/read-more';
import { Timeline } from '@/features/experience/timeline';
import { useBucketList } from '@/features/home/use-bucket-list';
import { recordListingView } from '@/features/home/recently-viewed';
import { useUserPlace } from '@/features/home/use-user-place';
import { MapPin } from '@/features/explore/map-pin';
import { ComingNext } from '@/features/placeholders/coming-next';
import { CATEGORY_GROUPS, LANGUAGES } from '@/features/search/filters';
import { api } from '@/lib/api';

const HERO = 555;
const SHEET_OVERLAP = 41;
const INSET = 20;

/** Experience details (48:3873 top, 48:6527 full page) with the sticky "Book me" bar. */
export default function ExperienceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listing = useListing(id);

  useEffect(() => {
    if (id) recordListingView(id).catch(() => undefined);
  }, [id]);

  if (listing.isPending) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.secondary} />
      </View>
    );
  }
  if (listing.isError || !listing.data) {
    return <ComingNext title="Experience" note="This experience isn’t available. Go back and try another one." />;
  }
  if (listing.data.type === 'service') {
    return <ComingNext title={listing.data.title} note={`Book this service on ${listing.data.business.name}’s page.`} />;
  }
  return <Experience listing={listing.data} />;
}

type Listing = NonNullable<ReturnType<typeof useListing>['data']>;

function Experience({ listing: l }: { listing: Listing }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { place } = useUserPlace();
  const bucket = useBucketList();
  const [viewer, setViewer] = useState<{ photos: string[]; index: number } | null>(null);
  const [sharing, setSharing] = useState(false);
  const pagerX = useSharedValue(0);
  const heroStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -pagerX.get() }] }));

  const photos = l.media.slice().sort((a, b) => a.sort_order - b.sort_order).map((m) => m.url);
  const host = l.staff.map((s) => s.staff).find((s) => s?.is_host) ?? null;
  const point = parseEwkbPoint(l.meeting_point as string | null);
  const distance = useQuery({
    queryKey: ['listing', l.id, 'distance', place.coords?.lat, place.coords?.lng],
    queryFn: () => api.catalog.listingDistances(place.coords as { lat: number; lng: number }, [l.id]),
    enabled: Boolean(place.coords),
  });
  const km = distance.data?.get(l.id);
  const reviews = useQuery({
    queryKey: ['listing', l.id, 'reviews', 2],
    queryFn: () => api.catalog.listReviews({ listingId: l.id }, { limit: 2 }),
  });

  const area = [l.location?.area, l.location?.city ?? l.city].filter(Boolean).join(', ');
  const bookings = bookingsLabel(l.booking_count);
  const group = CATEGORY_GROUPS.find((g) => g.slugs.includes(l.category?.slug ?? ''));
  const facts: { icon: IconName; label: string }[] = [
    { icon: 'pin-fill', label: l.city },
    l.category ? { icon: group?.icon ?? 'category-tours', label: l.category.name } : null,
    { icon: 'clock-outline', label: formatDuration(l.duration_minutes) },
    l.cuisine ? { icon: 'category-food', label: `Cuisine: ${l.cuisine}` } : { icon: 'users', label: `Up to ${l.max_guests} guests` },
  ].filter((f): f is { icon: IconName; label: string } => f !== null);
  const languages = (host?.languages?.length ? host.languages : l.languages)
    .map((code) => LANGUAGES.find((x) => x.code === code)?.label ?? code)
    .join(', ');
  const policy = CANCELLATION_POLICIES[l.cancellation_policy as CancellationPolicyKey];
  const saved = bucket.isSaved(l.id);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
        {/* Hero photos */}
        <View style={{ height: HERO, overflow: 'hidden' }}>
          <Animated.View style={[styles.heroRow, { width: width * Math.max(photos.length, 1) }, heroStyle]}>
            {photos.map((p, i) => (
              <HeroCarousel.Photo key={`${i}-${p}`} uri={p} width={width} height={HERO} />
            ))}
          </Animated.View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={StyleSheet.absoluteFill}
            onScroll={(e) => pagerX.set(e.nativeEvent.contentOffset.x)}
            scrollEventThrottle={16}
            accessibilityLabel={`Photos, ${photos.length}`}
          >
            {photos.map((p, i) => (
              <Pressable key={`${i}-${p}`} style={{ width, height: HERO }} onPress={() => setViewer({ photos, index: i })} accessibilityLabel={`Photo ${i + 1}`} />
            ))}
          </ScrollView>
          <View style={styles.dots} pointerEvents="none">
            <HeroCarousel.Dots count={photos.length} pagerX={pagerX} width={width} />
          </View>
          {/* Back, heart, share on the photos (scroll away with them) */}
          <View style={[styles.topButtons, { top: insets.top + 12 }]} pointerEvents="box-none">
            <RoundButton icon="chevron-left" label="Back" onPress={() => router.back()} />
            <View style={styles.topRight}>
              <RoundButton icon={saved ? 'heart-solid' : 'heart'} label={saved ? 'Saved to bucket list' : 'Save to bucket list'} onPress={() => bucket.toggle(l.id)} />
              <RoundButton icon="share" label="Share" onPress={() => setSharing(true)} />
            </View>
          </View>
        </View>

        <View style={styles.sheet}>
          {/* Title, area, distance, bookings, rating */}
          <Text variant="h3" color="secondary" accessibilityRole="header" style={styles.title}>
            {l.title}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              {area ? (
                <View style={styles.meta}>
                  <Icon name="pin-fill" size={18} color="secondary" />
                  <Text variant="body12" weight="medium" color="secondaryTint2" numberOfLines={1}>
                    {area}
                  </Text>
                </View>
              ) : null}
              {(km !== undefined || bookings) && (
                <View style={styles.meta}>
                  {km !== undefined && (
                    <>
                      <Icon name="location-fill" size={18} color="secondary" />
                      <Text variant="body12" weight="medium" color="secondaryTint2">
                        {formatDistanceKm(km)}
                      </Text>
                    </>
                  )}
                  {bookings && (
                    <Text variant="body12" weight="medium" color="secondaryTint2">
                      {km !== undefined ? '  •  ' : ''}
                      {bookings}
                    </Text>
                  )}
                </View>
              )}
            </View>
            {l.rating_count > 0 && (
              <View style={styles.rating} accessible accessibilityLabel={`Rated ${Number(l.rating_avg).toFixed(1)}`}>
                <Icon name="star" size={14} />
                <Text variant="subText12" weight="semibold" color="secondaryTint2">
                  {Number(l.rating_avg).toFixed(1)}
                </Text>
              </View>
            )}
          </View>

          {l.description ? <ReadMore text={l.description} style={styles.block} /> : null}

          {/* Facts */}
          <View style={styles.facts}>
            {facts.map((f) => (
              <View key={f.label} style={styles.fact}>
                <Icon name={f.icon} size={18} color="secondary" />
                <Text variant="body14" weight="medium" color="secondaryTint2" numberOfLines={1} style={styles.factText}>
                  {f.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {photos.length > 0 && (
          <>
            <PhotoGrid photos={photos} onOpen={(i) => setViewer({ photos, index: i })} />
            <Button
              label="View All Photos"
              variant="outline"
              style={styles.outline}
              onPress={() => router.push({ pathname: '/experience/[id]/photos', params: { id: l.id } })}
            />
          </>
        )}

        {l.highlights.length > 0 && (
          <Section title={`${l.highlights.length} Reasons to book this experience`}>
            <Bullets items={l.highlights} />
          </Section>
        )}

        {host && (
          <Section>
            <Pressable onPress={() => openHost(host)} accessibilityRole="button" accessibilityLabel={`Hosted by ${host.display_name}. Opens their profile`}>
              <View style={styles.hostPhoto}>
                {host.avatar_url && <Image source={api.media.url(host.avatar_url)} style={StyleSheet.absoluteFill} contentFit="cover" />}
              </View>
              <View style={styles.hostName}>
                <Text variant="h4" color="secondary">
                  Hosted by{' '}
                  <Text variant="h4" color="third">
                    {host.display_name}
                  </Text>
                </Text>
                {l.business.is_verified && <Icon name="verified" size={15} />}
              </View>
            </Pressable>
            {host.title && (
              <Text variant="body12" weight="bold" color="secondaryTint2" style={styles.tagline}>
                {host.title}
              </Text>
            )}
            {languages ? (
              <Text variant="subText12" weight="bold" color="secondary" style={styles.speaks}>
                I speak:{' '}
                <Text variant="subText12" weight="medium" color="secondary">
                  {languages}
                </Text>
              </Text>
            ) : null}
            {host.bio ? <ReadMore text={host.bio} lines={4} style={styles.block} /> : null}
          </Section>
        )}

        {l.itinerary.length > 0 && (
          <Section title="What you will be doing">
            <Timeline steps={l.itinerary} />
          </Section>
        )}

        <Section title="Where we will meet">
          <Text variant="body15" weight="medium" color="secondaryTint2" style={styles.blockSmall}>
            {l.meeting_point_notes ?? area}
          </Text>
          {point && (
            <Pressable
              onPress={() => openInMaps(l.title, point, l.meeting_point_notes)}
              style={styles.map}
              accessibilityRole="button"
              accessibilityLabel="Meeting point on the map. Opens maps"
            >
              {MAPS_AVAILABLE ? (
                <MapView
                  style={StyleSheet.absoluteFill}
                  initialRegion={{ latitude: point.lat, longitude: point.lng, latitudeDelta: 0.012, longitudeDelta: 0.012 }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                  pointerEvents="none"
                  userInterfaceStyle="light"
                  mapType={process.env.EXPO_OS === 'ios' ? 'mutedStandard' : 'standard'}
                  liteMode
                >
                  <Marker coordinate={{ latitude: point.lat, longitude: point.lng }} anchor={{ x: 0.5, y: 1 }}>
                    <MapPin />
                  </Marker>
                </MapView>
              ) : (
                <MapFallback hint="Tap to open in Maps" />
              )}
            </Pressable>
          )}
        </Section>

        {l.what_to_bring.length > 0 && (
          <Section title="What to bring">
            <Bullets items={l.what_to_bring} />
          </Section>
        )}
        <Button
          label="Contact Host"
          variant="outline"
          style={styles.outline}
          onPress={() => router.push({ pathname: '/chat/[businessId]', params: { businessId: l.business.id } })}
        />

        <Section title="Reviews">
          {reviews.isPending ? (
            <ActivityIndicator style={styles.blockSmall} color={colors.secondary} />
          ) : (reviews.data ?? []).length === 0 ? (
            <Text variant="body14" weight="medium" color="secondaryTint2" style={styles.blockSmall}>
              No reviews yet. Be the first after your visit.
            </Text>
          ) : (
            <View style={styles.reviews}>
              {(reviews.data ?? []).map((r) => (
                <ReviewItem key={r.id} review={r} onOpenPhoto={(p, i) => setViewer({ photos: p, index: i })} />
              ))}
            </View>
          )}
        </Section>
        {(reviews.data ?? []).length > 0 && (
          <Button
            label="View All Reviews"
            variant="outline"
            style={styles.outline}
            onPress={() => router.push({ pathname: '/experience/[id]/reviews', params: { id: l.id } })}
          />
        )}

        <Card style={styles.card}>
          <SectionHeader title="Cancellation" />
          <Text variant="body15" weight="medium" color="secondaryTint2" style={styles.cardBody}>
            {policy.summary}{' '}
            <Text
              variant="body15"
              weight="bold"
              color="secondary"
              style={styles.underline}
              onPress={() => Alert.alert('Cancellation policies', Object.values(CANCELLATION_POLICIES).map((p) => `${p.label}: ${p.summary}`).join('\n\n'))}
            >
              Learn more
            </Text>
          </Text>
        </Card>
        <Card style={styles.cardLast}>
          <SectionHeader title="Get support anytime" />
          <Text variant="body15" weight="medium" color="secondaryTint2" style={styles.cardBody}>
            If you need help, we’re available 24/7 from anywhere in the world.
          </Text>
          <Pressable onPress={() => router.push('/support')} style={styles.support} accessibilityRole="button" accessibilityLabel="Contact Moment Support">
            <Icon name="moment-mark" size={28} color="secondary" />
            <Text variant="subText12" weight="bold" color="black" style={styles.supportLabel}>
              Contact Moment Support
            </Text>
            <Icon name="chevron-small" size={18} color="black" style={styles.chevronRight} />
          </Pressable>
        </Card>
      </ScrollView>

      <BookBar
        price={formatPrice(l.price_amount, { currency: l.currency })}
        unit={l.price_unit === 'per_booking' ? 'Per Booking' : 'Per Person'}
        bottom={insets.bottom + 8}
        onBook={() => router.push({ pathname: '/booking/dates/[listingId]', params: { listingId: l.id } })}
      />

      <PhotoViewer photos={viewer?.photos ?? null} index={viewer?.index ?? 0} onClose={() => setViewer(null)} />
      <ShareSheet visible={sharing} onClose={() => setSharing(false)} title={`${l.title} on Moment`} url={experienceLink(l.id)} />
    </View>
  );
}

function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      {title && (
        <Text variant="h4" color="secondary" accessibilityRole="header">
          {title}
        </Text>
      )}
      {children}
    </View>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <View style={styles.bullets}>
      {items.map((t) => (
        <View key={t} style={styles.bullet}>
          <Text variant="body15" weight="medium" color="secondaryTint2">
            •
          </Text>
          <Text variant="body15" weight="medium" color="secondaryTint2" style={styles.bulletText}>
            {t}
          </Text>
        </View>
      ))}
    </View>
  );
}

function RoundButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.round, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={label}>
      <Icon name={icon} size={24} color="black" />
    </Pressable>
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
  },
  heroRow: {
    flexDirection: 'row',
  },
  dots: {
    position: 'absolute',
    bottom: 75,
    alignSelf: 'center',
  },
  sheet: {
    marginTop: -SHEET_OVERLAP,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: colors.backgroundMuted,
    paddingHorizontal: INSET,
    paddingTop: 16,
  },
  title: {
    paddingRight: 30,
  },
  metaRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  metaCol: {
    flex: 1,
    gap: 10,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  rating: {
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  block: {
    marginTop: 20,
  },
  blockSmall: {
    marginTop: 14,
  },
  facts: {
    marginTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 21,
  },
  fact: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingRight: 8,
  },
  factText: {
    flexShrink: 1,
  },
  // Figma: 1pt near-black outline (the component's outline is 2pt slate).
  outline: {
    marginTop: 30,
    marginHorizontal: INSET,
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: 12,
  },
  section: {
    marginTop: 26,
    marginHorizontal: INSET,
  },
  bullets: {
    marginTop: 18,
  },
  bullet: {
    flexDirection: 'row',
    gap: 8,
  },
  bulletText: {
    flex: 1,
  },
  hostPhoto: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.secondaryTint6,
  },
  hostName: {
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagline: {
    marginTop: 4,
  },
  speaks: {
    marginTop: 4,
  },
  map: {
    marginTop: 20,
    height: 166,
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: colors.secondaryTint6,
  },
  reviews: {
    marginTop: 20,
    gap: 20,
  },
  card: {
    marginTop: 26,
    marginHorizontal: INSET,
  },
  cardLast: {
    marginTop: 16,
    marginHorizontal: INSET,
  },
  cardBody: {
    marginTop: 12,
  },
  underline: {
    textDecorationLine: 'underline',
  },
  support: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  supportLabel: {
    flex: 1,
  },
  chevronRight: {
    transform: [{ rotate: '-90deg' }],
  },
  topButtons: {
    position: 'absolute',
    left: INSET,
    right: INSET,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topRight: {
    flexDirection: 'row',
    gap: 10,
  },
  round: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});
