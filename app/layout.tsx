import { DM_Sans, Space_Grotesk } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-headline",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Vivid Care",
  description: "Workforce and roster management for care providers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${spaceGrotesk.variable} bg-[#edecea] text-[#1a1a18] antialiased`}>
        {children}
      </body>
    </html>
  );
}
