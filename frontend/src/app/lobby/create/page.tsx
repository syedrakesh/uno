'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { roomApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function CreateRoomPage() {
  const router = useRouter();
  const { register, handleSubmit } = useForm({ defaultValues: { name:'My Room',type:'public',max_players:6,turn_timer_seconds:30,points_to_win:500,bot_count:0,bot_difficulty:'medium',allow_spectators:true,settings:{stacking:false,jump_in:false,seven_zero_rule:false,draw_until_can_play:false,force_play:true} } });
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const r = await roomApi.create(data);
      toast.success('Room created!');
      router.push(`/room/${r.data.room.code}`);
    } catch (err: any) { toast.error(err.response?.data?.message||'Failed to create'); setLoading(false); }
  };

  return (
    <div className="flex-1 p-6 lg:p-8 max-w-2xl">
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}>
        <h1 className="text-2xl font-black text-white mb-6">Create Room</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="card space-y-4">
            <h2 className="font-bold text-white">Room Settings</h2>
            <div><label className="text-white/60 text-sm mb-1 block">Room Name</label><input {...register('name',{required:true})} className="input"/></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-white/60 text-sm mb-1 block">Type</label>
                <select {...register('type')} className="input"><option value="public">🌍 Public</option><option value="private">🔒 Private</option><option value="friends_only">👥 Friends Only</option></select>
              </div>
              <div><label className="text-white/60 text-sm mb-1 block">Max Players</label>
                <select {...register('max_players',{valueAsNumber:true})} className="input">{[2,3,4,5,6,7,8,9,10].map(n=><option key={n} value={n}>{n} Players</option>)}</select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-white/60 text-sm mb-1 block">Turn Timer (seconds)</label>
                <select {...register('turn_timer_seconds',{valueAsNumber:true})} className="input">{[10,15,20,30,45,60,90,120].map(n=><option key={n} value={n}>{n}s</option>)}</select>
              </div>
              <div><label className="text-white/60 text-sm mb-1 block">Points to Win</label>
                <select {...register('points_to_win',{valueAsNumber:true})} className="input">{[100,200,300,500,750,1000].map(n=><option key={n} value={n}>{n}</option>)}</select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-white/60 text-sm mb-1 block">Bot Players</label>
                <select {...register('bot_count',{valueAsNumber:true})} className="input">{[0,1,2,3,4,5].map(n=><option key={n} value={n}>{n} Bots</option>)}</select>
              </div>
              <div><label className="text-white/60 text-sm mb-1 block">Bot Difficulty</label>
                <select {...register('bot_difficulty')} className="input"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select>
              </div>
            </div>
          </div>

          <div className="card space-y-4">
            <h2 className="font-bold text-white">House Rules</h2>
            {[['settings.stacking','🔄 Card Stacking (stack +2/+4)'],['settings.jump_in','⚡ Jump In (play matching card anytime)'],['settings.seven_zero_rule','7️⃣ 7-0 Rule (swap/rotate hands)'],['settings.draw_until_can_play','🃏 Draw Until Playable'],['settings.force_play','⚠️ Force Play (must play if able)'],['allow_spectators','👁️ Allow Spectators']].map(([key,label])=>(
              <label key={key} className="flex items-center justify-between cursor-pointer">
                <span className="text-white/70 text-sm">{label}</span>
                <input type="checkbox" {...register(key as any)} className="w-5 h-5 accent-indigo-500 cursor-pointer"/>
              </label>
            ))}
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary w-full btn-lg">
            {loading?'Creating…':'🎮 Create Room'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
