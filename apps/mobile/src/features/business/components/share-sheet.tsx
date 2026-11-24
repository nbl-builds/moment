import { brandGradients, colors } from '@moment/shared';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { Linking, Pressable, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet } from '@/components/bottom-sheet';
import { showToast } from '@/components/toast';
import { Icon, Text, type IconName } from '@/components/ui';

const CIRCLE = 60;

interface ShareSheetProps {
  visible: boolean;
  onClose: () => void;
  /** e.g. "Saffron Spa & Wellness on Moment" */
  title: string;
  /** moment://business/<slug> */
  url: string;
}

type Target = { key: string; label: string; open: () => Promise<void> | void; render: () => React.ReactNode };

/**
 * Share sheet (47:2457): brand apps on top, SMS / Email / Copy / More below.
 * Apps that aren't installed fall back to the system share sheet.
 */
export function ShareSheet({ visible, onClose, title, url }: ShareSheetProps) {
  const insets = useSafeAreaInsets();
  const message = `${title}: ${url}`;
  const enc = encodeURIComponent;

  const openOr = async (link: string) => {
    try {
      await Linking.openURL(link);
    } catch {
      await Share.share({ message });
    }
  };
  const run = (fn: () => Promise<void> | void) => () => {
    onClose();
    // Let the sheet close before another app or sheet opens.
    setTimeout(() => void fn(), 250);
  };

  const brand: Target[] = [
    { key: 'facebook', label: 'Facebook', open: () => openOr(`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`), render: () => <Icon name="share-facebook" size={CIRCLE} /> },
    {
      key: 'messenger',
      label: 'Messenger',
      open: () => openOr(`fb-messenger://share?link=${enc(url)}`),
      render: () => (
        <LinearGradient colors={brandGradients.messenger} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={styles.brandCircle}>
          <Icon name="share-messenger" size={40} />
        </LinearGradient>
      ),
    },
    { key: 'twitter', label: 'Twitter', open: () => openOr(`https://twitter.com/intent/tweet?text=${enc(message)}`), render: () => <Icon name="share-twitter" size={CIRCLE} /> },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      open: () => openOr(`whatsapp://send?text=${enc(message)}`),
      render: () => (
        <LinearGradient colors={brandGradients.whatsapp} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.brandCircle}>
          <Icon name="share-whatsapp" size={36} />
        </LinearGradient>
      ),
    },
  ];

  const utility: { key: string; label: string; icon: IconName; open: () => Promise<void> | void }[] = [
    { key: 'sms', label: 'SMS', icon: 'share-sms', open: () => openOr(`sms:&body=${enc(message)}`) },
    { key: 'email', label: 'Email', icon: 'share-email', open: () => openOr(`mailto:?subject=${enc(title)}&body=${enc(message)}`) },
    {
      key: 'copy',
      label: 'Copy',
      icon: 'share-link-copy',
      open: async () => {
        await Clipboard.setStringAsync(url);
        showToast('Link copied');
      },
    },
    { key: 'more', label: 'More', icon: 'share-more', open: () => void Share.share({ message }) },
  ];

  return (
    <BottomSheet visible={visible} onRequestClose={onClose} accessibilityLabel="Share">
      <View style={[styles.content, { paddingBottom: insets.bottom + 19 }]}>
        <View style={styles.row}>
          {brand.map((t) => (
            <Pressable key={t.key} onPress={run(t.open)} style={styles.cell} accessibilityRole="button" accessibilityLabel={`Share on ${t.label}`}>
              {t.render()}
              <Text variant="subText12" color="secondaryTint2" style={styles.label}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          {utility.map((t) => (
            <Pressable key={t.key} onPress={run(t.open)} style={styles.cell} accessibilityRole="button" accessibilityLabel={t.key === 'copy' ? 'Copy link' : t.key === 'more' ? 'More options' : `Share by ${t.label}`}>
              <View style={styles.grey}>
                <Icon name={t.icon} size={24} color="secondary" />
              </View>
              <Text variant="subText12" color="secondaryTint2" style={styles.label}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  // Figma: icons 35pt below the sheet top, labels 16pt under them; divider 34pt below the labels.
  content: {
    paddingTop: 35,
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  cell: {
    alignItems: 'center',
    width: 80,
  },
  brandCircle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grey: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    backgroundColor: colors.secondaryTint6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.chipBorder,
    marginTop: 34,
    marginBottom: 37,
  },
});
