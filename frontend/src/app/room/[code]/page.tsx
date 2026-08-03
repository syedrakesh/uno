'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { roomApi, gameApi } from '@/lib/api';
import { listenRoom } from '@/lib/echo';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Crown, LogOut, Play, Check, X, Shield, Settings } from 'lucide-react';

export default function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const [room, setRoom] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const isOwner = room?.owner_id === user?.id;
  const myPlayer = room?.players?.find((p: any) => p.user_id === user?.id);

  const loadRoom = async () => {
    try {
      let r = await roomApi.get(code);
      
      // Auto-join if not in the room
      if (user && !r.data.room.players.some((p: any) => p.user_id === user.id)) {
        try {
          await roomApi.join(code);
          r = await roomApi.get(code); // reload with me in it
        } catch (joinErr: any) {
          toast.error(joinErr.response?.data?.message || 'Failed to join room');
          router.push('/lobby');
          return;
        }
      }
      
      setRoom(r.data.room);
      const c = await roomApi.chat(code);
      setMessages((c.data.data ?? []).reverse());
    } catch { toast.error('Room not found'); router.push('/lobby'); }
    setLoading(false);
  };

  useEffect(() => { loadRoom(); }, [code]);

  useEffect(() => {
    if (!room) return;
    const cleanup = listenRoom(room.id, {
      onUpdated: (e: any) => {
        if (e.type === 'game_started' && e.game_id) { router.push(`/game/${e.game_id}`); return; }
        loadRoom();
      },
      onChat: (msg: any) => setMessages(prev => [...prev, msg]),
    });
    return cleanup;
  }, [room?.id]);

  useEffect(() => { chatRef.current?.scrollTo(0, chatRef.current.scrollHeight); }, [messages]);

  const sendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput('');
    try { await roomApi.sendChat(code, { message: msg }); } catch { toast.error('Failed to send'); }
  };

  const toggleReady = async () => {
    try { await roomApi.ready(code); loadRoom(); } catch { toast.error('Error'); }
  };

  const startGame = async () => {
    setStarting(true);
    try { 
      const res = await gameApi.start(code); 
      if (res.data?.game?.id) {
        router.push(`/game/${res.data.game.id}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Cannot start game');
      setStarting(false);
    }
  };

  const leaveRoom = async () => {
    await roomApi.leave(code).catch(() => {});
    router.push('/lobby');
  };

  if (loading) return <div className="flex items-center justify-center min-h-dvh"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/></div>;

  const players = room?.players?.filter((p:any) => ['owner','player','bot'].includes(p.role)) ?? [];
  const allReady = players.every((p:any) => p.is_ready);

  return (
    <div className="flex flex-col lg:flex-row min-h-dvh max-h-dvh overflow-hidden">
      {/* Main */}
      <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">{room?.name}</h1>
            <p className="text-white/50 text-sm">Room code: <span className="font-mono font-bold text-indigo-400">{code}</span></p>
          </div>
          <div className="flex gap-2">
            {isOwner && <button onClick={startGame} disabled={starting || players.length < 2 || !allReady} className="btn btn-success"><Play className="w-4 h-4"/>{starting?'Starting…':'Start Game'}</button>}
            {!isOwner && <button onClick={toggleReady} className={`btn ${myPlayer?.is_ready?'btn-secondary':'btn-primary'}`}>{myPlayer?.is_ready?<><X className="w-4 h-4"/>Not Ready</>:<><Check className="w-4 h-4"/>Ready</>}</button>}
            <button onClick={leaveRoom} className="btn btn-danger btn-sm"><LogOut className="w-4 h-4"/></button>
          </div>
        </div>

        {/* Players Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({length: room?.max_players}).map((_,i) => {
            const p = players[i];
            return (
              <motion.div key={i} initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} transition={{delay:i*0.05}}
                className={`card flex flex-col items-center gap-3 border ${p?'border-white/10':'border-dashed border-white/10'} py-4`}>
                {p ? (
                  <>
                    <div className="relative">
                      <img src={p.user?.avatar_url||`https://ui-avatars.com/api/?name=${p.user?.name}&background=6366f1&color=fff`} className="w-12 h-12 rounded-full object-cover" alt={p.user?.name}/>
                      {p.role==='owner'&&<div className="absolute -top-2 -right-2"><Crown className="w-4 h-4 text-yellow-400"/></div>}
                      {p.role==='bot'&&<div className="absolute -bottom-1 -right-1 bg-purple-500 rounded-full p-0.5"><Shield className="w-3 h-3 text-white"/></div>}
                    </div>
                    <p className="font-semibold text-white text-sm truncate max-w-full px-2">{p.user?.name}</p>
                    <span className={`badge ${p.is_ready?'badge-success':'badge-warning'}`}>{p.is_ready?'✓ Ready':'Waiting…'}</span>
                    {isOwner && p.user_id!==user?.id && (
                      <button onClick={()=>roomApi.kick(code,p.user_id).then(loadRoom)} className="text-xs text-red-400 hover:text-red-300">kick</button>
                    )}
                  </>
                ) : (
                  <div className="text-center text-white/20">
                    <div className="text-3xl mb-2">+</div>
                    <div className="text-xs">Empty Slot</div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Room Settings summary */}
        {room?.settings && (
          <div className="card space-y-2">
            <h3 className="text-white/70 text-sm font-semibold flex items-center gap-2"><Settings className="w-4 h-4"/>Rules</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(room.settings).map(([k,v]:any) => v && (
                <span key={k} className="badge-primary badge text-xs">{k.replace(/_/g,' ')}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chat */}
      <div className="lg:w-80 border-t lg:border-t-0 lg:border-l border-white/5 flex flex-col h-80 lg:h-auto">
        <div className="px-4 py-3 border-b border-white/5 font-semibold text-white text-sm">💬 Chat</div>
        <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-2">
          <AnimatePresence>
            {messages.map((m:any) => (
              <motion.div key={m.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="flex gap-2 items-start">
                <img src={m.user_avatar||`https://ui-avatars.com/api/?name=${m.user_name}&size=32`} className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5" alt=""/>
                <div>
                  <span className="text-white/50 text-xs font-medium">{m.user_name}</span>
                  <p className="text-white text-sm leading-snug">{m.message}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <form onSubmit={sendChat} className="p-3 flex gap-2 border-t border-white/5">
          <input value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Say something…" className="input flex-1 py-2 text-sm" maxLength={500}/>
          <button type="submit" className="btn btn-primary p-2"><Send className="w-4 h-4"/></button>
        </form>
      </div>
    </div>
  );
}
