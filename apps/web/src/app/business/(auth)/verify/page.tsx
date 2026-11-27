import type { Metadata } from "next";
import { VerifyCode } from "./verify-code";

export const metadata: Metadata = { title: "Enter verification code" };

/** Figma 472:2042 / 495:2112 / 495:2167 (phone) and 626:4670 / 626:4779 / 626:4716 (email). */
export default function VerifyPage() {
  return <VerifyCode />;
}
