import { colors } from '@moment/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { MapFallback } from '@/components/map-fallback';
import { Text } from '@/components/ui';
import { MAPS_AVAILABLE } from '@/lib/env';
import { BIZ } from '../layout';

const LONG = 260;

/** About (47:1972): description that expands when long, and a small map with the pin (tap opens Maps). */
export function AboutSection({
  description,
  point,
  onOpenMap,
}: {
  description: string | null;
  point: { lat: number; lng: number } | null;
  onOpenMap: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const text = description?.trim() || 'This business hasn’t added a description yet.';
  const long = text.length > LONG;

  return (
    <View style={styles.wrap}>
      <Text variant="h4" color="secondary" accessibilityRole="header">
        About
      </Text>
      <Text variant="body15" weight="medium" color="secondaryTint2" numberOfLines={long && !expanded ? 6 : undefined} style={styles.body}>
        {text}
      </Text>
      {long && (
        <Pressable onPress={() => setExpanded((e) => !e)} hitSlop={8} accessibilityRole="button">
          <Text variant="body14" weight="bold" color="secondary" style={styles.more}>
            {expanded ? 'Show less' : 'Read more'}
          </Text>
        </Pressable>
      )}
      {point && (
        <Pressable onPress={onOpenMap} style={styles.map} accessibilityRole="button" accessibilityLabel="Map. Opens directions in Maps">
          {MAPS_AVAILABLE ? (
            <MapView
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              toolbarEnabled={false}
              userInterfaceStyle="light"
              initialRegion={{ latitude: point.lat, longitude: point.lng, latitudeDelta: 0.012, longitudeDelta: 0.012 }}
            >
              <Marker coordinate={{ latitude: point.lat, longitude: point.lng }}>
                <View style={styles.pin}>
                  <View style={styles.pinDot} />
                </View>
              </Marker>
            </MapView>
          ) : (
            <MapFallback hint="Tap for directions" />
          )}
        </Pressable>
      )}
    </View>
  );
}

const PIN = 35.5;

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: BIZ.inset + 2,
  },
  body: {
    marginTop: 13,
  },
  more: {
    marginTop: 6,
  },
  // Figma: 385 x 142, radius 25, 21pt below the text.
  map: {
    marginTop: 21,
    height: BIZ.map.height,
    borderRadius: BIZ.map.radius,
    overflow: 'hidden',
    backgroundColor: colors.secondaryTint6,
  },
  // Figma pin: a black 35.5pt circle with a white dot.
  pin: {
    width: PIN,
    height: PIN,
    borderRadius: PIN / 2,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDot: {
    width: 11.8,
    height: 11.8,
    borderRadius: 5.9,
    backgroundColor: colors.white,
  },
});
