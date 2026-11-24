import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { BottomSheet } from '@/components/bottom-sheet';
import { LoginSheetContent } from './login-sheet-content';

interface LoginSheetContextValue {
  openLoginSheet: () => void;
  closeLoginSheet: () => void;
}

const LoginSheetContext = createContext<LoginSheetContextValue | null>(null);

/**
 * Hosts the single "Login or sign up" sheet above every screen. Mount once
 * near the root; open it from anywhere with `useLoginSheet().openLoginSheet()`.
 */
export function LoginSheetProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const openLoginSheet = useCallback(() => setVisible(true), []);
  const closeLoginSheet = useCallback(() => setVisible(false), []);
  const value = useMemo(() => ({ openLoginSheet, closeLoginSheet }), [openLoginSheet, closeLoginSheet]);

  return (
    <LoginSheetContext.Provider value={value}>
      {children}
      <BottomSheet visible={visible} onRequestClose={closeLoginSheet} accessibilityLabel="Login or sign up">
        {/* UI only for now: sign-in actions are wired up with the auth screens. */}
        <LoginSheetContent onSkip={closeLoginSheet} />
      </BottomSheet>
    </LoginSheetContext.Provider>
  );
}

export function useLoginSheet(): LoginSheetContextValue {
  const ctx = useContext(LoginSheetContext);
  if (!ctx) throw new Error('useLoginSheet must be used inside <LoginSheetProvider>');
  return ctx;
}
