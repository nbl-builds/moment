import { colors, LAUNCH_CITIES, nearestLaunchCity } from '@moment/shared';
import * as Location from 'expo-location';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { showToast } from '@/components/toast';
import { Icon, Text, textStyle } from '@/components/ui';
import { BookingSheet } from '@/features/booking/components/booking-sheet';

/** Launch cities first, then other Pakistani cities people book from. */
export const PAKISTAN_CITIES = [
  ...LAUNCH_CITIES,
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Peshawar',
  'Quetta',
  'Sialkot',
  'Gujranwala',
  'Hyderabad',
  'Abbottabad',
  'Murree',
  'Gilgit',
  'Hunza',
  'Skardu',
  'Swat',
  'Bahawalpur',
  'Sukkur',
] as const;

/** "Islamabad" -> "Islamabad, Pakistan" for display. */
export const cityLabel = (city: string) => `${city}, Pakistan`;

/**
 * Choose Location (48:4398): search Pakistani cities or use the device's
 * location. No maps provider yet, so search filters a fixed city list.
 */
export function LocationSheet({
  visible,
  current,
  onPick,
  onClose,
}: {
  visible: boolean;
  current: string | null;
  onPick: (city: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [locating, setLocating] = useState(false);
  const q = query.trim().toLowerCase();
  const cities = PAKISTAN_CITIES.filter((c) => c.toLowerCase().includes(q));

  const close = () => {
    setQuery('');
    onClose();
  };
  const pick = (city: string) => {
    setQuery('');
    onPick(city);
  };

  const locateMe = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        showToast('Allow location in Settings to use where you are');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const launch = nearestLaunchCity(coords);
      if (launch) return pick(launch);
      const [place] = await Location.reverseGeocodeAsync({ latitude: coords.lat, longitude: coords.lng }).catch(() => []);
      const city = place?.city ?? place?.subregion ?? null;
      if (city && place?.isoCountryCode === 'PK') return pick(city);
      showToast('Moment isn’t in your area yet. Pick a city instead.');
    } catch {
      showToast('Couldn’t find where you are. Pick a city instead.');
    } finally {
      setLocating(false);
    }
  };

  return (
    <BookingSheet visible={visible} onClose={close} title="Choose Location" top={106} scrollContent>
      <View style={styles.search}>
        <Icon name="search-solid" size={24} color="black" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search city"
          placeholderTextColor={colors.optionSelected}
          style={styles.input}
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search city"
        />
      </View>
      <Pressable onPress={() => void locateMe()} disabled={locating} style={styles.current} accessibilityRole="button" accessibilityLabel="Use current location">
        {locating ? <ActivityIndicator color={colors.blackTint3} style={styles.spinner} /> : <Icon name="mappin-ellipse" size={28} color="blackTint3" />}
        <Text variant="subText16" weight="semibold" color="blackTint3">
          Use current location
        </Text>
      </Pressable>
      <View style={styles.list}>
        {cities.length === 0 ? (
          <Text variant="subText14" color="blackTint3" style={styles.none}>
            No Pakistani city matches “{query.trim()}”.
          </Text>
        ) : (
          cities.map((city) => {
            const selected = city === current;
            return (
              <Pressable
                key={city}
                onPress={() => pick(city)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={cityLabel(city)}
              >
                <Text variant="subText16" weight="semibold" color="black" style={styles.city}>
                  {cityLabel(city)}
                </Text>
                {selected && <Icon name="check" size={20} color="black" />}
              </Pressable>
            );
          })
        )}
      </View>
    </BookingSheet>
  );
}

const styles = StyleSheet.create({
  search: {
    marginTop: 20,
    marginHorizontal: 20,
    height: 50,
    borderRadius: 30,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 15,
  },
  input: {
    ...textStyle('subText14', 'semibold'),
    flex: 1,
    color: colors.black,
    paddingVertical: 0,
  },
  current: {
    marginTop: 18,
    marginHorizontal: 27,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  spinner: {
    width: 28,
    height: 28,
  },
  list: {
    marginTop: 12,
    marginHorizontal: 20,
    paddingBottom: 20,
  },
  row: {
    paddingVertical: 20,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pressed: {
    backgroundColor: colors.track,
  },
  city: {
    flex: 1,
  },
  none: {
    marginTop: 20,
  },
});
