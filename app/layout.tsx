import type { Metadata } from "next";
import { Source_Sans_3, Crimson_Pro, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { ThemeProvider } from "@/components/theme-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";

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
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <SidebarProvider className="h-svh max-h-svh">
                <AppSidebar />
                <SidebarInset className="min-h-0 overflow-hidden">
                  {/* Mobile sidebar trigger */}
                  <header className="flex h-12 shrink-0 items-center gap-2 px-4 md:hidden">
                    <SidebarTrigger className="-ml-1" />
                  </header>
                  <div className="flex flex-1 flex-col min-h-0 overflow-hidden">{children}</div>
                </SidebarInset>
              </SidebarProvider>
            </ThemeProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
