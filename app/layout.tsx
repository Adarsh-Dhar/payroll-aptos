import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Suspense } from "react"
import AuthSessionProvider from "@/components/auth-session-provider"
import { ClientWalletProvider } from "@/components/client-wallet-provider"
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: "v0 App",
  description: "Created with v0",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased min-h-dvh`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <AuthSessionProvider>
            <ClientWalletProvider>
              <Suspense fallback={null}>
                {children}
                <Analytics />
                <Toaster />
              </Suspense>
            </ClientWalletProvider>
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
