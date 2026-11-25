import type { Enums } from '@moment/shared';
import type { IconName } from '@/components/ui';

export type BookingStatus = Enums<'booking_status'>;

/** Reservation details title and icon by status (47:6385, 52:9299, 47:6493). */
export function statusMeta(status: BookingStatus): { title: string; icon: IconName | null; cancelled: boolean } {
  switch (status) {
    case 'pending':
      return { title: 'Reservation pending', icon: 'status-pending', cancelled: false };
    case 'confirmed':
      return { title: 'Reservation confirmed', icon: 'status-confirmed', cancelled: false };
    case 'completed':
      return { title: 'Reservation completed', icon: 'status-completed', cancelled: false };
    case 'no_show':
      return { title: 'Missed reservation', icon: null, cancelled: true };
    default:
      return { title: 'Reservation cancelled', icon: 'x-circle', cancelled: true };
  }
}

/** Short status for list rows ("Confirmed", "Cancelled by business"). */
export function statusLabel(status: BookingStatus): string {
  return {
    pending: 'Pending',
    confirmed: 'Confirmed',
    completed: 'Completed',
    cancelled_by_consumer: 'Cancelled',
    cancelled_by_business: 'Cancelled by business',
    no_show: 'Missed',
  }[status];
}

export const isActive = (status: BookingStatus) => status === 'pending' || status === 'confirmed';
