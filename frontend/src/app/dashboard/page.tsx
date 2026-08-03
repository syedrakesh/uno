'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { userApi, roomApi, gameApi } from '@/lib/api';
import { motion } from 'framer-motion';
import { Trophy, Swords, Users, Star, ChevronRight, Plus, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      userApi.myStats().catch(() => ({ data: { stats: null } })),
      roomApi.list({ per_page: 6 }).catch(() => ({ data: { data: [] } })),
      gameApi.history().catch(() => ({ data: { data: [] } })),
    ]).then(([s, r, h]) => {
      setStats(s.data.stats);
      setRooms(r.data.data || []);
      setHistory(h.data.data || []);
      setLoading(false);
    });
  }, []);

  const statCards = [
    { label: 'Games Played', value: stats?.games_played ?? 0,  icon: '🎮', color: 'from-blue-500/20 to-indigo-500/20' },
    { label: 'Games Won',    value: stats?.games_won ?? 0,     icon: '🏆', color: 'from-yellow-500/20 to-orange-500/20' },
    { label: 'Win Rate',     value: user ? `${user.win_rate}%` : '0%', icon: '📈', color: 'from-green-500/20 to-emerald-500/20' },
    { label: 'Win Streak',   value: stats?.current_win_streak ?? 0, icon: '🔥', color: 'from-red-500/20 to-pink-500/20' },
  ];

  return (
    <div className="flex-1 p-6 lg:p-8 space-y-8 max-w-6xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">
            Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 👋
          </h1>
          <p className="text-white/50 text-sm mt-1">Level {user?.level} · {user?.xp} XP</p>
        </div>
        <div className="flex gap-3">
          <Link href="/lobby" className="btn btn-primary">
            <Swords className="w-4 h-4" /> Play Now
          </Link>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className={`card bg-gradient-to-br ${c.color} border-white/10`}>
            <div className="text-3xl mb-2">{c.icon}</div>
            <div className="text-2xl font-black text-white">{loading ? <span className="skeleton h-7 w-16 block" /> : c.value}</div>
            <div className="text-white/50 text-xs mt-1">{c.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Public Rooms */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-white flex items-center gap-2"><Swords className="w-4 h-4 text-indigo-400" /> Open Rooms</h2>
            <Link href="/lobby" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">{Array(3).fill(0).map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-8 text-white/30">
              <p>No open rooms right now</p>
              <Link href="/lobby/create" className="btn btn-primary mt-3 btn-sm inline-flex"><Plus className="w-3 h-3" />Create Room</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {rooms.map((room: any) => (
                <Link key={room.id} href={`/room/${room.code}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 hover:border-indigo-500/30">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center text-lg">🃏</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{room.name}</p>
                    <p className="text-white/40 text-xs">{room.player_count}/{room.max_players} players</p>
                  </div>
                  <span className={`badge ${room.status === 'waiting' ? 'badge-success' : 'badge-warning'}`}>
                    {room.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </motion.div>

        {/* Match History */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-white flex items-center gap-2"><Trophy className="w-4 h-4 text-yellow-400" /> Recent Games</h2>
            <Link href="/history" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">{Array(4).fill(0).map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-white/30"><p>No games played yet</p><p className="text-xs mt-1">Jump in and play your first game!</p></div>
          ) : (
            <div className="space-y-2">
              {history.slice(0, 5).map((g: any) => (
                <div key={g.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className={`text-2xl ${g.winner_id === user?.id ? '' : 'grayscale opacity-50'}`}>
                    {g.winner_id === user?.id ? '🏆' : '💔'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{g.room?.name || 'Unknown Room'}</p>
                    <p className="text-white/40 text-xs">{new Date(g.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`badge ${g.winner_id === user?.id ? 'badge-success' : 'badge-danger'}`}>
                    {g.winner_id === user?.id ? 'WIN' : 'LOSS'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* XP Progress bar */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400" />
            <span className="font-semibold text-white text-sm">Level Progress</span>
          </div>
          <span className="text-white/50 text-xs">{user?.xp ?? 0} XP total</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/50 text-xs font-bold">Lv {(user?.level ?? 1)}</span>
          <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(((user?.xp ?? 0) % (((user?.level ?? 1) ** 2) * 100)) / (((user?.level ?? 1) ** 2) * 100) * 100, 100)}%` }} />
          </div>
          <span className="text-white/50 text-xs font-bold">Lv {(user?.level ?? 1) + 1}</span>
        </div>
      </motion.div>
    </div>
  );
}
