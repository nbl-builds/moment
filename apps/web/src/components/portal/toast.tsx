"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./toast.module.css";

type Toast = { id: number; message: string };
const ToastContext = createContext<(message: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const show = useCallback((message: string) => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={styles.region} role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={styles.toast}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

/** Shows a toast once on mount (e.g. "Password updated" after a redirect). */
export function ToastOnMount({ message }: { message?: string }) {
  const toast = useToast();
  const shown = useRef(false);
  useEffect(() => {
    if (message && !shown.current) {
      shown.current = true;
      toast(message);
    }
  }, [message, toast]);
  return null;
}
