import { formatPkPhoneInput, phoneSignInSchema } from '@moment/shared';
import { router } from 'expo-router';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { BottomSheet } from '@/components/bottom-sheet';
import { AUTH_BYPASS } from '@/lib/auth-bypass';
import { LoginSheetContent } from './login-sheet-content';
import { sendCode } from './otp';

interface OpenOptions {
  /** Pre-fill the phone field, e.g. "Edit" on the code screen. E.164 or national. */
  phone?: string;
  /** Open on the email field with this address (dev auth bypass only, for now). */
  email?: string;
}

interface LoginSheetContextValue {
  openLoginSheet: (options?: OpenOptions) => void;
  closeLoginSheet: () => void;
}

const LoginSheetContext = createContext<LoginSheetContextValue | null>(null);

/**
 * Hosts the single "Login or sign up" sheet above every screen. Mount once
 * near the root; open it from anywhere with `useLoginSheet().openLoginSheet()`.
 */
export function LoginSheetProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [initialPhone, setInitialPhone] = useState('');
  const [initialEmail, setInitialEmail] = useState<string | undefined>();
  // Remounts the content on every open so it starts from `initialPhone`.
  const [openCount, setOpenCount] = useState(0);

  const openLoginSheet = useCallback((options?: OpenOptions) => {
    // "+923084282001" -> "308 4282001", the format the phone field shows.
    setInitialPhone(options?.phone ? formatPkPhoneInput(options.phone) : '');
    setInitialEmail(options?.email);
    setOpenCount((n) => n + 1);
    setVisible(true);
  }, []);
  const closeLoginSheet = useCallback(() => setVisible(false), []);
  const value = useMemo(() => ({ openLoginSheet, closeLoginSheet }), [openLoginSheet, closeLoginSheet]);

  const continueWithPhone = useCallback(async (nationalNumber: string) => {
    const parsed = phoneSignInSchema.safeParse({ phone: nationalNumber });
    let phone: string;
    if (parsed.success) phone = parsed.data.phone;
    // The dev auth bypass takes any number; it is only shown on the code screen.
    else if (AUTH_BYPASS) phone = `+92${nationalNumber.replace(/\D/g, '')}`;
    else throw new Error(parsed.error.issues[0]?.message ?? 'Enter a valid phone number');
    await sendCode({ phone });
    setVisible(false);
    router.push({ pathname: '/verify-code', params: { phone } });
  }, []);

  // Email sign-in is built with its own section; until then only the dev bypass uses it.
  const continueWithEmail = useCallback(async (email: string) => {
    await sendCode({ email });
    setVisible(false);
    router.push({ pathname: '/verify-code', params: { email } });
  }, []);

  return (
    <LoginSheetContext.Provider value={value}>
      {children}
      <BottomSheet visible={visible} onRequestClose={closeLoginSheet} accessibilityLabel="Login or sign up">
        {/* Email, Apple and Google are wired up with their own sections. */}
        <LoginSheetContent
          key={openCount}
          initialPhone={initialPhone}
          initialEmail={initialEmail}
          onContinueWithPhone={continueWithPhone}
          onContinueWithEmail={AUTH_BYPASS ? continueWithEmail : undefined}
          onSkip={closeLoginSheet}
        />
      </BottomSheet>
    </LoginSheetContext.Provider>
  );
}

export function useLoginSheet(): LoginSheetContextValue {
  const ctx = useContext(LoginSheetContext);
  if (!ctx) throw new Error('useLoginSheet must be used inside <LoginSheetProvider>');
  return ctx;
}
