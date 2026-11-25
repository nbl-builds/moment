import { describe, expect, it } from 'vitest';
import { distanceKm, formatDistanceKm, LAUNCH_CITY_CENTRES, nearestLaunchCity, parseEwkbPoint } from './geo';

describe('geo helpers', () => {
  it('measures great-circle distance', () => {
    const km = distanceKm(LAUNCH_CITY_CENTRES.Islamabad, LAUNCH_CITY_CENTRES.Lahore);
    expect(km).toBeGreaterThan(260);
    expect(km).toBeLessThan(275);
  });

  it('finds the launch city for a point, or none when far away', () => {
    expect(nearestLaunchCity({ lat: 33.71, lng: 73.06 })).toBe('Islamabad');
    expect(nearestLaunchCity({ lat: 31.47, lng: 74.27 })).toBe('Lahore');
    expect(nearestLaunchCity({ lat: 24.8, lng: 67.05 })).toBe('Karachi');
    expect(nearestLaunchCity({ lat: 36.31, lng: 74.66 })).toBeNull(); // Hunza
  });

  it('formats card distances in km', () => {
    expect(formatDistanceKm(0.05)).toBe('Nearby');
    expect(formatDistanceKm(4.12)).toBe('4.1 km away');
    expect(formatDistanceKm(3)).toBe('3 km away');
    expect(formatDistanceKm(54.6)).toBe('55 km away');
    expect(formatDistanceKm(Number.NaN)).toBe('');
  });
});

describe('parseEwkbPoint', () => {
  it('reads a PostGIS point with an SRID (Trail 3, Islamabad)', () => {
    const p = parseEwkbPoint('0101000020E6100000B84082E2C7445240AD69DE718ADE4040');
    expect(p?.lat).toBeCloseTo(33.7386, 4);
    expect(p?.lng).toBeCloseTo(73.0747, 4);
  });
  it('ignores anything else', () => {
    expect(parseEwkbPoint(null)).toBeNull();
    expect(parseEwkbPoint('not hex')).toBeNull();
    expect(parseEwkbPoint('0102000020E6100000')).toBeNull();
  });
});
