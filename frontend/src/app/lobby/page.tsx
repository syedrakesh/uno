'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { roomApi } from '@/lib/api';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, Search, Lock, Users, Clock, RefreshCw } from 'lucide-react';

export default function LobbyPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [joining, setJoining] = useState<string|null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await roomApi.list({ search, per_page: 20 });
      setRooms(r.data.data || []);
    } catch { toast.error('Failed to load rooms'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [search]);

  const join = async (code: string, hasPassword: boolean) => {
    setJoining(code);
    let password = '';
    if (hasPassword) { password = prompt('Room password:') || ''; if (!password) { setJoining(null); return; } }
    try {
      await roomApi.join(code, { password });
      router.push(`/room/${code}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to join');
      setJoining(null);
    }
  };

  return (
    <div className="flex-1 p-6 lg:p-8 space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Game Lobby</h1>
          <p className="text-white/50 text-sm mt-1">Join a room or create your own</p>
        </div>
        <div className="flex gap-3">
          <button onClick={load} className="btn btn-secondary btn-sm"><RefreshCw className="w-3 h-3" /></button>
          <Link href="/lobby/create" className="btn btn-primary"><Plus className="w-4 h-4" />Create Room</Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search rooms…" className="input pl-10" />
      </div>

      {/* Rooms */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_,i)=><div key={i} className="skeleton h-40 rounded-2xl"/>)}
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <div className="text-5xl mb-4">🃏</div>
          <p className="text-lg font-bold">No rooms found</p>
          <p className="text-sm">Be the first to create one!</p>
          <Link href="/lobby/create" className="btn btn-primary mt-4 inline-flex"><Plus className="w-4 h-4"/>Create Room</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((r:any,i:number)=>(
            <motion.div key={r.id} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}}
              className="card room-card space-y-4 border border-white/8">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {r.password && <Lock className="w-3 h-3 text-yellow-400 flex-shrink-0"/>}
                    <h3 className="font-bold text-white truncate">{r.name}</h3>
                  </div>
                  <p className="text-white/40 text-xs mt-0.5">by {r.owner?.username}</p>
                </div>
                <span className={`badge flex-shrink-0 ${r.status==='waiting'?'badge-success':'badge-warning'}`}>{r.status}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-white/50">
                <span className="flex items-center gap-1"><Users className="w-3 h-3"/>{r.player_count}/{r.max_players}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3"/>{r.turn_timer_seconds}s/turn</span>
              </div>
              <button onClick={()=>join(r.code,!!r.password)} disabled={r.status!=='waiting'||joining===r.code}
                className="btn btn-primary w-full btn-sm">
                {joining===r.code?'Joining…':r.password?'🔒 Join (Password)':'Join Room'}
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
