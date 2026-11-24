import { useLocalSearchParams } from 'expo-router';
import { ComingNext } from '@/features/placeholders/coming-next';

/**
 * Booking Flow placeholder. Gets `businessId` with `services` (comma-separated
 * service ids from the cart) or `planId` (Apply Membership). Built with section 3.
 */
export default function BookingPlaceholder() {
  const { services, planId } = useLocalSearchParams<{ businessId?: string; services?: string; planId?: string }>();
  const count = services ? services.split(',').filter(Boolean).length : 0;
  const note = planId
    ? 'Applying for this membership comes with the booking flow.'
    : `Booking ${count} service${count === 1 ? '' : 's'} comes with the booking flow.`;
  return <ComingNext title="Booking" note={note} />;
}
