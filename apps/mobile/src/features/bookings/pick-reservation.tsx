import { router } from 'expo-router';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { PickReservationSheet } from './components/pick-reservation-sheet';
import type { BookingRow } from './queries';

const PickContext = createContext<((bookings: BookingRow[]) => void) | null>(null);

/**
 * Hosts the "pick a reservation" sheet above the tab bar (mounted in the tabs
 * layout, after <Tabs>). Opening with one booking goes straight to it.
 */
export function PickReservationProvider({ children }: { children: ReactNode }) {
  const [bookings, setBookings] = useState<BookingRow[] | null>(null);
  const open = useMemo(
    () => (list: BookingRow[]) => {
      if (list.length === 1 && list[0]) router.push({ pathname: '/reservation/[id]', params: { id: list[0].id } });
      else if (list.length > 1) setBookings(list);
    },
    [],
  );
  return (
    <PickContext.Provider value={open}>
      {children}
      <PickReservationSheet
        bookings={bookings}
        onPick={(b) => {
          setBookings(null);
          router.push({ pathname: '/reservation/[id]', params: { id: b.id } });
        }}
        onClose={() => setBookings(null)}
      />
    </PickContext.Provider>
  );
}

export function usePickReservation() {
  const open = useContext(PickContext);
  if (!open) throw new Error('usePickReservation must be used inside PickReservationProvider');
  return open;
}
