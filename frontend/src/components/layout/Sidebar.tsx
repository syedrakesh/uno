'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { notifApi } from '@/lib/api';
import { useEffect, useState } from 'react';
import { 
  LayoutDashboard, Swords, Users, Trophy, User, Settings, 
  LogOut, Bell, ChevronDown, Shield
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/lobby',     icon: Swords,          label: 'Play Now' },
  { href: '/friends',   icon: Users,           label: 'Friends' },
  { href: '/leaderboard', icon: Trophy,        label: 'Leaderboard' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    notifApi.unreadCount().then(r => setUnread(r.data.count)).catch(() => {});
  }, [user]);

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-dvh glass border-r border-white/5 p-4 gap-2">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-3 px-3 py-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-white text-sm shadow-lg shadow-indigo-500/30">U</div>
        <span className="font-bold text-white text-lg">UNO<span className="gradient-text">Platform</span></span>
      </Link>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href} className={`sidebar-link ${pathname.startsWith(href) ? 'active' : ''}`}>
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}

        {user?.role === 'admin' && (
          <Link href="/admin" className={`sidebar-link ${pathname.startsWith('/admin') ? 'active' : ''}`}>
            <Shield className="w-4 h-4" />
            Admin Panel
          </Link>
        )}
      </nav>

      {/* User */}
      <div className="space-y-2 pt-4 border-t border-white/5">
        <Link href="/notifications" className="sidebar-link relative">
          <Bell className="w-4 h-4" />
          Notifications
          {unread > 0 && (
            <span className="ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Link>

        <Link href="/profile" className="sidebar-link">
          <User className="w-4 h-4" />
          Profile
        </Link>

        <Link href="/settings" className="sidebar-link">
          <Settings className="w-4 h-4" />
          Settings
        </Link>

        {/* User card */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5">
          <img src={user?.avatar_url || '/avatar-placeholder.png'} alt={user?.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/50" />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{user?.name}</p>
            <p className="text-white/40 text-xs truncate">Level {user?.level} · {user?.xp} XP</p>
          </div>
        </div>

        <button onClick={logout} className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 glass border-t border-white/5 z-50 flex items-center justify-around px-4 py-2">
      {navItems.map(({ href, icon: Icon, label }) => (
        <Link key={href} href={href} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${pathname.startsWith(href) ? 'text-indigo-400' : 'text-white/40'}`}>
          <Icon className="w-5 h-5" />
          <span className="text-[10px] font-medium">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
