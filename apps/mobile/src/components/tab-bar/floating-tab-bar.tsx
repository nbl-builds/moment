import type { BottomTabBarProps } from 'expo-router/tabs';
import { colors, withAlpha } from '@moment/shared';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, Text, type IconName } from '@/components/ui';
import { useMyProfile } from '@/features/auth/use-session';
import { api } from '@/lib/api';
import { TAB_BAR } from './tab-bar-metrics';
import { useTabBar } from './tab-bar-state';

const E = TAB_BAR.expanded;
const C = TAB_BAR.compact;

/** Tab route name -> label and icon. Order follows the routes in (tabs)/_layout. */
const TABS: Record<string, { label: string; icon: IconName }> = {
  home: { label: 'Home', icon: 'tab-home' },
  bookings: { label: 'Bookings', icon: 'tab-bookings' },
  explore: { label: 'Explore', icon: 'tab-explore' },
  groups: { label: 'Groups', icon: 'tab-groups' },
  profile: { label: 'Profile', icon: 'tab-profile' },
};

const AVATAR = 26;
const LABEL_HEIGHT = 14;
const LABEL_GAP = 4;

/**
 * Floating rounded tab bar for the Expo Router tab layout (replaces Figma's
 * bottom bar). Near-black pill above the home indicator, lime active item and a
 * raised lime Explore circle. Scrolling down shrinks it to a compact pill
 * (see `useCollapsibleTabBarScroll`); tapping it expands it again.
 */
export function FloatingTabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { collapse, setCollapsed } = useTabBar();

  const barStyle = useAnimatedStyle(() => {
    const c = collapse.get();
    return {
      height: interpolate(c, [0, 1], [E.height, C.height]),
      left: interpolate(c, [0, 1], [E.sideInset, C.sideInset]),
      right: interpolate(c, [0, 1], [E.sideInset, C.sideInset]),
    };
  });

  return (
    <Animated.View
      style={[styles.bar, { bottom: TAB_BAR.bottomOffset(insets.bottom) }, barStyle]}
      accessibilityRole="tablist"
    >
      <View style={styles.background} pointerEvents="none">
        {Platform.OS === 'ios' && <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />}
        <View style={[StyleSheet.absoluteFill, styles.tint]} />
      </View>
      {/* Tapping the bar's empty space expands it. */}
      <Pressable style={StyleSheet.absoluteFill} onPress={() => setCollapsed(false)} accessible={false} />

      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const focused = state.index === index;
        const options = descriptors[route.key]?.options;

        const onPress = () => {
          setCollapsed(false);
          const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigateToTab(route.key);
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
            style={styles.item}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={
              options?.tabBarAccessibilityLabel ??
              (options?.tabBarBadge !== undefined ? `${tab.label}, ${options.tabBarBadge} unread` : tab.label)
            }
            hitSlop={4}
          >
            {route.name === 'explore' ? (
              <ExploreButton focused={focused} collapse={collapse} />
            ) : route.name === 'profile' ? (
              <ProfileIcon focused={focused} />
            ) : (
              <View>
                <Icon name={tab.icon} size={TAB_BAR.iconSize} color={focused ? 'primary' : 'secondaryTint3'} />
                {options?.tabBarBadge !== undefined && (
                  <View style={styles.badge} accessible={false}>
                    <Text variant="caption11" weight="extrabold" color="onBadge" style={styles.badgeText}>
                      {String(options.tabBarBadge)}
                    </Text>
                  </View>
                )}
              </View>
            )}
            <TabLabel label={tab.label} focused={focused} collapse={collapse} />
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

function TabLabel({ label, focused, collapse }: { label: string; focused: boolean; collapse: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const c = collapse.get();
    return {
      opacity: interpolate(c, [0, 0.6], [1, 0], 'clamp'),
      height: interpolate(c, [0, 1], [LABEL_HEIGHT, 0]),
      marginTop: interpolate(c, [0, 1], [LABEL_GAP, 0]),
    };
  });
  return (
    <Animated.View style={[styles.label, style]}>
      <Text variant="subText10" weight={focused ? 'bold' : 'medium'} color={focused ? 'primary' : 'secondaryTint3'} numberOfLines={1}>
        {label}
      </Text>
    </Animated.View>
  );
}

/** The raised lime circle in the middle; it sinks into the pill when compact. */
function ExploreButton({ focused, collapse }: { focused: boolean; collapse: SharedValue<number> }) {
  const circle = useAnimatedStyle(() => {
    const c = collapse.get();
    const size = interpolate(c, [0, 1], [E.exploreSize, C.exploreSize]);
    return {
      width: size,
      height: size,
      borderRadius: size / 2,
      transform: [{ translateY: -interpolate(c, [0, 1], [E.exploreRaise, C.exploreRaise]) }],
    };
  });
  return (
    <View style={styles.exploreSlot}>
      <Animated.View style={[styles.explore, focused && styles.exploreFocused, circle]}>
        <Icon name="tab-explore" size={TAB_BAR.iconSize} color="secondary" />
      </Animated.View>
    </View>
  );
}

/** The user's photo (signed in) or a person icon (guest). */
function ProfileIcon({ focused }: { focused: boolean }) {
  const { data } = useMyProfile();
  const avatar = api.media.url(data?.profile.avatar_url);
  if (!avatar) {
    return <Icon name="tab-profile" size={TAB_BAR.iconSize} color={focused ? 'primary' : 'secondaryTint3'} />;
  }
  return (
    <Image
      source={{ uri: avatar }}
      style={[styles.avatar, focused && styles.avatarFocused]}
      contentFit="cover"
      accessible={false}
    />
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: TAB_BAR.radius,
    // Soft lift off the page.
    shadowColor: colors.black,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  background: {
    ...StyleSheet.absoluteFill,
    borderRadius: TAB_BAR.radius,
    overflow: 'hidden',
  },
  tint: {
    // Solid on Android; on iOS slightly see-through over the blur.
    backgroundColor: Platform.OS === 'ios' ? withAlpha(colors.secondary, 0.86) : colors.secondary,
  },
  item: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TAB_BAR.minTapTarget,
  },
  /** Unread count on the Bookings icon (Figma 52:8565: 14pt #F35C5C, ExtraBold 8). */
  badge: {
    position: 'absolute',
    top: -7,
    right: -9,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: colors.badge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 9,
    lineHeight: 12,
  },
  label: {
    overflow: 'hidden',
    alignItems: 'center',
  },
  exploreSlot: {
    width: TAB_BAR.iconSize,
    height: TAB_BAR.iconSize,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  explore: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  exploreFocused: {
    borderWidth: 3,
    borderColor: colors.primaryShade4,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
  },
  avatarFocused: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
});
