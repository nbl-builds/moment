import type { Metadata } from "next";
import { ToastProvider } from "@/components/portal/toast";

export const metadata: Metadata = {
  title: { default: "Moment for Business", template: "%s · Moment for Business" },
  description: "List your experiences and services on Moment and manage bookings in one place.",
};

export default function BusinessLayout({ children }: LayoutProps<"/business">) {
  return <ToastProvider>{children}</ToastProvider>;
}
