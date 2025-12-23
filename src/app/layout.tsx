import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import AuthProvider from "../contexts/AuthContext"

const inter = Inter({ subsets: ["latin"] })

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  colorScheme: "light dark",
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "TAGZZS - Personal Knowledge Management System",
    template: "%s | TAGZZS"
  },
  description: "Organize, tag, and discover your digital content with AI-powered insights. TAGZZS helps you build your personal knowledge base efficiently.",
  keywords: ["knowledge management", "content organization", "AI tagging", "personal productivity", "digital library"],
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
    url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    siteName: "TAGZZS",
    title: "TAGZZS - Personal Knowledge Management System",
    description: "Organize, tag, and discover your digital content with AI-powered insights. TAGZZS helps you build your personal knowledge base efficiently.",
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
    description: "Organize, tag, and discover your digital content with AI-powered insights. TAGZZS helps you build your personal knowledge base efficiently.",
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
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
