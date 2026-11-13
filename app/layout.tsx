import type { Metadata } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import "./globals.css";

const grotesk = Schibsted_Grotesk({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "What's on | RSVP",
  description: "Reserve a place at upcoming events.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={grotesk.className}>{children}</body>
    </html>
  );
}