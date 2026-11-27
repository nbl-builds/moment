import type { ButtonHTMLAttributes } from "react";
import styles from "./form.module.css";

/**
 * Figma "Button" Primary. `size="form"`: full width, 58 tall (forms).
 * `size="large"`: 48 tall, content width ("Get Started").
 * Disabled uses S Tint 5 / S Tint 2 as on the screens.
 */
export function Button({
  loading,
  size = "form",
  children,
  className,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; size?: "form" | "large" }) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      data-loading={loading ? "true" : undefined}
      aria-busy={loading || undefined}
      className={`${styles.button} ${size === "large" ? styles.ctaButton : ""} ${className ?? ""}`}
    >
      {loading ? <span className={styles.spinner} aria-hidden /> : null}
      {children}
    </button>
  );
}
