import { nearestLaunchCity, type LaunchCity } from '@moment/shared';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useMyProfile } from '@/features/auth/use-session';

const LOCATION_TIMEOUT_MS = 3000;

export interface UserPlace {
  /** Device location, only when the user allowed it (never asks here). */
  coords: { lat: number; lng: number } | null;
  /** Profile home city, else the launch city the device is in, else null (all cities). */
  city: LaunchCity | string | null;
}

/** Where the user is, for distances and city rails. Reads location only if already allowed. */
export function useUserPlace(): { place: UserPlace; ready: boolean } {
  const { data: me, isLoading: profileLoading } = useMyProfile();

  const location = useQuery({
    queryKey: ['device-location'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) return null;
      // Home never waits long for a fix: without one, rails show all cities and no distances.
      const position = await Promise.race([
        (async () =>
          (await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 })) ??
          (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })))(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), LOCATION_TIMEOUT_MS)),
      ]).catch(() => null);
      return position ? { lat: position.coords.latitude, lng: position.coords.longitude } : null;
    },
  });

  const coords = location.data ?? null;
  const city = me?.profile.home_city ?? (coords ? nearestLaunchCity(coords) : null);
  return { place: { coords, city }, ready: !profileLoading && !location.isLoading };
}
