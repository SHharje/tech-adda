// app/layout.js
// ─────────────────────────────────────────────────────────────────────
// Root layout — sets up fonts (Space Grotesk, Inter, JetBrains Mono),
// global styles, and the persistent Navbar across all pages.
// ─────────────────────────────────────────────────────────────────────

import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import NewsChat from "@/components/NewsChat";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata = {
  title: "TechAdda — Live Tech News Aggregator",
  description:
    "Real-time tech news from Hacker News & Dev.to, clustered by topic with AI-generated summaries and trend charts.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <NewsChat />
      </body>
    </html>
  );
}
