import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { fraunces, inter } from "@/lib/fonts";
import { SwRegister } from "@/components/pwa/sw-register";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Wander — wander into wonder",
    template: "%s · Wander",
  },
  description:
    "One tap. Beautiful discovery. Wander into wonder — a calm, curated way to find the web's most delightful corners.",
  applicationName: "Wander",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Wander",
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/wander-icon-192.png", sizes: "192x192" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f6f0e4",
};

const clerkAppearance = {
  variables: {
    colorPrimary: "#bf4d2c",
    colorText: "#241d15",
    colorTextSecondary: "#5b5142",
    colorBackground: "#fffdf8",
    colorInputBackground: "#fffdf8",
    colorInputText: "#241d15",
    fontFamily: "var(--font-inter), system-ui, sans-serif",
    borderRadius: "0.75rem",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        <ClerkProvider appearance={clerkAppearance} afterSignOutUrl="/">
          {children}
        </ClerkProvider>
        <SwRegister />
      </body>
    </html>
  );
}
