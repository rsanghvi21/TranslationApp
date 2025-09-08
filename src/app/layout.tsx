import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'पवित्रानुवादक - AI-Powered PDF Translation',
  description: 'Upload PDFs or paste text in any language and get beautiful bilingual documents with English translations. Powered by OpenAI and Google Gemini.',
  keywords: ['translation', 'PDF', 'AI', 'bilingual', 'OpenAI', 'Gemini', 'multilingual'],
  authors: [{ name: 'पवित्रानुवादक' }],
  creator: 'पवित्रानुवादक',
  publisher: 'पवित्रानुवादक',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'पवित्रानुवादक - AI-Powered PDF Translation',
    description: 'Upload PDFs or paste text in any language and get beautiful bilingual documents with English translations.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'पवित्रानुवादक - AI-Powered PDF Translation',
    description: 'Upload PDFs or paste text in any language and get beautiful bilingual documents with English translations.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add your verification codes here if needed
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
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}
