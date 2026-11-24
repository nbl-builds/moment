import { colors } from '@moment/shared';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Icon, Text } from '@/components/ui';
import { api } from '@/lib/api';
import { BIZ } from '../layout';
import type { BusinessReview } from '../queries';

const R = BIZ.review;

/** "2 days ago", "3 weeks ago", ... */
export function timeAgo(iso: string, now = Date.now()) {
  const days = Math.floor((now - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${days < 14 ? '' : 's'} ago`;
  if (days < 365) return `${Math.floor(days / 30)} month${days < 60 ? '' : 's'} ago`;
  return `${Math.floor(days / 365)} year${days < 730 ? '' : 's'} ago`;
}

/** A review (47:2080): avatar, name, date, text, stars with the score and a photo strip. */
export function ReviewItem({ review, onOpenPhoto }: { review: BusinessReview; onOpenPhoto: (photos: string[], index: number) => void }) {
  const avatar = api.media.url(review.author?.avatar_url);
  const name = review.author?.display_name ?? 'Moment guest';
  return (
    <View style={styles.item}>
      <View style={styles.row}>
        <View style={styles.avatar}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
          ) : (
            <Text variant="body18" weight="bold" color="secondary">
              {name.charAt(0)}
            </Text>
          )}
        </View>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text variant="subText16" weight="bold" color="secondary" numberOfLines={1} style={styles.name}>
              {name}
            </Text>
            <Text variant="subText12" color="blackTint1">
              {timeAgo(review.created_at)}
            </Text>
          </View>
          {review.body && (
            <Text variant="subText12" color="secondaryTint2" style={styles.text}>
              {review.body}
            </Text>
          )}
          <View style={styles.stars} accessible accessibilityLabel={`${review.rating} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Icon key={n} name={n <= review.rating ? 'star' : 'star-rate-empty'} size={14} />
            ))}
            <Text variant="subText12" weight="semibold" color="blackTint1">
              {review.rating.toFixed(1)}
            </Text>
          </View>
        </View>
      </View>
      {review.photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos} style={styles.photoStrip}>
          {review.photos.map((photo, i) => (
            <Pressable
              key={`${i}-${photo}`}
              onPress={() => onOpenPhoto(review.photos, i)}
              accessibilityRole="imagebutton"
              accessibilityLabel={`Photo ${i + 1} of ${review.photos.length} from ${name}`}
            >
              <Image source={{ uri: api.media.url(photo) ?? undefined }} style={styles.photo} contentFit="cover" />
            </Pressable>
          ))}
        </ScrollView>
      )}
      {review.business_reply && (
        <View style={styles.reply}>
          <Text variant="subText12" weight="bold" color="secondary">
            Reply from the business
          </Text>
          <Text variant="subText12" color="secondaryTint2">
            {review.business_reply}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Figma: items on the page background, 14pt above and below a hairline.
  item: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: BIZ.inset,
  },
  avatar: {
    width: R.avatar,
    height: R.avatar,
    borderRadius: R.avatarRadius,
    overflow: 'hidden',
    backgroundColor: colors.primaryTint6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flex: 1,
  },
  text: {
    marginTop: 8,
  },
  stars: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  photoStrip: {
    marginTop: 15,
  },
  photos: {
    paddingHorizontal: BIZ.inset,
    gap: R.photo.gap,
  },
  photo: {
    width: R.photo.width,
    height: R.photo.height,
    borderRadius: R.photo.radius,
    backgroundColor: colors.secondaryTint6,
  },
  reply: {
    marginTop: 12,
    marginLeft: BIZ.inset + R.avatar + 10,
    marginRight: BIZ.inset,
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.white,
    gap: 2,
  },
});
