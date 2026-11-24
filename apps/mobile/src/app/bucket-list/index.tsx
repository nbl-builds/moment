import { colors, formatShortDateTime } from '@moment/shared';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon, Text } from '@/components/ui';
import { ListThumbnail } from '@/features/bucket-list/components/list-thumbnail';
import { BUCKET } from '@/features/bucket-list/layout';
import { useBucketLists, type BucketListRow } from '@/features/bucket-list/queries';
import { Skeleton } from '@/features/home/components/skeleton';

const R = BUCKET.row;
// Figma: close 16pt below the status bar, title 30pt below it, rule 5pt below the title, first card 20pt below.
const GAP = { top: 16, closeToTitle: 30, titleToRule: 5, ruleToList: 20 } as const;

/**
 * Bucket List (Figma 22:2329 empty, 24:2071 lists). Opened from Home's heart
 * and Profile. Rows show the first item's photo and when the list was made.
 */
export default function BucketListScreen() {
  const insets = useSafeAreaInsets();
  const lists = useBucketLists();

  const header = (
    <View>
      <Pressable onPress={() => router.back()} hitSlop={10} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
        <Icon name="close" size={28} color="secondary" />
      </Pressable>
      <Text variant="h3" color="secondary" style={styles.title} accessibilityRole="header">
        Bucket List
      </Text>
      <View style={styles.rule} />
    </View>
  );

  const renderItem = ({ item }: { item: BucketListRow }) => (
    <Pressable
      onPress={() => router.push({ pathname: '/bucket-list/[id]', params: { id: item.id } })}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${item.itemCount} saved`}
    >
      <ListThumbnail url={item.thumbnailUrl} size={R.thumb} radius={R.thumbRadius} />
      <View style={styles.rowText}>
        <Text variant="h4" color="black" numberOfLines={1}>
          {item.name}
        </Text>
        <Text variant="body12" weight="medium" color="secondaryTint2" style={styles.date}>
          {formatShortDateTime(item.created_at)}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={lists.data ?? []}
        keyExtractor={(l) => l.id}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListHeaderComponentStyle={styles.headerGap}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + GAP.top, paddingBottom: insets.bottom + 24 }]}
        refreshing={lists.isRefetching}
        onRefresh={() => void lists.refetch()}
        ListEmptyComponent={
          lists.isPending ? (
            <View style={styles.skeletons}>
              <Skeleton width="100%" height={R.height} radius={R.radius} />
              <Skeleton width="100%" height={R.height} radius={R.radius} />
            </View>
          ) : lists.isError ? (
            <View style={styles.state}>
              <Text variant="h4" color="secondary" align="center">
                Couldn’t load your bucket list
              </Text>
              <Button label="Try again" size="small" variant="dark" onPress={() => void lists.refetch()} style={styles.retry} />
            </View>
          ) : (
            // Figma 22:2329: bucket mark, title and how to save.
            <View style={styles.empty}>
              <Image source={require('../../../assets/illustrations/bucket-list.svg')} style={styles.illustration} accessible={false} />
              <Text variant="h3" color="secondary" align="center" style={styles.emptyTitle}>
                Create your first bucket list
              </Text>
              <Text variant="body15" weight="medium" color="secondaryTint2" align="center" style={styles.emptyBody}>
                Tap the heart icon to save the activities and experiences you love on your bucket list.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

function Separator() {
  return <View style={{ height: R.gap }} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: BUCKET.inset,
  },
  close: {
    alignSelf: 'flex-start',
  },
  title: {
    marginTop: GAP.closeToTitle,
  },
  rule: {
    marginTop: GAP.titleToRule,
    height: 1,
    backgroundColor: colors.divider,
  },
  headerGap: {
    marginBottom: GAP.ruleToList,
  },
  // Figma: white 100pt card, 80pt thumbnail 10pt in, name (H4) 20pt after it.
  row: {
    height: R.height,
    borderRadius: R.radius,
    padding: R.padding,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.textGap,
  },
  pressed: {
    opacity: 0.85,
  },
  rowText: {
    flex: 1,
    alignSelf: 'flex-start',
    paddingTop: 7,
  },
  date: {
    marginTop: 11,
  },
  skeletons: {
    gap: R.gap,
  },
  state: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 14,
  },
  retry: {
    alignSelf: 'center',
  },
  // Figma: the empty state's icon sits at 387 of 926; centred in the space below the header.
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 120,
  },
  illustration: {
    width: BUCKET.illustration,
    height: BUCKET.illustration,
  },
  emptyTitle: {
    marginTop: 30,
  },
  emptyBody: {
    marginTop: 10,
    maxWidth: 308,
  },
});
