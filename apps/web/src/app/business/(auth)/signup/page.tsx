import type { Metadata } from "next";
import { AuthShell } from "@/components/portal/auth-shell";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Sign up" };

/** Figma 472:1944 (phone) and 626:4593 (email, `?method=email`). */
export default async function SignUpPage({ searchParams }: PageProps<"/business/signup">) {
  const { method } = await searchParams;
  const isEmail = method === "email";
  return (
    <AuthShell photo={isEmail ? "email" : "welcome"}>
      <SignUpForm method={isEmail ? "email" : "phone"} />
    </AuthShell>
  );
}
