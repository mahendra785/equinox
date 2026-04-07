import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FogNet — Real-Time Visibility System",
  description: "AI-powered fog and visibility detection for road safety.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}