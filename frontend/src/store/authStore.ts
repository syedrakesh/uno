import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/lib/api';
import { disconnectEcho } from '@/lib/echo';

export interface User {
  id: number;
  name: string;
  username: string;
  email?: string;
  avatar_url: string;
  role: 'admin' | 'moderator' | 'user';
  status: 'online' | 'offline' | 'in_game' | 'away';
  xp: number;
  level: number;
  coins?: number;
  is_guest: boolean;
  bio?: string;
  country?: string;
  dark_mode?: boolean;
  sound_enabled?: boolean;
  preferred_language?: string;
  win_rate: number;
  email_verified: boolean;
  stats?: UserStats;
}

export interface UserStats {
  games_played: number;
  games_won: number;
  games_lost: number;
  rounds_won: number;
  cards_played: number;
  uno_calls: number;
  successful_challenges: number;
  longest_win_streak: number;
  current_win_streak: number;
  total_play_time_seconds: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  guestLogin: () => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  username?: string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,

      login: async (email, password, remember = false) => {
        set({ isLoading: true });
        try {
          const res = await authApi.login({ email, password, remember });
          const { user, token } = res.data;
          localStorage.setItem('auth_token', token);
          set({ user, token, isAuthenticated: true, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const res = await authApi.register(data);
          const { user, token } = res.data;
          localStorage.setItem('auth_token', token);
          set({ user, token, isAuthenticated: true, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      guestLogin: async () => {
        set({ isLoading: true });
        try {
          const res = await authApi.guestLogin();
          const { user, token } = res.data;
          localStorage.setItem('auth_token', token);
          set({ user, token, isAuthenticated: true, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        try { await authApi.logout(); } catch {}
        localStorage.removeItem('auth_token');
        disconnectEcho();
        set({ user: null, token: null, isAuthenticated: false });
      },

      fetchMe: async () => {
        try {
          const res = await authApi.me();
          set({ user: res.data.user, isAuthenticated: true });
        } catch {
          set({ user: null, token: null, isAuthenticated: false });
          localStorage.removeItem('auth_token');
        }
      },

      setUser: (user) => set({ user }),
      setToken: (token) => {
        localStorage.setItem('auth_token', token);
        set({ token });
      },
    }),
    {
      name: 'uno-auth',
      partialize: (s) => ({ token: s.token }),
    }
  )
);
