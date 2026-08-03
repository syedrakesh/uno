import type { Metadata } from 'next';
import { Sidebar, MobileNav } from '@/components/layout/Sidebar';

export const metadata: Metadata = { title: 'Dashboard' };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <main className="flex-1 flex flex-col pb-20 lg:pb-0">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
