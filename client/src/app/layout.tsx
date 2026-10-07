import type { Metadata, Viewport } from "next";
import { DM_Sans, Gloock, Yellowtail } from "next/font/google";
import "./globals.css";

const gloock = Gloock({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-gloock",
  display: "swap",
});

const yellowtail = Yellowtail({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-yellowtail",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dmsans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Charms: date by character",
  description:
    "Safety-first dating for women. Match on verified character across 23 qualities, not photos.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Charms" },
};

export const viewport: Viewport = {
  themeColor: "#FFC61A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${gloock.variable} ${yellowtail.variable} ${dmSans.variable}`}>
      <body className="bg-grain min-h-dvh">{children}</body>
    </html>
  );
}
