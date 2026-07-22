import Providers from '@/components/layout/providers';
import { Toaster } from '@/components/ui/sonner';
import type { Metadata, Viewport } from 'next';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Orbitron, Share_Tech_Mono } from 'next/font/google';
import NextTopLoader from 'nextjs-toploader';
import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';

export const metadata: Metadata = {
  title: 'CVTailor',
  description:
    'Modern resume builder with AI-powered content generation and multiple template designs',
  keywords: [
    'resume builder',
    'AI resume',
    'job application',
    'CV maker',
    'professional resume',
    'Next.js',
    'React',
    'PDF resume'
  ],
  authors: [
    {
      name: 'Kiran',
      url: 'https://github.com/Kiranism'
    }
  ],
  creator: 'Kiran',
  publisher: 'Kiran',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true
    }
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://next-resume-ai.vercel.app',
    title: 'CVTailor',
    description:
      'Modern resume builder with AI-powered content generation and multiple template designs',
    siteName: 'CVTailor',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CVTailor'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CVTailor',
    description:
      'Modern resume builder with AI-powered content generation and multiple template designs',
    images: ['/og-image.png']
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png'
  },
  manifest: '/site.webmanifest',
  category: 'productivity',
  applicationName: 'CVTailor',
  generator: 'Next.js'
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' }
  ]
};

// Cyberpunk theme fonts. Orbitron -> --font-sans, Share Tech Mono -> --font-mono.
// Georgia (--font-serif) is a system font, set in globals.css (not on Google Fonts).
const fontSans = Orbitron({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap'
});

const fontMono = Share_Tech_Mono({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-mono',
  display: 'swap'
});

export default async function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang='en'
      className={`${fontSans.variable} ${fontMono.variable}`}
      suppressHydrationWarning
    >
      <body className={'overflow-hidden'}>
        <NextTopLoader showSpinner={false} />
        <ClerkProvider
          signInUrl='/sign-in'
          signUpUrl='/sign-up'
          afterSignOutUrl={'/sign-in'}
        >
          <NuqsAdapter>
            <Providers>
              <Toaster />
              {children}
            </Providers>
          </NuqsAdapter>
        </ClerkProvider>
      </body>
    </html>
  );
}
