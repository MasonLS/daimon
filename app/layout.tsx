import type { Metadata } from "next";
import { Source_Sans_3, Crimson_Pro, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { Header } from "@/components/header";

const sourceSans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const crimsonPro = Crimson_Pro({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Daimon - Your Writing Companion",
  description: "An AI companion for serious writers. Your daimon whispers ideas and connections, never putting words in your mouth.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${sourceSans.variable} ${crimsonPro.variable} ${cormorantGaramond.variable} antialiased`}
        >
          <ConvexClientProvider>
            <div className="relative flex min-h-screen flex-col">
              <Header />
              <main className="flex flex-1 flex-col">{children}</main>
            </div>
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
