'use client';

import { useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { useAuthStore } from '@/store/authStore';

export function Providers({ children }: { children: React.ReactNode }) {
  const { token, fetchMe, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (token && !isAuthenticated) {
      fetchMe();
    }
  }, [token, isAuthenticated, fetchMe]);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {children}
    </ThemeProvider>
  );
}
