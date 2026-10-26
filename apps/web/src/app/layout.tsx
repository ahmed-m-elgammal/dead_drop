import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dead Drop — Solo Prototype (M3)",
  description:
    "Playable single-player prototype of Dead Drop, the async 1v1 hidden-movement duel. Hunt Fugitive archetypes across the 24-case solo ladder, replay every case day by day — on the real deterministic engine (ruleset 1.0.0-alpha.1).",
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

// Stateful, offline-first CLIENT (engine-on-client, IndexedDB, localStorage —
// 07-architecture Option B): no prerender, no SEO surface. Route segment
// config lives here (server layout) — client pages cannot export it.
export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1a1a1a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster position="bottom-center" richColors />
      </body>
    </html>
  );
}
