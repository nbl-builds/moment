import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { cssVariables } from "@moment/shared";
import type { CSSProperties } from "react";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Moment",
  description: "Discover Unforgettable Experiences. Live like a local, anywhere in the world.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={manrope.variable} style={cssVariables as CSSProperties}>
      <body>{children}</body>
    </html>
  );
}
