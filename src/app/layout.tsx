import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const SITE = "https://kiranrathodportfolio.vercel.app";
const TITLE = "Kiran Rathod | SDET · Cloud & DevOps";
const DESC = "SDET at a cross-border payments startup. I build test automation, CI/CD pipelines and cloud infrastructure so every release is verified before it ships.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESC,
  openGraph: { title: TITLE, description: DESC, url: SITE, siteName: "Kiran Rathod", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

import { DragonCursor } from "@/components/DragonCursor";
import FlameCursor from "@/components/FlameCursor";
import CubeGate from "@/components/CubeGate";
import SocialIcons from "@/components/SocialIcons";
import HeadingReveal from "@/components/HeadingReveal";
import { AudioManager } from "@/components/AudioManager";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased font-sans bg-[#121212]`} suppressHydrationWarning>
        <CubeGate />
        <FlameCursor />
        <DragonCursor />
        <SocialIcons />
        <HeadingReveal />
        <AudioManager />
        {children}
      </body>
    </html>
  );
}



