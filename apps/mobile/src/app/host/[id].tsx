import { colors, getZonedParts } from '@moment/shared';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton, Icon, Text } from '@/components/ui';
import { openListing } from '@/features/business/navigation';
import { ReportSheet } from '@/features/host/report-sheet';
import { ListingCard } from '@/features/home/components/listing-card';
import { HOME } from '@/features/home/layout';
import { useBucketList } from '@/features/home/use-bucket-list';
import type { ListingCardData } from '@/features/home/use-home-data';
import { ComingNext } from '@/features/placeholders/coming-next';
import { LANGUAGES } from '@/features/search/filters';
import { api } from '@/lib/api';

const INSET = 20;
const AVATAR = 100;
const COVER = 160;

type Tab = 'about' | 'listings';

/** Host Profile (48:4175 About, 48:4223 Listings). */
export default function HostProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const bucket = useBucketList();
  const host = useQuery({ queryKey: ['host', id], queryFn: () => api.catalog.getHost(id), enabled: Boolean(id) });
  const [tab, setTab] = useState<Tab>('about');
  const [reporting, setReporting] = useState(false);

  if (host.isPending) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.secondary} />
      </View>
    );
  }
  if (host.isError || !host.data) return <ComingNext title="Host Profile" note="This host isn’t available. Go back and try another one." />;

  const h = host.data;
  const cover = api.media.url(h.cover_url ?? h.business.cover_url);
  const avatar = api.media.url(h.avatar_url);
  const languages = h.languages.map((c) => LANGUAGES.find((l) => l.code === c)?.label ?? c).join(', ');
  const listings = h.listings.map((x) => x.listing).filter((l): l is ListingCardData => Boolean(l) && l!.type === 'experience');

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 30, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        <View style={styles.inset}>
          <BackButton />
          <View style={styles.titleRow}>
            <Text variant="h3" color="secondary" accessibilityRole="header">
              Host Profile
            </Text>
            <Pressable onPress={() => setReporting(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Report ${h.display_name}`}>
              <Icon name="flag" size={28} color="secondary" />
            </Pressable>
          </View>
          <View style={styles.divider} />

          <View style={styles.cover}>{cover && <Image source={cover} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />}</View>
          <View style={styles.avatar}>{avatar && <Image source={avatar} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={`${h.display_name}’s photo`} />}</View>

          <View style={styles.nameRow}>
            <Text variant="h3" weight="extrabold" color="secondary" numberOfLines={1} style={styles.name}>
              {h.display_name}
            </Text>
            {h.business.is_verified && <Icon name="verified" size={15} />}
          </View>
          <Text variant="subText16" color="secondaryTint3" align="center" style={styles.joined}>
            Joined in {getZonedParts(h.created_at).year}
          </Text>

          <View style={styles.segments} accessibilityRole="tablist">
            {(['about', 'listings'] as const).map((t) => {
              const selected = t === tab;
              return (
                <Pressable
                  key={t}
                  onPress={() => setTab(t)}
                  style={[styles.segment, selected && styles.segmentSelected]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                >
                  <Text variant={selected ? 'subText16' : 'subText14'} weight={selected ? 'bold' : 'regular'} color={selected ? 'secondary' : 'secondaryTint2'}>
                    {t === 'about' ? 'About' : `Listings${listings.length ? ` (${listings.length})` : ''}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {tab === 'about' ? (
          <View style={styles.about}>
            <Text variant="subText14" color="secondaryTint2">
              {h.bio || `${h.display_name} hosts with ${h.business.name} on Moment.`}
            </Text>
            {languages ? (
              <View style={styles.language}>
                <Icon name="languages" size={24} color="secondary" />
                <View style={styles.languageText}>
                  <Text variant="subText16" weight="bold" color="secondary">
                    Language
                  </Text>
                  <Text variant="subText14" color="secondaryTint2">
                    I Speak: {languages}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        ) : listings.length === 0 ? (
          <Text variant="body14" weight="medium" color="secondaryTint2" align="center" style={styles.empty}>
            {h.display_name} has no experiences to book right now.
          </Text>
        ) : (
          <FlatList
            horizontal
            data={listings}
            keyExtractor={(l) => l.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cards}
            snapToInterval={HOME.card.width + 10}
            decelerationRate="fast"
            renderItem={({ item }) => (
              <ListingCard
                listing={item}
                size="tall"
                saved={bucket.isSaved(item.id)}
                onPress={() => openListing(item)}
                onToggleSaved={() => bucket.toggle(item.id)}
              />
            )}
          />
        )}
      </ScrollView>
      <ReportSheet visible={reporting} hostId={h.id} hostName={h.display_name} onClose={() => setReporting(false)} />
    </View>
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
  inset: {
    paddingHorizontal: INSET,
  },
  titleRow: {
    marginTop: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  divider: {
    marginTop: 12,
    height: 1,
    backgroundColor: colors.chipBorder,
  },
  cover: {
    marginTop: 20,
    height: COVER,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: colors.secondaryTint6,
  },
  avatar: {
    marginTop: -36,
    alignSelf: 'center',
    width: AVATAR,
    height: AVATAR,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.white,
    overflow: 'hidden',
    backgroundColor: colors.secondaryTint5,
  },
  nameRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  name: {
    flexShrink: 1,
  },
  joined: {
    marginTop: 3,
  },
  segments: {
    marginTop: 16,
    height: 60,
    borderRadius: 15,
    backgroundColor: colors.surface,
    padding: 10,
    flexDirection: 'row',
    gap: 3,
  },
  segment: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: {
    backgroundColor: colors.secondaryTint6,
  },
  about: {
    marginTop: 16,
    marginHorizontal: INSET,
    padding: 15,
    borderRadius: 15,
    backgroundColor: colors.surface,
    gap: 20,
  },
  language: {
    flexDirection: 'row',
    gap: 10,
  },
  languageText: {
    flex: 1,
    gap: 4,
  },
  cards: {
    paddingTop: 16,
    paddingBottom: 30,
    paddingHorizontal: INSET,
    gap: 10,
  },
  empty: {
    marginTop: 40,
    marginHorizontal: 40,
  },
});
