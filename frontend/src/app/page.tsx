'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Home() {
  return (
    <main className="relative min-h-dvh flex flex-col overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-indigo-600/20 blur-[120px] animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-purple-600/20 blur-[100px] animate-float" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-pink-600/10 blur-[140px]" />
        {/* Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 lg:px-12 glass border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-white text-sm shadow-lg shadow-indigo-500/30">U</div>
          <span className="font-bold text-lg text-white">UNO<span className="gradient-text">Platform</span></span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-secondary btn btn-sm">Sign In</Link>
          <Link href="/register" className="btn-primary btn btn-sm">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 gap-8">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="space-y-4 max-w-3xl">
          <div className="badge-primary badge mb-2">🃏 The Ultimate UNO Experience</div>
          <h1 className="text-5xl lg:text-7xl font-black text-white leading-none tracking-tight">
            Play <span className="gradient-text">UNO</span><br />with the World
          </h1>
          <p className="text-lg text-white/60 max-w-xl mx-auto leading-relaxed">
            Real-time multiplayer, custom rules, leaderboards, achievements, and more.
            The most complete UNO platform ever built.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }} className="flex flex-wrap gap-4 justify-center">
          <Link href="/register" className="btn btn-primary btn-lg shadow-xl shadow-indigo-500/30 animate-pulse-glow">
            🎮 Play Free Now
          </Link>
          <Link href="/login?guest=1" className="btn btn-secondary btn-lg">
            👤 Play as Guest
          </Link>
        </motion.div>

        {/* Floating UNO cards */}
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, duration: 0.6 }} className="flex items-end justify-center gap-2 mt-8">
          {[
            { color: 'red', value: '7' }, { color: 'blue', value: 'skip' }, { color: 'green', value: 'reverse' },
            { color: 'wild', value: 'wild' }, { color: 'yellow', value: 'draw_two' }, { color: 'red', value: '0' },
          ].map((card, i) => (
            <div key={i} className={`uno-card ${card.color}`} style={{ animationDelay: `${i * 0.2}s`, animation: 'float 3s ease-in-out infinite' }}>
              <span className="card-corner top-left">{card.value === 'wild' ? 'W' : card.value === 'skip' ? '⊘' : card.value === 'reverse' ? '↻' : card.value === 'draw_two' ? '+2' : card.value}</span>
              <span className="card-value">{card.value === 'wild' ? '🌈' : card.value === 'skip' ? '⊘' : card.value === 'reverse' ? '↻' : card.value === 'draw_two' ? '+2' : card.value}</span>
              <span className="card-corner bot-right">{card.value === 'wild' ? 'W' : card.value === 'skip' ? '⊘' : card.value === 'reverse' ? '↻' : card.value === 'draw_two' ? '+2' : card.value}</span>
            </div>
          ))}
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="grid grid-cols-3 gap-8 mt-8 max-w-sm">
          {[['10K+', 'Players'], ['500+', 'Games/Day'], ['Official', 'UNO Rules']].map(([n, l]) => (
            <div key={l} className="text-center">
              <div className="text-2xl font-black gradient-text">{n}</div>
              <div className="text-xs text-white/40 mt-0.5">{l}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 lg:px-12 max-w-6xl mx-auto w-full">
        <h2 className="text-3xl font-black text-center text-white mb-12">Everything you need to play UNO</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: '⚡', title: 'Real-time Gameplay', desc: 'Sub-100ms WebSocket sync. Never miss a beat.' },
            { icon: '🎯', title: 'Official UNO Rules', desc: 'All official rules + stacking, 7-0, jump-in house rules.' },
            { icon: '🤖', title: 'Smart Bots', desc: 'Play against AI opponents of varying difficulty.' },
            { icon: '🏆', title: 'Leaderboards', desc: 'Compete globally. Climb the XP leaderboard.' },
            { icon: '🎖️', title: 'Achievements', desc: 'Unlock rare achievements as you master the game.' },
            { icon: '💬', title: 'In-Game Chat', desc: 'Chat with opponents and friends during games.' },
            { icon: '👥', title: 'Private Rooms', desc: 'Create password-protected rooms for friends.' },
            { icon: '📊', title: 'Statistics', desc: 'Track every game, move, and win rate.' },
            { icon: '🌙', title: 'Dark Mode', desc: 'Sleek dark UI designed for long gaming sessions.' },
          ].map((f) => (
            <div key={f.title} className="card room-card">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-white text-lg mb-1">{f.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} UNO Platform. Built for card game lovers everywhere.
      </footer>
    </main>
  );
}
