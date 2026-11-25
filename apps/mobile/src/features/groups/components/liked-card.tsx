import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui';
import { PhotoCard } from '@/features/home/components/listing-card';
import type { GroupLike, Person } from '../queries';
import { AvatarStack } from './avatar-stack';

/**
 * "Liked by group" card (48:4500): the Home listing card (286 x 421) with
 * "Liked by" and the members' faces in place of the host and price.
 */
export function LikedCard({ like, people, onPress, saved, onToggleSaved }: { like: GroupLike; people: Person[]; onPress: () => void; saved: boolean; onToggleSaved: () => void }) {
  const l = like.listing;
  const b = like.business;
  const title = l?.title ?? b?.name ?? '';
  const rating = l ? (l.rating_count > 0 ? Number(l.rating_avg) : null) : b && b.rating_count > 0 ? Number(b.rating_avg) : null;
  return (
    <PhotoCard
      size="tall"
      photoUrl={l?.media[0]?.url ?? b?.cover_url}
      rating={rating}
      title={title}
      avatarUrl={null}
      withLine={null}
      subtitle={null}
      price=""
      priceNote=""
      accessibilityLabel={`${title}, liked by ${people.map((p) => p.display_name).join(', ')}`}
      onPress={onPress}
      saved={saved}
      onToggleSaved={onToggleSaved}
      footer={
        <View style={styles.footer}>
          <Text variant="subText10" color="secondaryTint2">
            Liked by
          </Text>
          <AvatarStack people={people} />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  footer: {
    gap: 6,
    paddingBottom: 10,
  },
});
