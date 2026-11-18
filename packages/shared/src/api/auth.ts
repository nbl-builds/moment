import type { AuthChangeEvent, AuthError, Session, User } from '@supabase/supabase-js';
import { toDisplayName } from '../validation/profile';
import type { CompleteSignUp, CompleteSignUpWithPassword } from '../validation/auth';
import { ApiError, fromAuthError, requireUserId, unwrap, type MomentSupabaseClient } from './errors';

// Supabase Auth flows from the Figma sign-in screens. Inputs are the outputs of
// the matching schemas in `validation/auth.ts` (phones are already E.164).

type AuthResult = { data: unknown; error: AuthError | null };
/** The success branch of a Supabase Auth response union. */
type AuthData<R extends AuthResult> = Extract<R, { error: null }>['data'];

async function call<R extends AuthResult>(promise: Promise<R>): Promise<AuthData<R>> {
  let result: R;
  try {
    result = await promise;
  } catch (cause) {
    throw new ApiError('network', 'Network request failed', undefined, undefined, cause);
  }
  if (result.error) throw fromAuthError(result.error);
  return result.data as AuthData<R>;
}

export type OAuthProvider = 'apple' | 'google' | 'facebook';

export function createAuthApi(db: MomentSupabaseClient) {
  return {
    getSession: async (): Promise<Session | null> => (await call(db.auth.getSession())).session,

    /** Validates the JWT with Supabase (use on the server before trusting the user). */
    getUser: async (): Promise<User | null> => {
      const { data, error } = await db.auth.getUser();
      if (error) {
        if (error.name === 'AuthSessionMissingError') return null;
        throw fromAuthError(error);
      }
      return data.user;
    },

    onAuthStateChange: (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
      const { data } = db.auth.onAuthStateChange(callback);
      return () => data.subscription.unsubscribe();
    },

    /** "Sign in / Up with phone": texts an OTP. Creates the account on first use. */
    sendPhoneOtp: (phone: string) => call(db.auth.signInWithOtp({ phone, options: { channel: 'sms' } })),

    /** "Sign Up with email" / "Sign in with email": emails an OTP. */
    sendEmailOtp: (email: string) => call(db.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })),

    /** "Sign In OTP" after a phone number. */
    verifyPhoneOtp: ({ phone, code }: { phone: string; code: string }) =>
      call(db.auth.verifyOtp({ phone, token: code, type: 'sms' })),

    /** "Sign In OTP" after an email. */
    verifyEmailOtp: ({ email, code }: { email: string; code: string }) =>
      call(db.auth.verifyOtp({ email, token: code, type: 'email' })),

    /** "Enter Password". */
    signInWithPassword: ({ email, password }: { email: string; password: string }) =>
      call(db.auth.signInWithPassword({ email, password })),

    /** "Forgot Password": emails a reset link that opens `redirectTo`. */
    sendPasswordReset: (email: string, redirectTo: string) =>
      call(db.auth.resetPasswordForEmail(email, { redirectTo })),

    /** Sets a new password for the signed-in (or recovering) user. */
    updatePassword: (password: string) => call(db.auth.updateUser({ password })),

    /** Personal Information > Email > Edit. Supabase emails a confirmation link. */
    changeEmail: (email: string) => call(db.auth.updateUser({ email })),

    /** Personal Information > Phone > Edit. Confirm with `verifyPhoneChange`. */
    changePhone: (phone: string) => call(db.auth.updateUser({ phone })),

    verifyPhoneChange: ({ phone, code }: { phone: string; code: string }) =>
      call(db.auth.verifyOtp({ phone, token: code, type: 'phone_change' })),

    /** Native Apple / Google sign-in: pass the ID token from the platform SDK. */
    signInWithIdToken: ({ provider, token, nonce }: { provider: 'apple' | 'google'; token: string; nonce?: string }) =>
      call(db.auth.signInWithIdToken({ provider, token, nonce })),

    /**
     * Browser OAuth (web, or mobile via an auth session). Returns the provider URL;
     * on mobile pass `skipBrowserRedirect: true` and open it with expo-web-browser.
     */
    signInWithOAuth: async (provider: OAuthProvider, redirectTo: string, skipBrowserRedirect = false) =>
      (await call(db.auth.signInWithOAuth({ provider, options: { redirectTo, skipBrowserRedirect } }))).url,

    /** Exchanges the `code` from an OAuth or magic link redirect for a session (PKCE). */
    exchangeCodeForSession: (code: string) => call(db.auth.exchangeCodeForSession(code)),

    signOut: () => call(db.auth.signOut().then((r) => ({ data: null, error: r.error }))).then(() => undefined),

    /**
     * "Sign Up Finishing": name, email, date of birth, marketing choice, optional
     * password, and acceptance of the current Terms and Privacy Policy.
     */
    completeSignUp: async (form: CompleteSignUp | CompleteSignUpWithPassword) => {
      const userId = await requireUserId(db);
      const displayName = toDisplayName(form.firstName, form.lastName);
      const { data: current } = await db.auth.getUser();

      await call(
        db.auth.updateUser({
          ...('password' in form ? { password: form.password } : {}),
          // Phone sign-ups add an email here; Supabase sends a confirmation link.
          ...(current.user?.email?.toLowerCase() !== form.email ? { email: form.email } : {}),
          data: { display_name: displayName, first_name: form.firstName, last_name: form.lastName },
        }),
      );

      await unwrap(db.from('profiles').update({ display_name: displayName }).eq('id', userId));

      const prefs = await unwrap(
        db.from('profile_private').select('notification_prefs').eq('user_id', userId).maybeSingle(),
      );
      const existing = (prefs?.notification_prefs ?? {}) as Record<string, unknown>;
      await unwrap(
        db
          .from('profile_private')
          .update({
            date_of_birth: form.dateOfBirth,
            notification_prefs: { ...existing, marketing: !form.marketingOptOut },
          })
          .eq('user_id', userId),
      );

      const docs = await unwrap(
        db
          .from('legal_documents')
          .select('id, type, published_at')
          .in('type', ['terms', 'privacy'])
          .not('published_at', 'is', null)
          .order('published_at', { ascending: false }),
      );
      const latest = ['terms', 'privacy'].flatMap((type) => {
        const doc = docs.find((d) => d.type === type);
        return doc ? [{ user_id: userId, document_id: doc.id }] : [];
      });
      if (latest.length) {
        await unwrap(db.from('legal_acceptances').upsert(latest, { onConflict: 'user_id,document_id', ignoreDuplicates: true }));
      }
    },
  };
}
