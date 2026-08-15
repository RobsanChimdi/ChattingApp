import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  fallback: ['system-ui', 'arial', 'sans-serif']
});

export const metadata: Metadata = {
  title: {
    default: 'CallMe - Crystal Clear Calls & Messaging',
    template: '%s | CallMe'
  },
  description: 'Experience the future of communication with HD video calls, crystal clear audio, and instant messaging — all secured with end-to-end encryption.',
  keywords: ['video calls', 'audio calls', 'messaging', 'communication', 'webRTC'],
  authors: [{ name: 'CallMe Team' }],
  creator: 'CallMe',
  publisher: 'CallMe',
  openGraph: {
    title: 'CallMe - Crystal Clear Calls & Messaging',
    description: 'Experience the future of communication with HD video calls, crystal clear audio, and instant messaging.',
    url: 'https://callme.com',
    siteName: 'CallMe',
    images: [
      {
        url: 'https://callme.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'CallMe - Crystal Clear Calls & Messaging',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CallMe - Crystal Clear Calls & Messaging',
    description: 'Experience the future of communication with HD video calls, crystal clear audio, and instant messaging.',
    images: ['https://callme.com/twitter-image.jpg'],
    creator: '@callme',
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
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Add any custom head elements here */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=yes" />
        <meta name="theme-color" content="#000000" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}