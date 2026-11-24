import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, useFonts } from '@expo-google-fonts/manrope';
import { colors } from '@moment/shared';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthBypassBadge } from '@/components/auth-bypass-badge';
import { BrandSplash } from '@/components/brand-splash';
import { ToastHost } from '@/components/toast';
import { LoginSheetProvider } from '@/features/auth/login-sheet-provider';
import { queryClient } from '@/lib/query-client';

/** How long the splash stays up after the app has drawn it. */
const SPLASH_HOLD_MS = 2000;

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });
  const [holdDone, setHoldDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setHoldDone(true), SPLASH_HOLD_MS);
    return () => clearTimeout(timer);
  }, []);

  // The JS splash matches the native one exactly, so hide the native one as
  // soon as ours is on screen: no flash between them.
  const onSplashLayout = useCallback(() => {
    SplashScreen.hideAsync();
  }, []);

  const appReady = fontsLoaded || Boolean(fontError);
  const showSplash = !appReady || !holdDone;

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style={showSplash ? 'dark' : 'light'} />
        {appReady && (
          <LoginSheetProvider>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.secondary } }} />
          </LoginSheetProvider>
        )}
        {showSplash && <BrandSplash onLayout={onSplashLayout} />}
        {appReady && !showSplash && <AuthBypassBadge />}
        {appReady && <ToastHost />}
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
