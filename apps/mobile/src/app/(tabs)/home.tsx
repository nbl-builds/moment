import { colors } from '@moment/shared';
import type { UseQueryResult } from '@tanstack/react-query';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, type ReactNode } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCollapsibleTabBarScroll, useTabBarContentInset } from '@/components/tab-bar';
import { useLoginSheet } from '@/features/auth/login-sheet-provider';
import { useSession } from '@/features/auth/use-session';
import { AreaTile } from '@/features/home/components/area-tile';
import { CategoryChip, hasCategoryChip } from '@/features/home/components/category-chip';
import { HomeHeader } from '@/features/home/components/home-header';
import { HostCard } from '@/features/home/components/host-card';
import { ListingCard } from '@/features/home/components/listing-card';
import { PromoCarousel } from '@/features/home/components/promo-carousel';
import { QuizCard } from '@/features/home/components/quiz-card';
import { Rail } from '@/features/home/components/rail';
import { RecommendCard } from '@/features/home/components/recommend-card';
import { SectionHeader } from '@/features/home/components/section-header';
import { Skeleton } from '@/features/home/components/skeleton';
import { HOME } from '@/features/home/layout';
import { useBucketList } from '@/features/home/use-bucket-list';
import { useHomeData, type ListingCardData } from '@/features/home/use-home-data';
import { OnboardingPermissions } from '@/features/permissions/onboarding-permissions';
import { EMPTY_FILTERS, encodeFilters, groupForCategorySlug } from '@/features/search/filters';
import type { SeeAllKey } from '@/features/see-all/sections';

const CARD = HOME.card;

/**
 * Home (Figma 13:1487 top, 17:1027 sections). Search and the bucket-list heart
 * stay pinned; the page scrolls under them and drives the floating tab bar.
 * After sign up the location and notification sheets show on top (`?permissions=1`).
 */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { permissions } = useLocalSearchParams<{ permissions?: string }>();
  const onScroll = useCollapsibleTabBarScroll();
  const bottomInset = useTabBarContentInset();
  const session = useSession();
  const { openLoginSheet } = useLoginSheet();
  const data = useHomeData();
  const bucket = useBucketList();

  const headerHeight = insets.top + HOME.headerTop + HOME.searchHeight + HOME.headerBottom / 2;
  const go = (href: Href) => router.push(href);
  const openListing = (listing: ListingCardData) => go({ pathname: '/listing/[id]', params: { id: listing.id } });
  // "More to explore" chips show Search Results for that category.
  const openCategory = (slug: string) => {
    const group = groupForCategorySlug(slug);
    go({ pathname: '/search-results', params: { filters: encodeFilters({ ...EMPTY_FILTERS, categoryGroups: group ? [group] : [] }) } });
  };
  const seeAll = (section: SeeAllKey) => () => go({ pathname: '/see-all/[section]', params: { section } });

  // Ask once: drop the flag so a reload does not show the sheets again.
  const onPermissionsFinished = useCallback(() => router.setParams({ permissions: undefined }), []);

  const renderCard = (item: ListingCardData, size: 'tall' | 'short') => (
    <ListingCard
      listing={item}
      size={size}
      distanceKm={data.distanceKm(item.id)}
      saved={bucket.isSaved(item.id)}
      onPress={() => openListing(item)}
      onToggleSaved={() => bucket.toggle(item.id)}
    />
  );

  const categories = (data.categories.data ?? []).filter(hasCategoryChip);

  return (
    <View style={styles.screen}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: headerHeight + HOME.headerBottom / 2, paddingBottom: bottomInset }}
        refreshControl={
          <RefreshControl refreshing={data.refreshing} onRefresh={data.refresh} progressViewOffset={headerHeight} />
        }
      >
        <PromoCarousel />
        <View style={styles.quiz}>
          <QuizCard onPress={() => go('/quiz')} />
        </View>

        <Section
          title="Popular activities"
          query={data.popular}
          onSeeAll={seeAll('popular')}
          skeleton={<CardSkeletons height={CARD.tall.height} />}
        >
          {(items) => (
            <Rail data={items} keyOf={(l) => l.id} renderItem={({ item }) => renderCard(item, 'tall')} itemWidth={CARD.width} gap={CARD.gap} accessibilityLabel="Popular activities" />
          )}
        </Section>

        <Section
          title="Top Hosts"
          query={data.hosts}
          onSeeAll={seeAll('hosts')}
          skeleton={<RowSkeletons width={HOME.host.tile} height={145} gap={HOME.host.gap} />}
        >
          {(hosts) => (
            <Rail
              data={hosts}
              keyOf={(h) => h.id}
              renderItem={({ item, index }) => (
                <HostCard host={item} index={index} onPress={() => go({ pathname: '/host/[id]', params: { id: item.id } })} />
              )}
              itemWidth={HOME.host.tile}
              gap={HOME.host.gap}
              accessibilityLabel="Top Hosts"
            />
          )}
        </Section>

        <Section
          title="Just for you"
          query={data.forYou}
          onSeeAll={seeAll('for-you')}
          skeleton={<CardSkeletons height={CARD.short.height} />}
        >
          {(items) => (
            <Rail data={items} keyOf={(l) => l.id} renderItem={({ item }) => renderCard(item, 'short')} itemWidth={CARD.width} gap={CARD.gap} accessibilityLabel="Just for you" />
          )}
        </Section>

        <Section
          title="More to explore"
          query={data.categories}
          items={categories}
          onSeeAll={seeAll('explore')}
          skeleton={<RowSkeletons width={100} height={65} gap={HOME.chip.gap} />}
        >
          {() => (
            <Rail
              data={categories}
              keyOf={(c) => c.id}
              renderItem={({ item }) => (
                <CategoryChip category={item} onPress={() => openCategory(item.slug)} />
              )}
              itemWidth={100}
              gap={HOME.chip.gap}
              accessibilityLabel="More to explore"
            />
          )}
        </Section>

        <Section title="Recently viewed" query={data.recent} onSeeAll={seeAll('recent')} skeleton={null}>
          {(items) => (
            <Rail data={items} keyOf={(l) => l.id} renderItem={({ item }) => renderCard(item, 'tall')} itemWidth={CARD.width} gap={CARD.gap} accessibilityLabel="Recently viewed" />
          )}
        </Section>

        <Section
          title="Local fun"
          query={data.localFun}
          onSeeAll={seeAll('local-fun')}
          skeleton={<RowSkeletons width={HOME.tile.width} height={HOME.tile.height} gap={HOME.tile.gap} />}
        >
          {(items) => (
            <Rail data={items} keyOf={(l) => l.id} renderItem={({ item }) => <AreaTile listing={item} onPress={() => openListing(item)} />} itemWidth={HOME.tile.width} gap={HOME.tile.gap} accessibilityLabel="Local fun" />
          )}
        </Section>

        <Section
          title="Must - trys"
          query={data.mustTry}
          onSeeAll={seeAll('must-try')}
          skeleton={<RowSkeletons width={HOME.tile.width} height={HOME.tile.height} gap={HOME.tile.gap} />}
        >
          {(items) => (
            <Rail data={items} keyOf={(l) => l.id} renderItem={({ item }) => <AreaTile listing={item} onPress={() => openListing(item)} />} itemWidth={HOME.tile.width} gap={HOME.tile.gap} accessibilityLabel="Must-trys" />
          )}
        </Section>

        <View style={styles.section}>
          <RecommendCard onPress={() => go('/recommend')} />
        </View>
      </Animated.ScrollView>

      {/* Pinned: search and the bucket-list heart stay while the page scrolls. */}
      <View style={[styles.header, { paddingTop: insets.top + HOME.headerTop, height: headerHeight }]}>
        <HomeHeader
          onSearch={() => go('/search')}
          onFilters={() => go('/filters')}
          onBucketList={() => (session ? go('/bucket-list') : openLoginSheet())}
        />
      </View>

      {permissions === '1' && <OnboardingPermissions onFinished={onPermissionsFinished} />}
    </View>
  );
}

interface SectionProps<T> {
  title: string;
  query: UseQueryResult<T[]>;
  /** Items to show when they differ from `query.data` (e.g. filtered). */
  items?: T[];
  onSeeAll?: () => void;
  noArrow?: boolean;
  /** Shown while loading; null shows nothing (e.g. a section that is often empty). */
  skeleton: ReactNode;
  children: (items: T[]) => ReactNode;
}

/** A Home section: header and content; skeleton while loading; hidden when empty or failed. */
function Section<T>({ title, query, items, onSeeAll, noArrow, skeleton, children }: SectionProps<T>) {
  if (query.isPending) {
    if (skeleton === null) return null;
    return (
      <View style={styles.section}>
        <SectionHeader title={title} />
        <View style={styles.content}>{skeleton}</View>
      </View>
    );
  }
  const shown = items ?? query.data ?? [];
  if (query.isError || shown.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionHeader title={title} onSeeAll={noArrow ? undefined : onSeeAll} />
      <View style={noArrow ? styles.contentNoArrow : styles.content}>{children(shown)}</View>
    </View>
  );
}

function CardSkeletons({ height }: { height: number }) {
  return (
    <View style={styles.skeletonRow}>
      <Skeleton width={CARD.width} height={height} radius={CARD.radius} />
      <Skeleton width={CARD.width} height={height} radius={CARD.radius} />
    </View>
  );
}

function RowSkeletons({ width, height, gap }: { width: number; height: number; gap: number }) {
  return (
    <View style={[styles.skeletonRow, { gap }]}>
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} width={width} height={height} radius={15} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.backgroundMuted,
  },
  quiz: {
    marginTop: HOME.promoToQuiz,
  },
  section: {
    marginTop: HOME.sectionGap,
  },
  content: {
    marginTop: HOME.headerToContent,
  },
  contentNoArrow: {
    marginTop: HOME.headerToContentNoArrow,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: CARD.gap,
    paddingHorizontal: HOME.inset,
    overflow: 'hidden',
  },
});
