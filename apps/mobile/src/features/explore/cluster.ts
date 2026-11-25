// Groups nearby pins into clusters for the current zoom: the visible area is
// split into a grid and every cell with several pins becomes one cluster.

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
}

export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export type Cluster<T extends MapPoint> =
  | { kind: 'pin'; key: string; lat: number; lng: number; point: T }
  | { kind: 'cluster'; key: string; lat: number; lng: number; points: T[] };

/** About 7 columns and 10 rows of cells across the map. */
const COLUMNS = 7;
const ROWS = 10;

export function clusterPoints<T extends MapPoint>(points: T[], region: Region): Cluster<T>[] {
  const cellLng = region.longitudeDelta / COLUMNS;
  const cellLat = region.latitudeDelta / ROWS;
  const cells = new Map<string, T[]>();
  for (const p of points) {
    const key = `${Math.floor(p.lat / cellLat)}:${Math.floor(p.lng / cellLng)}`;
    cells.set(key, [...(cells.get(key) ?? []), p]);
  }
  return [...cells.entries()].map(([key, group]) => {
    if (group.length === 1) {
      const p = group[0]!;
      return { kind: 'pin', key: p.id, lat: p.lat, lng: p.lng, point: p };
    }
    const lat = group.reduce((s, p) => s + p.lat, 0) / group.length;
    const lng = group.reduce((s, p) => s + p.lng, 0) / group.length;
    return { kind: 'cluster', key: `c-${key}`, lat, lng, points: group };
  });
}

/** The visible area as a box for the explore queries. */
export const boxOf = (r: Region) => ({
  minLat: r.latitude - r.latitudeDelta / 2,
  maxLat: r.latitude + r.latitudeDelta / 2,
  minLng: r.longitude - r.longitudeDelta / 2,
  maxLng: r.longitude + r.longitudeDelta / 2,
});

/** Whether the map moved or zoomed enough since the last search to offer "Search this area". */
export function movedEnough(a: Region, b: Region) {
  const pan = Math.abs(a.latitude - b.latitude) / b.latitudeDelta + Math.abs(a.longitude - b.longitude) / b.longitudeDelta;
  const zoom = Math.abs(Math.log(a.latitudeDelta / b.latitudeDelta));
  return pan > 0.25 || zoom > 0.4;
}
