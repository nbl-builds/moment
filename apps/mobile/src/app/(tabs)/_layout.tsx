import { Tabs } from 'expo-router/tabs';
import { FloatingTabBar, TabBarProvider } from '@/components/tab-bar';

/**
 * Main app tabs with the floating tab bar. Every tab screen gets the same
 * shrink-on-scroll behaviour through `useCollapsibleTabBarScroll`.
 */
export default function TabsLayout() {
  return (
    <TabBarProvider>
      <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <FloatingTabBar {...props} />}>
        <Tabs.Screen name="home" options={{ title: 'Home' }} />
        <Tabs.Screen name="bookings" options={{ title: 'Bookings' }} />
        <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
        <Tabs.Screen name="groups" options={{ title: 'Groups' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
    </TabBarProvider>
  );
}
