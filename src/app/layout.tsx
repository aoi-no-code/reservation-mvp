import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: { default: '本日のご案内可能枠 | 予約', template: '%s | 予約' },
  description: '本日ご案内可能な限定枠からご予約いただけます。',
  openGraph: {
    title: '本日のご案内可能枠',
    description: '限定枠からご予約をどうぞ。',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
