import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'UNO Platform', template: '%s | UNO Platform' },
  description: 'Play multiplayer UNO online with friends. Real-time gameplay, leaderboards, achievements, and more.',
  keywords: ['UNO', 'card game', 'multiplayer', 'online game', 'board game'],
  authors: [{ name: 'UNO Platform' }],
  openGraph: {
    type: 'website',
    title: 'UNO Platform',
    description: 'Multiplayer UNO online — play with friends worldwide.',
    siteName: 'UNO Platform',
  },
  twitter: { card: 'summary_large_image', title: 'UNO Platform' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#0f1021',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'hsl(224 24% 12%)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
              },
              success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
              error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
