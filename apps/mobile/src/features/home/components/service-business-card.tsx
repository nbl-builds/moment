import { formatPrice } from '@moment/shared';
import { Text } from '@/components/ui';
import type { ServiceBusinessData } from '../use-home-data';
import { PhotoCard, type ListingCardProps } from './listing-card';

/**
 * "Services near you" card (17:1169 layout): the business's cover, rating,
 * heart (saves the business), distance, name, logo with category and area,
 * and the cheapest service as "From Rs X / starting price".
 */
export function ServiceBusinessCard({
  business,
  size,
  saved,
  onPress,
  onToggleSaved,
}: {
  business: ServiceBusinessData;
  size: ListingCardProps['size'];
  saved: boolean;
  onPress: () => void;
  onToggleSaved: () => void;
}) {
  const where = [business.area, business.city].filter(Boolean).join(', ');
  const price = `From ${formatPrice(business.from_price, { currency: business.currency })}`;
  return (
    <PhotoCard
      size={size}
      photoUrl={business.cover_url}
      rating={business.rating_count > 0 ? Number(business.rating_avg) : null}
      distanceKm={business.distance_km !== null ? Number(business.distance_km) : undefined}
      title={business.name}
      avatarUrl={business.logo_url}
      withLine={
        <Text variant="body14" weight="bold" color="third">
          {business.category_name}
        </Text>
      }
      subtitle={where || null}
      price={price}
      priceNote="starting price"
      accessibilityLabel={`${business.name}, ${business.category_name}${where ? `, ${where}` : ''}, ${price}`}
      onPress={onPress}
      saved={saved}
      onToggleSaved={onToggleSaved}
    />
  );
}
