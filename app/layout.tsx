import { BarChart, Home, LineChart, Music, Palette, Table, Upload } from 'lucide-react'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import type React from 'react'

import UsersMenu from '@/components/common/users/users-menu'
import { Toaster } from '@/components/ui/toaster'
import { UserViewProvider } from '@/lib/store/users/users-provider'
import '../styles/globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Spotify Analyzer',
  description: 'Analyze your Spotify listening data.',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <UserViewProvider>
          <div className="flex flex-col min-h-screen bg-[#F0FDF4]">
            <header className="bg-white text-gray-800 py-4 px-6 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-6">
                <UsersMenu />
                <Link href="/" className="text-xl font-bold flex items-center gap-2">
                  <Music className="h-6 w-6 text-green-600" />
                  Listening Analyzer
                </Link>
              </div>
              <nav className="flex gap-6">
                <Link
                  href="/"
                  className="flex flex-col items-center text-sm hover:text-green-600 transition-colors"
                >
                  <Home className="h-5 w-5" />
                  Accueil
                </Link>
                <Link
                  href="/upload"
                  className="flex flex-col items-center text-sm hover:text-green-600 transition-colors"
                >
                  <Upload className="h-5 w-5" />
                  Upload
                </Link>
                <Link
                  href="/data"
                  className="flex flex-col items-center text-sm hover:text-green-600 transition-colors"
                >
                  <Table className="h-5 w-5" />
                  Données
                </Link>
                <Link
                  href="/update"
                  className="flex flex-col items-center text-sm hover:text-green-600 transition-colors"
                >
                  <Palette className="h-5 w-5" />
                  Update
                </Link>
                <Link
                  href="/stats"
                  className="flex flex-col items-center text-sm hover:text-green-600 transition-colors"
                >
                  <BarChart className="h-5 w-5" />
                  Statistiques
                </Link>
                <Link
                  href="/graphs"
                  className="flex flex-col items-center text-sm hover:text-green-600 transition-colors"
                >
                  <LineChart className="h-5 w-5" />
                  Analytics
                </Link>
              </nav>
            </header>
            <main className="flex-1 p-6">{children}</main>
          </div>
          <Toaster />
        </UserViewProvider>
      </body>
    </html>
  )
}
