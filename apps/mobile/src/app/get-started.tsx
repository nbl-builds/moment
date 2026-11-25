import { colors } from '@moment/shared';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon, Text } from '@/components/ui';

const INSET = 20;
const RADIUS = 15;

// Figma reuses the "Recommend a place" placeholder in every section; this is Moment's own copy.
const SECTIONS = [
  {
    title: 'Explore.',
    body: 'Start on Home for Popular Activities, Top Hosts and picks Just For You. Open the Explore map to see what’s around you, and take the Adventure Quiz to get your personality badge and sharper recommendations.',
    image: require('../../assets/images/profile/get-started-explore-patio.jpg'),
  },
  {
    title: 'Book.',
    body: 'Pick a day and a time slot, add your guests and a note for the host. Pay in PKR by card, JazzCash or Easypaisa, add a coupon if you have one, and your booking shows up in Bookings.',
    image: require('../../assets/images/profile/get-started-book-beach.jpg'),
  },
  {
    title: 'Enjoy.',
    body: 'Chat with your host before you go, then leave a review to help others find great places. Planning with friends? Create a group, like experiences together and book as one.',
    image: require('../../assets/images/profile/get-started-enjoy-cabin.jpg'),
  },
] as const;

/** Get started guide (48:6483): a long scroll of what Moment is and how it works. */
export default function GetStartedScreen() {
  const insets = useSafeAreaInsets();

  const goHome = () => {
    if (router.canDismiss()) router.dismissAll();
    router.navigate('/home');
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 34 }]} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
          <Icon name="x" size={28} color="black" />
        </Pressable>

        <Image
          source={require('../../assets/images/profile/get-started-hero-cabin.jpg')}
          style={styles.hero}
          contentFit="cover"
          accessibilityLabel="A woman sitting outside an A-frame cabin"
        />
        <Text variant="h3" color="black" style={[styles.heading, styles.firstHeading]}>
          A new journey begins here
        </Text>
        <Text variant="body15" color="blackTint2" style={styles.body}>
          Moment helps you discover local experiences and the best local businesses in Islamabad, Lahore and Karachi: guided tours, food walks,
          spas, salons and hosts who know their city. Here’s how it works.
        </Text>

        {SECTIONS.map((s) => (
          <View key={s.title}>
            <Text variant="h3" weight="semibold" color="black" style={[styles.heading, styles.sectionHeading]}>
              {s.title}
            </Text>
            <Text variant="body15" color="blackTint2" style={styles.body}>
              {s.body}
            </Text>
            <Image source={s.image} style={styles.photo} contentFit="cover" accessible={false} />
          </View>
        ))}

        <Button label="Start exploring" onPress={goHome} style={styles.button} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  content: {
    paddingHorizontal: INSET,
  },
  close: {
    width: 28,
    height: 28,
  },
  hero: {
    marginTop: 33,
    width: '100%',
    aspectRatio: 388 / 478,
    borderRadius: RADIUS,
    backgroundColor: colors.track,
  },
  heading: {
    lineHeight: 32,
    letterSpacing: 0.24,
  },
  firstHeading: {
    marginTop: 13,
  },
  sectionHeading: {
    marginTop: 46,
  },
  body: {
    marginTop: 15,
    lineHeight: 21,
    letterSpacing: 0.15,
  },
  photo: {
    marginTop: 31,
    width: '100%',
    aspectRatio: 388 / 229,
    borderRadius: RADIUS,
    backgroundColor: colors.track,
  },
  button: {
    marginTop: 55,
  },
});
