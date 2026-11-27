"use client";

import { OTP_LENGTH } from "@moment/shared";
import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import styles from "./otp-input.module.css";

/**
 * Six code boxes (Figma 472:2153 empty, 626:4508 filled, 626:4536 wrong).
 * Typing moves to the next box, Backspace to the previous one, pasting fills
 * every box, and `onComplete` fires once all digits are in.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  invalid,
  disabled,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  onComplete: (code: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] ?? "");

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const commit = (next: string, focusIndex: number) => {
    const clean = next.replace(/\D/g, "").slice(0, OTP_LENGTH);
    onChange(clean);
    refs.current[Math.min(focusIndex, OTP_LENGTH - 1)]?.focus();
    if (clean.length === OTP_LENGTH) onComplete(clean);
  };

  const setDigit = (index: number, raw: string) => {
    const typed = raw.replace(/\D/g, "");
    if (!typed) return;
    if (typed.length > 1) {
      // Autofill (one-time-code) or a fast typist: spread from this box.
      commit(value.slice(0, index) + typed, index + typed.length);
      return;
    }
    const chars = digits.slice();
    chars[index] = typed;
    commit(chars.join("").slice(0, Math.max(index + 1, value.length)), index + 1);
  };

  const onKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[index]) {
        onChange(value.slice(0, index) + value.slice(index + 1));
      } else if (index > 0) {
        onChange(value.slice(0, index - 1) + value.slice(index));
        refs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    e.preventDefault();
    commit(pasted, pasted.length);
  };

  return (
    <div className={styles.row} role="group" aria-label="Verification code">
      {digits.map((digit, i) => (
        <span key={i} className={styles.cell} data-empty={digit ? undefined : "true"} data-invalid={invalid ? "true" : undefined}>
          <input
            ref={(el) => {
              refs.current[i] = el;
            }}
            className={styles.input}
            value={digit}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={onPaste}
            onFocus={(e) => e.target.select()}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            pattern="[0-9]*"
            maxLength={OTP_LENGTH}
            disabled={disabled}
            aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
            aria-invalid={invalid || undefined}
          />
        </span>
      ))}
    </div>
  );
}
