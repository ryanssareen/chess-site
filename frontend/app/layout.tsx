import './globals.css';
import type { Metadata } from 'next';
import { ThemeProvider } from '../components/ThemeProvider';
import { Navbar } from '../components/Navbar';

export const metadata: Metadata = {
  title: 'Chess Training Platform | ryansucksatlifetoo',
  description: 'Single-user chess training with AI sparring, Chess.com review, and focused analysis.',
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
