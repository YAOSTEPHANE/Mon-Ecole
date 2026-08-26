import type { Viewport } from "next";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "./providers";
import { buildRootLayoutMetadata } from "@/lib/appBrandingMetadata";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export async function generateMetadata() {
  return buildRootLayoutMetadata();
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" data-scroll-behavior="smooth" className={`${jakarta.variable} ${display.variable}`}>
      <body className="premium-body premium-body-v2 premium-body-v3 min-h-full font-sans antialiased text-base text-stone-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
