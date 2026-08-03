'use client';

import { useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { useAuthStore } from '@/store/authStore';

export function Providers({ children }: { children: React.ReactNode }) {
  const { token, fetchMe } = useAuthStore();

  // Always re-validate token on mount to restore session
  useEffect(() => {
    if (token) {
      fetchMe();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {children}
    </ThemeProvider>
  );
}
