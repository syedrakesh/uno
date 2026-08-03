'use client';
import { useEffect, useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, UnoCard } from '@/store/gameStore';
import { useAuthStore } from '@/store/authStore';
import { gameApi } from '@/lib/api';
import { listenGame } from '@/lib/echo';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';


// ─── UNO Card Component ───────────────────────────────────────────
function CardComponent({ card, playable, selected, onClick }: {
  card: UnoCard; playable: boolean; selected: boolean; onClick?: () => void;
}) {
  const labelMap: Record<string, string> = {
    skip: '⊘', reverse: '↻', draw_two: '+2', wild: '🌈', wild_draw_four: '+4'
  };
  const label = labelMap[card.value] ?? card.value;

  return (
    <motion.div
      layoutId={card.id}
      initial={{ scale: 0.8, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.5, opacity: 0, y: -40 }}
      whileHover={playable ? { y: -16, scale: 1.08 } : {}}
      onClick={playable ? onClick : undefined}
      className={`uno-card ${card.color} ${selected ? 'selected' : ''} ${!playable ? 'disabled' : ''}`}
      title={playable ? `Play ${label}` : 'Cannot play now'}
    >
      <span className="card-corner top-left">{label}</span>
      <span className="card-value text-2xl font-black text-white drop-shadow-lg">{label}</span>
      <span className="card-corner bot-right">{label}</span>
    </motion.div>
  );
}

// ─── Opponent Hand (face-down) ────────────────────────────────────
function OpponentHand({ count, name, avatarUrl, isActive, calledUno }: {
  count: number; name: string; avatarUrl?: string; isActive: boolean; calledUno: boolean;
}) {
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Player')}&background=6366f1&color=fff&size=128`;
  const [src, setSrc] = useState(avatarUrl || fallback);

  useEffect(() => {
    setSrc(avatarUrl || fallback);
  }, [avatarUrl, name]);

  return (
    <div className={`flex flex-col items-center gap-2 ${isActive ? 'scale-110' : 'opacity-70'} transition-all`}>
      <div className={`relative player-ring ${isActive ? 'active' : ''}`}>
        <img
          src={src}
          alt={name}
          onError={() => setSrc(fallback)}
          className="w-12 h-12 rounded-full object-cover ring-2 ring-white/20 shadow-md"
        />
        {isActive && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-gray-900 animate-pulse" />}
        {calledUno && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black px-1 py-0.5 rounded-full animate-bounce">UNO!</div>
        )}
      </div>
      <span className="text-white/70 text-xs font-medium">{name}</span>
      <div className="flex gap-[-6px]">
        {Array.from({ length: Math.min(count, 7) }).map((_, i) => (
          <div key={i} className="uno-card-back w-8 h-12 rounded-md -ml-2 first:ml-0 border border-indigo-500/30"
            style={{ transform: `rotate(${(i - Math.min(count,7)/2) * 3}deg)` }} />
        ))}
        {count > 7 && <span className="text-white/40 text-xs self-end ml-1">+{count - 7}</span>}
      </div>
    </div>
  );
}

// ─── Color Picker ─────────────────────────────────────────────────
function ColorPicker({ onSelect }: { onSelect: (c: string) => void }) {
  const colors = ['red', 'green', 'blue', 'yellow'] as const;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="glass-strong rounded-2xl p-8 space-y-4 text-center">
        <h3 className="text-white font-bold text-lg">Choose a color</h3>
        <div className="grid grid-cols-2 gap-3">
          {colors.map(c => (
            <button key={c} onClick={() => onSelect(c)}
              className={`w-20 h-20 rounded-2xl border-4 border-white/20 hover:border-white hover:scale-110 transition-all uno-card ${c}`}>
              <span className="sr-only">{c}</span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Confetti Particle ────────────────────────────────────────────
function ConfettiParticle({ color, x, delay }: { color: string; x: number; delay: number }) {
  const size = Math.random() * 10 + 6;
  return (
    <motion.div
      initial={{ y: -20, x, opacity: 1, rotate: 0, scale: 1 }}
      animate={{ y: '110vh', rotate: Math.random() * 720 - 360, opacity: [1, 1, 0], scale: [1, 0.8, 0.3] }}
      transition={{ duration: Math.random() * 3 + 2, delay, ease: 'easeIn' }}
      className="fixed pointer-events-none z-[100]"
      style={{ width: size, height: size, background: color, borderRadius: Math.random() > 0.5 ? '50%' : '2px', top: 0 }}
    />
  );
}

// ─── Game Over Screen ─────────────────────────────────────────────
function GameOverScreen({ gameId }: { gameId: number }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { winnerId, gameResult, players, reset } = useGameStore();
  const isWinner = winnerId === user?.id;
  const winner = gameResult?.players.find((p: any) => p.user_id === winnerId) ?? players.find(p => p.user_id === winnerId);
  const myResult = gameResult?.players.find((p: any) => p.user_id === user?.id);

  const confettiColors = ['#f59e0b','#6366f1','#10b981','#ef4444','#3b82f6','#ec4899','#f97316','#a855f7'];
  const confettiItems = isWinner ? Array.from({ length: 80 }).map((_, i) => ({
    color: confettiColors[i % confettiColors.length],
    x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1200),
    delay: i * 0.04,
  })) : [];

  const resultPlayers = gameResult?.players.length
    ? [...gameResult.players].sort((a, b) => (a.finish_position ?? 99) - (b.finish_position ?? 99))
    : players;

  const formatDuration = (sec: number | null) => {
    if (!sec) return '—';
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${m}m ${s}s`;
  };

  const handlePlayAgain = async () => {
    try {
      const state = useGameStore.getState();
      if (state.roomCode) { reset(); router.push(`/room/${state.roomCode}`); }
      else { reset(); router.push('/lobby'); }
    } catch { reset(); router.push('/lobby'); }
  };

  const handleGoHome = () => { reset(); router.push('/dashboard'); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{ background: isWinner ? 'radial-gradient(ellipse at center, #1e1b4b 0%, #0f0e17 100%)' : 'radial-gradient(ellipse at center, #1a0a0a 0%, #0f0e17 100%)' }}>

      {/* Confetti */}
      {confettiItems.map((c, i) => <ConfettiParticle key={i} {...c} />)}

      {/* Animated background rings */}
      {isWinner && (
        <>
          <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0, 0.2] }} transition={{ duration: 3, repeat: Infinity }}
            className="absolute w-96 h-96 rounded-full border border-yellow-500/30 pointer-events-none" />
          <motion.div animate={{ scale: [1.2, 1.8, 1.2], opacity: [0.15, 0, 0.15] }} transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
            className="absolute w-96 h-96 rounded-full border border-indigo-500/30 pointer-events-none" />
        </>
      )}

      <div className="relative z-10 w-full max-w-lg mx-4 space-y-6">
        {/* Trophy / Broken heart */}
        <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', bounce: 0.6, duration: 0.8 }}
          className="text-center">
          <div className="text-9xl mb-4">{isWinner ? '🏆' : '💔'}</div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className={`text-5xl font-black ${isWinner ? 'text-yellow-400' : 'text-white/80'}`}
            style={isWinner ? { textShadow: '0 0 40px rgba(251,191,36,0.6)' } : {}}>
            {isWinner ? 'VICTORY!' : `${winner?.name ?? 'Player'} Wins!`}
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            className="text-white/50 mt-2 text-lg">
            {isWinner ? 'Incredible! You played like a pro.' : 'Better luck next time!'}
            {gameResult?.duration_seconds ? <span className="ml-2">· {formatDuration(gameResult.duration_seconds)}</span> : null}
          </motion.p>
        </motion.div>

        {/* Player scorecards */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="space-y-3">
          {resultPlayers.map((p: any, i: number) => {
            const isMe = p.user_id === user?.id;
            const isWin = p.user_id === winnerId;
            return (
              <motion.div key={p.user_id}
                initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.8 + i * 0.1 }}
                className={`flex items-center gap-4 p-4 rounded-2xl border ${isWin ? 'bg-yellow-500/10 border-yellow-500/40' : 'bg-white/5 border-white/10'} ${isMe ? 'ring-2 ring-indigo-500/60' : ''}`}>
                <div className="text-2xl w-8 text-center">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {p.avatar ? <img src={p.avatar} className="w-10 h-10 rounded-full" alt={p.name} /> : (
                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">{(p.name ?? 'P')[0].toUpperCase()}</div>
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-white text-sm truncate">{p.name} {isMe && <span className="text-indigo-400">(You)</span>}</p>
                    <p className="text-white/40 text-xs">{p.score ?? 0} pts</p>
                  </div>
                </div>
                {p.xp_earned != null && (
                  <div className="text-right">
                    <p className="text-green-400 font-bold text-sm">+{p.xp_earned} XP</p>
                    {isWin && <p className="text-yellow-400 text-xs">Winner!</p>}
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {/* XP gained banner for current user */}
        {myResult?.xp_earned != null && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.2 }}
            className="flex items-center justify-center gap-3 py-3 px-6 rounded-2xl bg-indigo-600/20 border border-indigo-500/30">
            <span className="text-2xl">⭐</span>
            <span className="text-indigo-300 font-semibold">You earned <span className="text-white font-black">{myResult.xp_earned} XP</span> this game!</span>
          </motion.div>
        )}

        {/* Action buttons */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4 }}
          className="flex gap-3">
          <button onClick={handlePlayAgain}
            className="flex-1 py-4 px-6 rounded-2xl font-black text-lg text-white transition-all hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', boxShadow: '0 0 30px rgba(99,102,241,0.5)' }}>
            🎮 Play Again
          </button>
          <button onClick={handleGoHome}
            className="py-4 px-6 rounded-2xl font-bold text-white/70 bg-white/5 border border-white/10 hover:bg-white/10 transition-all hover:scale-105 active:scale-95">
            🏠 Home
          </button>
        </motion.div>
      </div>
    </div>
  );
}

// ─── Turn Timer Bar ───────────────────────────────────────────────
function TurnTimer({ seconds, total }: { seconds: number; total: number }) {
  const pct = (seconds / total) * 100;
  return (
    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-1000 ${pct < 30 ? 'urgent' : ''} turn-timer-bar`}
        style={{ width: `${pct}%` }} />
    </div>
  );
}


// ─── Main Game Board ──────────────────────────────────────────────
export function GameBoard({ gameId }: { gameId: number }) {
  const { user } = useAuthStore();
  const {
    state, players, selectedCard, showColorPicker, gameEnded, winnerId,
    turnTimeLeft, setState, setPlayers, selectCard, setShowColorPicker,
    applyCardPlayed, applyTurnChanged, applyGameEnded, setTurnTimeLeft,
  } = useGameStore();

  const isMyTurn = state?.current_player_id === user?.id;
  const [dealing, setDealing] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial state
  useEffect(() => {
    setDealing(true);
    gameApi.state(gameId).then(r => {
      setState(r.data.state);
      // Use top-level players (with avatar_url resolved) or fall back to game.players
      const playerList = r.data.players ?? r.data.game?.players ?? [];
      setPlayers(playerList);
      // If game already ended (e.g., rejoining a finished game), show game over screen
      if (r.data.game?.status === 'finished' && r.data.game?.winner_id) {
        applyGameEnded({ winner_id: r.data.game.winner_id });
      }
      setTimeout(() => setDealing(false), 1400);
    }).catch(() => toast.error('Failed to load game state'));
  }, [gameId]);

  // WebSocket
  useEffect(() => {
    const cleanup = listenGame(gameId, {
      onStateUpdated: (e) => {
        gameApi.state(gameId).then(r => setState(r.data.state));
      },
      onCardPlayed:  applyCardPlayed,
      onTurnChanged: applyTurnChanged,
      onGameEnded:   applyGameEnded,
    });
    return cleanup;
  }, [gameId]);

  // Turn timer
  useEffect(() => {
    if (!isMyTurn || !state?.turn_started_at) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const deadline = new Date(state.turn_started_at).getTime() + 30_000;
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setTurnTimeLeft(remaining);
      if (remaining === 0 && timerRef.current) clearInterval(timerRef.current);
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isMyTurn, state?.turn_started_at]);

  const myHand = state?.my_hand ?? [];
  const myPlayer = players.find(p => p.user_id === user?.id);
  const opponents = players.filter(p => p.user_id !== user?.id);

  const canPlay = useCallback((card: UnoCard) => {
    if (!isMyTurn || !state) return false;
    if (!state.top_card) return true;
    if (card.color === 'wild') return true;
    if (card.color === state.current_color) return true;
    if (card.value === state.top_card.value) return true;
    if (state.pending_draw > 0) {
      // Only stacking cards
      return (card.value === 'draw_two' && state.top_card.value === 'draw_two') ||
             card.value === 'wild_draw_four';
    }
    return false;
  }, [isMyTurn, state]);

  const handleCardClick = async (card: UnoCard) => {
    if (!canPlay(card)) return;
    if (card.color === 'wild') {
      selectCard(card);
      setShowColorPicker(true);
      return;
    }
    await playCard(card.id, null);
  };

  const playCard = async (cardId: string, chosenColor: string | null) => {
    setShowColorPicker(false);
    selectCard(null);
    try {
      const r = await gameApi.playCard(gameId, { card_id: cardId, chosen_color: chosenColor });
      setState(r.data.state);
      // If round finished with a winner_id, polling effect will detect game-over shortly
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid move');
    }
  };

  const handleDraw = async () => {
    if (!isMyTurn) return;
    try {
      const r = await gameApi.drawCard(gameId);
      setState(r.data.state);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Cannot draw');
    }
  };

  const handleUno = async () => {
    try {
      await gameApi.callUno(gameId);
      toast.success('UNO! 🎉');
    } catch { toast.error('Cannot call UNO now'); }
  };

  // When a round finishes, poll game status to detect game over OR auto-start next round
  useEffect(() => {
    if (state?.status !== 'finished' || gameEnded) return;

    // Poll the game status to detect if endGame was called (game.status = 'finished')
    const pollTimer = setInterval(async () => {
      try {
        const full = await gameApi.state(gameId);
        const game = full.data.game;
        if (game?.status === 'finished' && game?.winner_id) {
          clearInterval(pollTimer);
          applyGameEnded({ winner_id: game.winner_id });
        }
      } catch {}
    }, 1500);

    // Host auto-starts next round after 5 seconds (only if game not over)
    const isHost = players.filter(p => p.type === 'human').sort((a, b) => a.seat - b.seat)[0]?.user_id === user?.id;
    let roundTimer: NodeJS.Timeout | null = null;
    if (isHost) {
      roundTimer = setTimeout(async () => {
        // Don't start new round if game ended in the meantime
        const full = await gameApi.state(gameId).catch(() => null);
        if (full?.data?.game?.status === 'finished') return;
        setDealing(true);
        gameApi.nextRound(gameId).then(r => {
          setState(r.data.state);
          setTimeout(() => setDealing(false), 1400);
        }).catch(() => toast.error('Failed to start next round'));
      }, 5000);
    }

    return () => {
      clearInterval(pollTimer);
      if (roundTimer) clearTimeout(roundTimer);
    };
  }, [state?.status, gameEnded, players, user?.id, gameId]);

  if (gameEnded) {
    return <GameOverScreen gameId={gameId} />;
  }

  // Overlay for when a round finishes (but game is not over)
  const roundFinishedOverlay = state?.status === 'finished' ? (
    <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-6">
        <h2 className="text-5xl font-black text-white">Round Over!</h2>
        <p className="text-2xl text-white/80">
          {players.find(p => p.user_id === state.winner_id)?.name} won the round.
        </p>
        <div className="flex flex-col items-center gap-2 pt-4">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-indigo-300">Starting next round...</p>
        </div>
      </motion.div>
    </div>
  ) : null;

  return (
    <div className="flex flex-col min-h-dvh bg-[hsl(var(--surface-bg))] relative">
      {roundFinishedOverlay}

      {/* Card Dealing Animation Overlay */}
      <AnimatePresence>
        {dealing && (
          <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center pointer-events-none">
            <div className="relative w-40 h-40">
              {Array.from({ length: 7 }).map((_, i) => (
                <motion.div key={i}
                  initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                  animate={{ x: (i - 3) * 55, y: 80, rotate: (i - 3) * 8, opacity: 1 }}
                  transition={{ delay: i * 0.1, duration: 0.4, ease: 'backOut' }}
                  className="absolute top-0 left-0 w-16 h-24 rounded-xl uno-card-back border border-indigo-500/50" />
              ))}
            </div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="absolute bottom-1/3 text-white/60 text-lg font-semibold tracking-widest uppercase">
              Dealing Cards...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Opponents */}
      <div className="flex items-center justify-center gap-8 pt-6 px-6 flex-wrap">
        {opponents.map(p => {
          const playerName = p.user?.name || p.name || 'Player';
          const playerAvatar = p.user?.avatar_url || p.avatar_url;
          return (
            <OpponentHand key={p.user_id}
              count={typeof state?.hands?.[p.user_id] === 'number' ? state.hands[p.user_id] as number : 7}
              name={playerName}
              avatarUrl={playerAvatar}
              isActive={state?.current_player_id === p.user_id}
              calledUno={p.called_uno} />
          );
        })}
      </div>

      {/* Game Table */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="game-table rounded-3xl w-full max-w-2xl aspect-video flex flex-col items-center justify-center gap-6 relative overflow-hidden">
          
          {/* Action Overlay Animation */}
          <AnimatePresence>
            {state?.top_card && ['reverse', 'skip', 'draw_two', 'wild_draw_four'].includes(state.top_card.value) && (
              <motion.div
                key={`action-${state.top_card.id}`}
                initial={{ scale: 0.5, opacity: 0, y: 50 }}
                animate={{ scale: [1, 1.5, 1.2], opacity: [0, 1, 0], y: [0, -50, -100] }}
                transition={{ duration: 1.5, times: [0, 0.4, 1], ease: 'easeOut' }}
                className="absolute inset-0 pointer-events-none flex items-center justify-center z-40"
              >
                <span className={`text-8xl drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] font-black ${state.current_color === 'red' ? 'text-red-500' : state.current_color === 'blue' ? 'text-blue-500' : state.current_color === 'green' ? 'text-green-500' : state.current_color === 'yellow' ? 'text-yellow-400' : 'text-white'}`}>
                  {state.top_card.value === 'reverse' ? '↻ REVERSE' :
                   state.top_card.value === 'skip' ? '⊘ SKIP' :
                   state.top_card.value === 'draw_two' ? '+2' :
                   state.top_card.value === 'wild_draw_four' ? '+4' : ''}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Turn info */}
          <div className="absolute top-4 inset-x-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-sm">
                {isMyTurn ? <span className="text-green-400 font-bold animate-pulse">⚡ Your Turn</span> : `${players.find(p => p.user_id === state?.current_player_id)?.name ?? '...'}'s turn`}
              </span>
              {state?.pending_draw && state.pending_draw > 0 ? (
                <span className="badge-danger badge">Stack: +{state.pending_draw}</span>
              ) : null}
              <span className="text-white/40 text-xs">
                {state?.direction === 'clockwise' ? '↻ CW' : '↺ CCW'}
              </span>
            </div>
            {isMyTurn && <TurnTimer seconds={turnTimeLeft} total={30} />}
          </div>

          {/* Top card + Draw pile */}
          <div className="flex items-center gap-8">
            {/* Draw pile */}
            <div onClick={handleDraw} className={`w-[70px] h-[105px] rounded-xl uno-card-back border border-indigo-500/30 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform ${!isMyTurn && 'opacity-50 cursor-not-allowed'}`}>
              <div className="text-center">
                <div className="text-xs text-indigo-400 font-bold">{state?.draw_pile_count}</div>
                <div className="text-xs text-white/30 mt-1">DRAW</div>
              </div>
            </div>

            {/* Top of discard */}
            <AnimatePresence mode="popLayout">
              {state?.top_card && (
                <motion.div layoutId={state.top_card.id} key={state.top_card.id} initial={{ scale: 0.5, rotate: -15, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} exit={{ scale: 0.3, opacity: 0 }} transition={{ type: 'spring', bounce: 0.4 }}>
                  <div className={`uno-card ${state.current_color ?? state.top_card.color}`} style={{ pointerEvents: 'none' }}>
                    <span className="card-corner top-left">{state.top_card.value === 'skip' ? '⊘' : state.top_card.value === 'reverse' ? '↻' : state.top_card.value === 'draw_two' ? '+2' : state.top_card.value === 'wild' ? '🌈' : state.top_card.value === 'wild_draw_four' ? '+4' : state.top_card.value}</span>
                    <span className="card-value">{state.top_card.value === 'skip' ? '⊘' : state.top_card.value === 'reverse' ? '↻' : state.top_card.value === 'draw_two' ? '+2' : state.top_card.value === 'wild' ? '🌈' : state.top_card.value === 'wild_draw_four' ? '+4' : state.top_card.value}</span>
                    <span className="card-corner bot-right">{state.top_card.value === 'skip' ? '⊘' : state.top_card.value === 'reverse' ? '↻' : state.top_card.value === 'draw_two' ? '+2' : state.top_card.value === 'wild' ? '🌈' : state.top_card.value === 'wild_draw_four' ? '+4' : state.top_card.value}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Current color indicator */}
          {state?.current_color && (
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <div className={`w-4 h-4 rounded-full uno-card ${state.current_color} p-0`} style={{ minWidth: '16px', minHeight: '16px', border: 'none' }} />
              <span>Active color: <span className="font-bold text-white capitalize">{state.current_color}</span></span>
            </div>
          )}
        </div>
      </div>

      {/* My Hand */}
      <div className="space-y-3 pb-6 px-4">
        {/* UNO button + actions */}
        <div className="flex items-center justify-center gap-4">
          <button onClick={handleUno} disabled={myHand.length !== 1}
            className="uno-button disabled:opacity-30">UNO!</button>

          {myHand.length <= 2 && myHand.length > 0 && (
            <div className="badge-warning badge animate-pulse">⚠️ Call UNO!</div>
          )}
        </div>

        {/* Player hand */}
        <div className="hand-container justify-center flex-wrap gap-1" style={{ flexWrap: 'wrap', gap: '4px', overflowX: 'auto' }}>
          <AnimatePresence>
            {myHand.map((card) => (
              <CardComponent key={card.id} card={card}
                playable={canPlay(card)} selected={selectedCard?.id === card.id}
                onClick={() => handleCardClick(card)} />
            ))}
          </AnimatePresence>
        </div>

        {/* My player info */}
        <div className="flex items-center justify-center gap-3">
          <img
            src={user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Player')}&background=6366f1&color=fff&size=128`}
            alt={user?.name}
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Player')}&background=6366f1&color=fff&size=128`;
            }}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-white/20"
          />
          <span className="text-white/70 text-sm font-medium">{user?.name}</span>
          <span className="text-white/40 text-xs">{myHand.length} cards</span>
          {myPlayer?.called_uno && <span className="badge-danger badge">UNO!</span>}
        </div>
      </div>

      {/* Color picker modal */}
      {showColorPicker && selectedCard && (
        <ColorPicker onSelect={(color) => playCard(selectedCard.id, color)} />
      )}
    </div>
  );
}
