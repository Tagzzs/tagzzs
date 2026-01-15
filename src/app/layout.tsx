import type React from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "../contexts/AuthContext";
import ChatProvider from "../contexts/ChatContext";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  colorScheme: "light dark",
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000"
  ),
  title: {
    default: "TAGZZS - Personal Knowledge Management System",
    template: "%s | TAGZZS",
  },
  description:
    "Organize, tag, and discover your digital content with AI-powered insights. TAGZZS helps you build your personal knowledge base efficiently.",
  keywords: [
    "knowledge management",
    "content organization",
    "AI tagging",
    "personal productivity",
    "digital library",
  ],
  authors: [{ name: "TAGZZS Team" }],
  creator: "TAGZZS",
  publisher: "TAGZZS",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  generator: "Next.js",
  applicationName: "TAGZZS",
  referrer: "origin-when-cross-origin",
  icons: {
    icon: "/favicon.ico",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000",
    siteName: "TAGZZS",
    title: "TAGZZS - Personal Knowledge Management System",
    description:
      "Organize, tag, and discover your digital content with AI-powered insights. TAGZZS helps you build your personal knowledge base efficiently.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TAGZZS - Personal Knowledge Management System",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TAGZZS - Personal Knowledge Management System",
    description:
      "Organize, tag, and discover your digital content with AI-powered insights. TAGZZS helps you build your personal knowledge base efficiently.",
    images: ["/og-image.png"],
    creator: "@TAGZZS",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#A064FF" />
      </head>
      <body className={`${inter.variable} antialiased bg-black overflow-hidden`}>
        <AuthProvider>
          <ChatProvider>
            {children}
            <Toaster />
          </ChatProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
