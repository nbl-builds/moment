import Constants from 'expo-constants';

export type AppEnv = 'development' | 'staging' | 'production';

/** Which backend and build this is (EXPO_PUBLIC_APP_ENV; see app.config.ts and docs/STAGING.md). */
export const APP_ENV: AppEnv = (['development', 'staging', 'production'] as const).includes(process.env.EXPO_PUBLIC_APP_ENV as AppEnv)
  ? (process.env.EXPO_PUBLIC_APP_ENV as AppEnv)
  : 'development';

/** Android needs a Google Maps key for react-native-maps; set in the build (GOOGLE_MAPS_ANDROID_API_KEY). */
export const GOOGLE_MAPS_CONFIGURED: boolean = Boolean(Constants.expoConfig?.extra?.googleMapsConfigured);

/** react-native-maps can render: always on iOS (Apple Maps); on Android only with a Google Maps key. */
export const MAPS_AVAILABLE: boolean = process.env.EXPO_OS !== 'android' || GOOGLE_MAPS_CONFIGURED;
