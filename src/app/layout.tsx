import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MP4 to 15 FPS Video",
  description: "Upload an MP4 and convert its video stream to 15 fps.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
