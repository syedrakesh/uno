'use client';
import { useEffect, useState } from 'react';
import { userApi } from '@/lib/api';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp } from 'lucide-react';

export default function LeaderboardPage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [type, setType] = useState<'xp'|'wins'>('xp');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    userApi.leaderboard(type).then(r => { setPlayers(r.data.leaderboard??[]); setLoading(false); });
  }, [type]);

  const medals = ['🥇','🥈','🥉'];

  return (
    <div className="flex-1 p-6 lg:p-8 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-black text-white">Leaderboard</h1><p className="text-white/50 text-sm mt-1">Top players worldwide</p></div>
        <div className="flex gap-2">
          {(['xp','wins'] as const).map(t=>(
            <button key={t} onClick={()=>setType(t)} className={`btn btn-sm ${type===t?'btn-primary':'btn-secondary'}`}>{t==='xp'?'🌟 XP':'🏆 Wins'}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{Array(10).fill(0).map((_,i)=><div key={i} className="skeleton h-16 rounded-2xl"/>)}</div>
      ) : (
        <div className="space-y-2">
          {players.map((p:any,i:number)=>(
            <motion.div key={p.id} initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{delay:i*0.03}}
              className={`card flex items-center gap-4 border ${i<3?'border-yellow-500/30 bg-yellow-500/5':'border-white/5'}`}>
              <div className="w-8 text-center font-black text-lg">{medals[i]??<span className="text-white/30 text-sm">#{i+1}</span>}</div>
              <img src={p.avatar_url} alt={p.name} className="w-10 h-10 rounded-full object-cover"/>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white truncate">{p.name}</p>
                <p className="text-white/40 text-xs">@{p.username} · Level {p.level}</p>
              </div>
              <div className="text-right">
                <div className="font-black text-white text-lg gradient-text">{type==='xp'?(p.xp??0).toLocaleString()+' XP':(p.stats?.games_won??0)+' wins'}</div>
                <div className="text-white/40 text-xs">{p.win_rate}% win rate</div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
