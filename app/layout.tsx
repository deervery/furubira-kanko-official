import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "古平町観光協会",
  description: "北海道古平町の観光情報サイト",
  applicationName: "古平観光",
  generator: 'v0.dev',
  openGraph: {
    title: "古平町観光協会 | 熱く燃ゆる町",
    description: "北海道古平町の観光情報サイト。天狗の火渡りや新鮮な海産物、温泉、宿泊施設など、古平町の魅力的な観光スポットをご紹介します。",
    url: "https://curl-furubira.com",  // 自分のサイトURL
    siteName: "古平町観光協会",
    images: [
      {
        url: "/meta/ogp.jpg",
        width: 1200,
        height: 630,
        alt: "OGP Image",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "古平町観光協会",
    description: "北海道古平町の観光情報サイト",
    images: ["/meta/ogp.jpg"],
    site: "@furubira_enjoy",
  },
  icons: {
    apple: "/meta/apple-touch-icon.png",
    icon: [
      { rel: "icon", url: "/favicon.ico" },
      { rel: "icon", type: "image/svg+xml", url: "/favicon.svg" },
      { rel: "icon", type: "image/png", sizes: "96x96", url: "/favicon-96x96.png" }
    ]
  },
  manifest: "/meta/site.webmanifest",
  metadataBase: new URL("https://curl-furubira.com"),
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}



import './globals.css'