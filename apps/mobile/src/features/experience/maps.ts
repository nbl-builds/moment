import { Alert, Linking, Platform } from 'react-native';

/** Opens the native maps app at a point (or searches an address). */
export function openInMaps(label: string, point: { lat: number; lng: number } | null, address?: string | null) {
  const q = encodeURIComponent(label);
  const a = encodeURIComponent(address ?? label);
  const url = point
    ? Platform.select({
        ios: `http://maps.apple.com/?ll=${point.lat},${point.lng}&q=${q}`,
        default: `geo:${point.lat},${point.lng}?q=${point.lat},${point.lng}(${q})`,
      })
    : Platform.select({ ios: `http://maps.apple.com/?q=${a}`, default: `geo:0,0?q=${a}` });
  Linking.openURL(url).catch(() => Alert.alert('Couldn’t open maps', address ?? label));
}
