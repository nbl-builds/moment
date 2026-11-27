"use client";

import {
  businessDetailsNoPasswordSchema,
  businessDetailsSchema,
  COUNTRIES,
  LAUNCH_CITIES,
  type BusinessDetailsInput,
} from "@moment/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/portal/button";
import { PasswordField, SelectField, TextField } from "@/components/portal/fields";
import { businessRoutes } from "@/config/site";
import { useBrowserApi } from "@/lib/api/use-browser-api";
import { autoApproveBusiness } from "@/lib/business/actions";
import { errorMessage } from "@/lib/business/errors";
import form from "@/components/portal/form.module.css";
import styles from "../../auth.module.css";

type Key = keyof Required<BusinessDetailsInput>;
type Values = Record<Key, string>;

const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({ value: c.code, label: c.name }));
const CITY_OPTIONS = LAUNCH_CITIES.map((c) => ({ value: c, label: c }));

export function DetailsForm({
  type,
  categoryId,
  lockedEmail,
  phone,
  askPassword,
}: {
  type: "host" | "business";
  categoryId: string;
  lockedEmail?: string;
  phone?: string;
  askPassword: boolean;
}) {
  const api = useBrowserApi();
  const router = useRouter();
  const [values, setValues] = useState<Values>({
    name: "",
    address: "",
    countryCode: "",
    city: "",
    email: lockedEmail ?? "",
    password: "",
    confirmPassword: "",
  });
  const [touched, setTouched] = useState<Partial<Record<Key, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string>();

  // Accounts that already have a password (signed in with it) skip the two password fields.
  const parsed = (askPassword ? businessDetailsSchema : businessDetailsNoPasswordSchema).safeParse(values);
  const errors: Partial<Record<Key, string>> = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as Key;
      errors[key] ??= issue.message;
    }
  }
  const show = (key: Key) => (touched[key] ? errors[key] : undefined);

  const bind = (key: Key) => ({
    name: key,
    value: values[key],
    onChange: (e: { target: { value: string } }) => setValues((v) => ({ ...v, [key]: e.target.value })),
    onBlur: () => setTouched((t) => ({ ...t, [key]: true })),
    error: show(key),
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched({ name: true, address: true, countryCode: true, city: true, email: true, password: true, confirmPassword: true });
    if (!parsed.success) return;
    setSubmitting(true);
    setFormError(undefined);
    try {
      if ("password" in parsed.data && typeof parsed.data.password === "string") {
        await api.auth.updatePassword(parsed.data.password);
      }
      const businessId = await api.business.createBusiness({
        type,
        categoryId,
        name: parsed.data.name,
        address: parsed.data.address,
        countryCode: parsed.data.countryCode,
        city: parsed.data.city,
        email: lockedEmail ?? parsed.data.email,
        phone,
      });
      await autoApproveBusiness(businessId);
      router.replace(businessRoutes.dashboard);
      router.refresh();
    } catch (error) {
      setFormError(errorMessage(error));
      setSubmitting(false);
    }
  }

  return (
    <form className={form.form} onSubmit={onSubmit} noValidate>
      <h1 className={form.title}>
        We need some more details <br className={form.wideBreak} />
        to continue...
      </h1>

      <div className={styles.headingGap}>
        <TextField
          label={type === "host" ? "Host Name*" : "Business Name*"}
          placeholder={type === "host" ? "Enter your name" : "Enter your business name"}
          autoComplete={type === "host" ? "name" : "organization"}
          {...bind("name")}
        />
        <div className={styles.smallGap}>
          <TextField label="Address*" placeholder="Enter your address" autoComplete="street-address" {...bind("address")} />
        </div>
        <div className={`${form.fieldRow} ${styles.smallGap}`}>
          <SelectField label="Country*" placeholder="Select country" options={COUNTRY_OPTIONS} autoComplete="country" {...bind("countryCode")} />
          <SelectField label="City*" placeholder="Select city" options={CITY_OPTIONS} autoComplete="address-level2" {...bind("city")} />
        </div>
        <div className={styles.smallGap}>
          <TextField
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="Enter your email address"
            locked={Boolean(lockedEmail)}
            {...bind("email")}
          />
        </div>
        {askPassword ? (
          <>
            <div className={styles.smallGap}>
              <PasswordField label="Password*" placeholder="Enter password" autoComplete="new-password" {...bind("password")} />
            </div>
            <div className={styles.smallGap}>
              <PasswordField
                label="Confirm Password*"
                placeholder="Enter password"
                autoComplete="new-password"
                {...bind("confirmPassword")}
              />
            </div>
          </>
        ) : null}
      </div>

      <p className={`${form.legal} ${styles.smallGap}`}>
        By selecting Agree and continue, I agree to Moment <Link href={businessRoutes.terms}>Terms &amp; Conditions.</Link>
      </p>

      <Button type="submit" className={styles.sectionGap} disabled={!parsed.success} loading={submitting}>
        {parsed.success ? "Agree & Continue" : "Continue"}
      </Button>
      {formError ? (
        <p className={form.formError} role="alert">
          {formError}
        </p>
      ) : null}
    </form>
  );
}
