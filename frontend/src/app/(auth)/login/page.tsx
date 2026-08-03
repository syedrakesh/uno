'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';

const schema = z.object({
  email:    z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
  remember: z.boolean().optional(),
});
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, guestLogin, isLoading } = useAuthStore();
  const [guestLoading, setGuestLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  // Auto-trigger guest login if ?guest=1
  useEffect(() => {
    if (searchParams.get('guest') === '1') {
      handleGuest();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (data: Form) => {
    try {
      await login(data.email, data.password, data.remember);
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed');
    }
  };

  const handleGuest = async () => {
    setGuestLoading(true);
    try {
      await guestLogin();
      toast.success('Joined as guest! 👤');
      router.push('/dashboard');
    } catch { toast.error('Failed to join as guest'); setGuestLoading(false); }
  };


  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md mx-4">
      <div className="glass-strong rounded-2xl p-8 space-y-6">
        <div className="text-center space-y-1">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-white text-xs">U</div>
            <span className="font-bold text-white">UNO<span className="gradient-text">Platform</span></span>
          </Link>
          <h1 className="text-2xl font-black text-white">Welcome back</h1>
          <p className="text-white/50 text-sm">Sign in to continue playing</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <input {...register('email')} type="email" placeholder="Email address" className="input" autoComplete="email" />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <input {...register('password')} type="password" placeholder="Password" className="input" autoComplete="current-password" />
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
              <input {...register('remember')} type="checkbox" className="accent-indigo-500" /> Remember me
            </label>
            <Link href="/forgot-password" className="text-sm text-indigo-400 hover:text-indigo-300">Forgot password?</Link>
          </div>
          <button type="submit" disabled={isLoading} className="btn btn-primary w-full btn-lg">
            {isLoading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="relative flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" /><span className="text-white/30 text-xs">or</span><div className="flex-1 h-px bg-white/10" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <a href={`${process.env.NEXT_PUBLIC_API_URL}/auth/social/google/redirect`} className="btn btn-secondary justify-center text-sm">
            <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Google
          </a>
          <a href={`${process.env.NEXT_PUBLIC_API_URL}/auth/social/github/redirect`} className="btn btn-secondary justify-center text-sm">
            <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
            GitHub
          </a>
        </div>

        <button onClick={handleGuest} disabled={guestLoading || isLoading}
          className="w-full py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-semibold text-sm transition-all flex items-center justify-center gap-2">
          {guestLoading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Joining...</> : '👤 Play as Guest (No Account Needed)'}
        </button>

        <p className="text-center text-sm text-white/40">
          No account? <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-medium">Create one free</Link>
        </p>
      </div>
    </motion.div>
  );
}
