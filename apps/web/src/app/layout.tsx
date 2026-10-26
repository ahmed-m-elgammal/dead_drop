import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Press_Start_2P, Special_Elite, VT323 } from "next/font/google";
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

// Noir pixel trio: logo sign / case-file typewriter / terminal HUD.
const pressStart = Press_Start_2P({
  variable: "--font-press-start",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const specialElite = Special_Elite({
  variable: "--font-special-elite",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const vt323 = VT323({
  variable: "--font-vt323",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DEAD DROP — a noir manhunt",
  description:
    "Eight days. One city. A courier you never see. Read the evidence the rules publish, probe the dark, and close the case — or vanish trying. Play both sides of the async 1v1 hidden-movement duel on a deterministic engine.",
  icons: {
    icon: "/art/portrait-courier.png",
  },
};

// Stateful, offline-first CLIENT (engine-on-client, IndexedDB, localStorage —
// 07-architecture Option B): no prerender, no SEO surface. Route segment
// config lives here (server layout) — client pages cannot export it.
export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b101b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${pressStart.variable} ${specialElite.variable} ${vt323.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
