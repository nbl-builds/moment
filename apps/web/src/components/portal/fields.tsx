"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { PortalIcon } from "./icon";
import styles from "./form.module.css";

type FieldShellProps = {
  label: string;
  error?: string;
  hint?: ReactNode;
  children: (ids: { inputId: string; describedBy?: string }) => ReactNode;
  className?: string;
};

function FieldShell({ label, error, hint, children, className }: FieldShellProps) {
  const inputId = useId();
  const messageId = `${inputId}-message`;
  return (
    <div className={`${styles.field} ${className ?? ""}`}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      {children({ inputId, describedBy: error || hint ? messageId : undefined })}
      {error ? (
        <p id={messageId} className={styles.error} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  label: string;
  error?: string;
  hint?: ReactNode;
  /** Before the input (e.g. "+92" and the country chevron). */
  leading?: ReactNode;
  /** After the input (e.g. the password eye). */
  trailing?: ReactNode;
  locked?: boolean;
};

/** Figma "Web-Field": label, 60px S Tint 6 field, optional hint or error. */
export function TextField({ label, error, hint, leading, trailing, locked, ...input }: TextFieldProps) {
  return (
    <FieldShell label={label} error={error} hint={hint}>
      {({ inputId, describedBy }) => (
        <div className={styles.control} data-invalid={error ? "true" : undefined} data-locked={locked ? "true" : undefined}>
          {leading}
          <input
            id={inputId}
            className={styles.input}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            disabled={locked || input.disabled}
            {...input}
          />
          {trailing}
        </div>
      )}
    </FieldShell>
  );
}

/** Password field with the eye toggle (Figma "eye-disable"). */
export function PasswordField(props: Omit<TextFieldProps, "type" | "trailing">) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          className={styles.iconButton}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          <PortalIcon name="eye-disable" />
        </button>
      }
    />
  );
}

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "className"> & {
  label: string;
  error?: string;
  placeholder: string;
  options: readonly { value: string; label: string }[];
};

/** Dropdown field (Country, City) with the Figma "direction-down" chevron. */
export function SelectField({ label, error, placeholder, options, value, ...select }: SelectFieldProps) {
  return (
    <FieldShell label={label} error={error}>
      {({ inputId, describedBy }) => (
        <div className={styles.control} data-invalid={error ? "true" : undefined}>
          <select
            id={inputId}
            className={`${styles.input} ${styles.select}`}
            data-empty={value ? undefined : "true"}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            value={value}
            {...select}
          >
            <option value="" disabled>
              {placeholder}
            </option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <span className={styles.selectIcon}>
            <PortalIcon name="direction-down" />
          </span>
        </div>
      )}
    </FieldShell>
  );
}
