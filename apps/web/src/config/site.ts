// Public site settings. NEXT_PUBLIC_* values are inlined at build time
// (staging: apps/web/wrangler.jsonc vars; local: .env.local).

export type AppEnv = 'development' | 'staging' | 'production';

const rawEnv = process.env.NEXT_PUBLIC_APP_ENV;
export const appEnv: AppEnv = rawEnv === 'staging' || rawEnv === 'production' ? rawEnv : 'development';

export const siteConfig = {
  name: 'Moment',
  /** "Contact Us" in the portal header. */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'support@momentbooking.com',
  /** Absolute base URL for auth email links. Falls back to the request origin. */
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
} as const;

export const businessRoutes = {
  welcome: '/business',
  signup: '/business/signup',
  verify: '/business/verify',
  onboardingType: '/business/onboarding/type',
  onboardingCategory: '/business/onboarding/category',
  onboardingDetails: '/business/onboarding/details',
  login: '/business/login',
  forgotPassword: '/business/forgot-password',
  resetPassword: '/business/reset-password',
  dashboard: '/business/dashboard',
  terms: '/business/terms',
  authCallback: '/business/auth/callback',
} as const;
