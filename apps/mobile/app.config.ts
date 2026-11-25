import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * One app, three environments (EXPO_PUBLIC_APP_ENV, set per EAS environment;
 * see docs/STAGING.md). app.json is the base; this file changes what differs:
 * - development: Expo Go / dev client against local Supabase.
 * - staging: "Moment (Staging)", its own package and scheme, so it installs next to the live app.
 * - production: "Moment", com.moment.app, moment://.
 */
type AppEnv = 'development' | 'staging' | 'production';

const APP_ENV = (process.env.EXPO_PUBLIC_APP_ENV ?? 'development') as AppEnv;
/** Android Google Maps key (EAS secret GOOGLE_MAPS_ANDROID_API_KEY). Without it Explore shows the list on Android. */
const GOOGLE_MAPS_ANDROID_API_KEY = process.env.GOOGLE_MAPS_ANDROID_API_KEY;

const VARIANTS: Record<AppEnv, { name: string; scheme: string; id: string; icon: string; foreground: string }> = {
  development: {
    name: 'Moment (Dev)',
    scheme: 'moment-dev',
    id: 'com.moment.app.dev',
    icon: './assets/images/icon.png',
    foreground: './assets/images/android-icon-foreground.png',
  },
  staging: {
    name: 'Moment (Staging)',
    scheme: 'moment-staging',
    id: 'com.moment.app.staging',
    icon: './assets/images/icon-staging.png',
    foreground: './assets/images/android-icon-foreground-staging.png',
  },
  production: {
    name: 'Moment',
    scheme: 'moment',
    id: 'com.moment.app',
    icon: './assets/images/icon.png',
    foreground: './assets/images/android-icon-foreground.png',
  },
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const v = VARIANTS[APP_ENV] ?? VARIANTS.development;
  return {
    ...config,
    name: v.name,
    slug: config.slug ?? 'moment',
    // The live scheme stays registered everywhere so moment:// links (password reset) keep working.
    scheme: APP_ENV === 'production' ? 'moment' : [v.scheme, 'moment'],
    icon: v.icon,
    ios: { ...config.ios, bundleIdentifier: v.id },
    android: {
      ...config.android,
      package: v.id,
      adaptiveIcon: { ...config.android?.adaptiveIcon, foregroundImage: v.foreground },
      ...(GOOGLE_MAPS_ANDROID_API_KEY ? { config: { googleMaps: { apiKey: GOOGLE_MAPS_ANDROID_API_KEY } } } : null),
    },
    extra: {
      ...config.extra,
      appEnv: APP_ENV,
      googleMapsConfigured: Boolean(GOOGLE_MAPS_ANDROID_API_KEY),
    },
  };
};
