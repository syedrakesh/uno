'use client';
import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, UnoCard } from '@/store/gameStore';
import { useAuthStore } from '@/store/authStore';
import { gameApi } from '@/lib/api';
import { listenGame } from '@/lib/echo';
import toast from 'react-hot-toast';

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
  count: number; name: string; avatarUrl: string; isActive: boolean; calledUno: boolean;
}) {
  return (
    <div className={`flex flex-col items-center gap-2 ${isActive ? 'scale-110' : 'opacity-70'} transition-all`}>
      <div className={`relative player-ring ${isActive ? 'active' : ''}`}>
        <img src={avatarUrl} alt={name} className="w-12 h-12 rounded-full object-cover ring-2 ring-white/20" />
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
    state, players, selectedCard, isMyTurn, showColorPicker, gameEnded, winnerId,
    turnTimeLeft, setState, setPlayers, selectCard, setShowColorPicker,
    applyCardPlayed, applyTurnChanged, applyGameEnded, setTurnTimeLeft,
  } = useGameStore();

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial state
  useEffect(() => {
    gameApi.state(gameId).then(r => {
      setState(r.data.state);
      setPlayers(r.data.game?.players ?? []);
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

  if (gameEnded) {
    const winner = players.find(p => p.user_id === winnerId);
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh gap-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }} className="text-center space-y-4">
          <div className="text-8xl">{winnerId === user?.id ? '🏆' : '💔'}</div>
          <h2 className="text-4xl font-black text-white">{winnerId === user?.id ? 'You Win!' : `${winner?.name} Wins!`}</h2>
          <p className="text-white/50">Game over</p>
          <a href="/dashboard" className="btn btn-primary btn-lg">Back to Dashboard</a>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-[hsl(var(--surface-bg))]">
      {/* Opponents */}
      <div className="flex items-center justify-center gap-8 pt-6 px-6 flex-wrap">
        {opponents.map(p => (
          <OpponentHand key={p.user_id}
            count={typeof state?.hands?.[p.user_id] === 'number' ? state.hands[p.user_id] as number : 7}
            name={p.name} avatarUrl={p.avatar_url}
            isActive={state?.current_player_id === p.user_id}
            calledUno={p.called_uno} />
        ))}
      </div>

      {/* Game Table */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="game-table rounded-3xl w-full max-w-2xl aspect-video flex flex-col items-center justify-center gap-6 relative">

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
                <motion.div key={state.top_card.id} initial={{ scale: 0.5, rotate: -15, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} exit={{ scale: 0.3, opacity: 0 }} transition={{ type: 'spring', bounce: 0.4 }}>
                  <div className={`uno-card ${state.current_color ?? state.top_card.color}`} style={{ pointerEvents: 'none' }}>
                    <span className="card-corner top-left">{state.top_card.value}</span>
                    <span className="card-value">{state.top_card.value === 'skip' ? '⊘' : state.top_card.value === 'reverse' ? '↻' : state.top_card.value === 'draw_two' ? '+2' : state.top_card.value === 'wild' ? '🌈' : state.top_card.value === 'wild_draw_four' ? '+4' : state.top_card.value}</span>
                    <span className="card-corner bot-right">{state.top_card.value}</span>
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
          <img src={user?.avatar_url} alt={user?.name} className="w-8 h-8 rounded-full" />
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
