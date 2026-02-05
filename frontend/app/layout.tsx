import './globals.css';
import type { Metadata } from 'next';
import { ThemeProvider } from '../components/ThemeProvider';
import { Navbar } from '../components/Navbar';

export const metadata: Metadata = {
  title: 'Arcade Chess | Play & Improve',
  description: 'Modern open-source chess platform for real-time play, AI training, and analysis.',
  icons: {
    icon: '/favicon.ico'
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <Navbar />
          <main className="mx-auto max-w-6xl px-4 pb-16 pt-6">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
