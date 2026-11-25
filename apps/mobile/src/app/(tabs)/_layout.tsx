import { router } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import { FloatingTabBar, TabBarProvider } from '@/components/tab-bar';
import { PickReservationProvider } from '@/features/bookings/pick-reservation';
import { exploreStore } from '@/features/explore/store';
import { useUnread } from '@/features/bookings/queries';

/**
 * Main app tabs with the floating tab bar. Every tab screen gets the same
 * shrink-on-scroll behaviour through `useCollapsibleTabBarScroll`. The
 * Bookings icon shows the unread chat count; the reservation picker sheet
 * sits above the tab bar.
 */
export default function TabsLayout() {
  const unread = useUnread();
  const badge = unread.total > 99 ? '99+' : unread.total > 0 ? unread.total : undefined;
  return (
    <TabBarProvider>
      <PickReservationProvider>
        <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <FloatingTabBar {...props} />}>
          <Tabs.Screen name="home" options={{ title: 'Home' }} />
          <Tabs.Screen name="bookings" options={{ title: 'Bookings', tabBarBadge: badge }} />
          {/* The lime Explore button opens Explore full screen over the tabs (no tab bar). */}
          <Tabs.Screen
            name="explore"
            options={{ title: 'Explore' }}
            listeners={{
              tabPress: (e) => {
                e.preventDefault();
                exploreStore.reset();
                router.push('/map');
              },
            }}
          />
          <Tabs.Screen name="groups" options={{ title: 'Groups' }} />
          <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
        </Tabs>
      </PickReservationProvider>
    </TabBarProvider>
  );
}
