import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { InstallAppPrompt } from "@/components/install-app-prompt";
import { OfflineSyncProvider } from "@/components/offline-sync-provider";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NightGuide Saquarema",
  description: "Eventos, bares e experiencias noturnas em Saquarema.",
  applicationName: "NightGuide",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NightGuide",
  },
};

export const viewport: Viewport = {
  themeColor: "#07110f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body>
        <Script
          id="nightguide-preferences"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("nightguide-theme")||"dark";var l=localStorage.getItem("nightguide-language")||"pt";document.documentElement.dataset.theme=t;document.documentElement.lang=l==="en"?"en":"pt-BR"}catch(e){document.documentElement.dataset.theme="dark"}`,
          }}
        />
        {children}
        <OfflineSyncProvider />
        <InstallAppPrompt />
        <ServiceWorker />
      </body>
    </html>
  );
}
