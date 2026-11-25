import { colors } from '@moment/shared';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import { showToast } from '@/components/toast';
import { Icon, Text, type IconName } from '@/components/ui';
import { TitledSheet } from '@/features/support/components/titled-sheet';
import { useAppSettings, type AppSettings } from '../queries';

type Network = keyof AppSettings['socialLinks'];

/** Figma order, left to right (48:5807). */
const NETWORKS: { key: Network; label: string; icon: IconName }[] = [
  { key: 'instagram', label: 'Instagram', icon: 'social-instagram' },
  { key: 'facebook', label: 'Facebook', icon: 'social-facebook' },
  { key: 'tiktok', label: 'TikTok', icon: 'social-tiktok' },
  { key: 'linkedin', label: 'LinkedIn', icon: 'social-linkedin' },
  { key: 'x', label: 'X', icon: 'social-x' },
];

const CIRCLE = 58;
/** Sheet top at y674 in the 926 frame. */
const SHEET_RATIO = (926 - 674) / 926;

/** Follow Us sheet (48:5772): white circles linking to Moment's social accounts. */
export function FollowUsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const settings = useAppSettings();
  const links = settings.data?.socialLinks ?? {};
  const shown = NETWORKS.filter((n) => Boolean(links[n.key]));

  const open = (n: (typeof NETWORKS)[number]) => {
    const url = links[n.key];
    if (!url) return;
    Linking.openURL(url).catch(() => showToast(`Couldn’t open ${n.label}`));
  };

  return (
    <TitledSheet visible={visible} title="Follow Us" onClose={onClose} minHeightRatio={SHEET_RATIO}>
      {settings.isPending ? (
        <ActivityIndicator color={colors.secondary} style={styles.state} />
      ) : settings.isError ? (
        <Pressable onPress={() => void settings.refetch()} style={styles.state} accessibilityRole="button">
          <Text variant="body14" color="blackTint2" align="center">
            Couldn’t load our accounts. <Text variant="body14" weight="bold" color="black">Try again</Text>
          </Text>
        </Pressable>
      ) : shown.length === 0 ? (
        <Text variant="body14" color="blackTint2" align="center" style={styles.state}>
          Our social accounts are coming soon.
        </Text>
      ) : (
        <View style={[styles.row, shown.length < NETWORKS.length && styles.rowFew]}>
          {shown.map((n) => (
            <Pressable
              key={n.key}
              onPress={() => open(n)}
              style={({ pressed }) => [styles.circle, pressed && styles.pressed]}
              accessibilityRole="link"
              accessibilityLabel={`Moment on ${n.label}`}
            >
              <Icon name={n.icon} size={24} color="black" />
            </Pressable>
          ))}
        </View>
      )}
    </TitledSheet>
  );
}

const styles = StyleSheet.create({
  row: {
    // Circles 103 below the sheet top (title row ends at 48).
    marginTop: 55,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowFew: {
    justifyContent: 'flex-start',
    gap: 20,
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: colors.track,
  },
  state: {
    marginTop: 48,
  },
});
