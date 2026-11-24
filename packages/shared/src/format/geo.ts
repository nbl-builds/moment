import type { LaunchCity } from '../constants';

/** City centres used to place a user in a launch city from their location. */
export const LAUNCH_CITY_CENTRES: Record<LaunchCity, { lat: number; lng: number }> = {
  Islamabad: { lat: 33.6844, lng: 73.0479 },
  Lahore: { lat: 31.5204, lng: 74.3587 },
  Karachi: { lat: 24.8607, lng: 67.0011 },
};

/** Great-circle distance in km. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * The launch city a point is in or near (within `maxKm` of its centre), else null.
 * nearestLaunchCity({ lat: 33.71, lng: 73.06 }) -> 'Islamabad'
 */
export function nearestLaunchCity(point: { lat: number; lng: number }, maxKm = 60): LaunchCity | null {
  let best: { city: LaunchCity; km: number } | null = null;
  for (const [city, centre] of Object.entries(LAUNCH_CITY_CENTRES) as [LaunchCity, { lat: number; lng: number }][]) {
    const km = distanceKm(point, centre);
    if (!best || km < best.km) best = { city, km };
  }
  return best && best.km <= maxKm ? best.city : null;
}

/**
 * "4.1 km away" on listing cards (Figma shows miles; Pakistan uses km).
 * One decimal under 10 km, whole km above; "Nearby" under 100 m.
 */
export function formatDistanceKm(km: number): string {
  if (!Number.isFinite(km) || km < 0) return '';
  if (km < 0.1) return 'Nearby';
  const value = km < 10 ? km.toFixed(1).replace(/\.0$/, '') : String(Math.round(km));
  return `${value} km away`;
}
