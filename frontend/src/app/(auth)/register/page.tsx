'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';

const schema = z.object({
  name:                  z.string().min(2, 'Name too short').max(60),
  username:              z.string().min(3).max(32).regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers, underscores').optional().or(z.literal('')),
  email:                 z.string().email('Invalid email'),
  password:              z.string().min(8, 'Min 8 characters').regex(/(?=.*[A-Z])(?=.*[0-9])/, 'Must contain uppercase and number'),
  password_confirmation: z.string(),
}).refine(d => d.password === d.password_confirmation, { message: 'Passwords do not match', path: ['password_confirmation'] });

type Form = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isLoading } = useAuthStore();
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    try {
      await registerUser(data);
      toast.success('Account created! Welcome aboard!');
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join('. ') : err.response?.data?.message || 'Registration failed';
      toast.error(msg);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md mx-4">
      <div className="glass-strong rounded-2xl p-8 space-y-6">
        <div className="text-center space-y-1">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-white text-xs">U</div>
            <span className="font-bold text-white">UNO<span className="gradient-text">Platform</span></span>
          </Link>
          <h1 className="text-2xl font-black text-white">Create account</h1>
          <p className="text-white/50 text-sm">Join millions of UNO players</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input {...register('name')} placeholder="Full name" className="input" />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <input {...register('username')} placeholder="Username (optional)" className="input" />
              {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username.message}</p>}
            </div>
          </div>
          <div>
            <input {...register('email')} type="email" placeholder="Email address" className="input" />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <input {...register('password')} type="password" placeholder="Password (min 8, 1 uppercase, 1 number)" className="input" />
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
          </div>
          <div>
            <input {...register('password_confirmation')} type="password" placeholder="Confirm password" className="input" />
            {errors.password_confirmation && <p className="text-red-400 text-xs mt-1">{errors.password_confirmation.message}</p>}
          </div>
          <button type="submit" disabled={isLoading} className="btn btn-primary w-full btn-lg">
            {isLoading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-xs text-white/30">
          By registering you agree to our Terms of Service and Privacy Policy.
        </p>
        <p className="text-center text-sm text-white/40">
          Already have an account? <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">Sign in</Link>
        </p>
      </div>
    </motion.div>
  );
}
