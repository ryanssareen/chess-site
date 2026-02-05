'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { ReactNode, useEffect } from 'react';

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const stored = window.localStorage.getItem('theme');
    if (stored) {
      document.body.classList.toggle('light', stored === 'light');
    }
  }, []);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      value={{ light: 'light', dark: 'dark' }}
    >
      {children}
    </NextThemesProvider>
  );
}
