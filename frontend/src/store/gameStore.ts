import { create } from 'zustand';

export interface UnoCard {
  id: string;
  color: 'red' | 'green' | 'blue' | 'yellow' | 'wild';
  value: string;
  points: number;
}

export interface GamePlayer {
  id: number;
  user_id: number;
  name: string;
  username: string;
  avatar_url: string;
  seat: number;
  type: 'human' | 'bot';
  status: string;
  score: number;
  cards_in_hand: number;
  called_uno: boolean;
  is_challengeable?: boolean;
  xp_earned: number;
}

export interface GameState {
  round_id: number;
  game_id: number;
  round_number: number;
  status: 'active' | 'finished' | 'waiting';
  top_card: UnoCard | null;
  current_color: string;
  direction: 'clockwise' | 'counterclockwise';
  current_player_id: number | null;
  pending_draw: number;
  draw_pile_count: number;
  hands: Record<string, UnoCard[] | number>;
  my_hand: UnoCard[];
  turn_started_at: string | null;
  winner_id?: number | null;
  uno_status?: Record<string, { called_uno: boolean; is_challengeable: boolean }>;
}

interface GameStore {
  gameId: number | null;
  roomCode: string | null;
  state: GameState | null;
  players: GamePlayer[];
  selectedCard: UnoCard | null;
  isMyTurn: boolean;
  showColorPicker: boolean;
  gameEnded: boolean;
  winnerId: number | null;
  turnTimeLeft: number;
  gameResult: { players: any[]; duration_seconds: number | null } | null;

  setState: (s: GameState) => void;
  setPlayers: (p: GamePlayer[]) => void;
  setGameId: (id: number, code: string) => void;
  selectCard: (card: UnoCard | null) => void;
  setShowColorPicker: (v: boolean) => void;
  applyCardPlayed: (e: { user_id: number; card_id: string }) => void;
  applyTurnChanged: (e: { next_player_id: number; turn_started_at: string }) => void;
  applyGameEnded: (e: { winner_id: number; players?: any[]; duration_seconds?: number }) => void;
  applyPlayerUnoAvailable: (e: { user_id: number }) => void;
  applyPlayerDeclaredUno: (e: { user_id: number }) => void;
  applyPlayerUnoCaught: (e: { target_id: number; challenger_id: number }) => void;
  applyPlayerDrawPenalty: (e: { user_id: number; amount: number }) => void;
  setTurnTimeLeft: (t: number) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameId: null,
  roomCode: null,
  state: null,
  players: [],
  selectedCard: null,
  isMyTurn: false,
  showColorPicker: false,
  gameEnded: false,
  winnerId: null,
  turnTimeLeft: 30,
  gameResult: null,

  setState: (s) => set({ state: s }),
  setPlayers: (p) => set({ players: p }),
  setGameId: (id, code) => set({ gameId: id, roomCode: code }),
  selectCard: (card) => set({ selectedCard: card }),
  setShowColorPicker: (v) => set({ showColorPicker: v }),
  setTurnTimeLeft: (t) => set({ turnTimeLeft: t }),

  applyCardPlayed: (e) => {
    const { state } = get();
    if (!state) return;
    // Update hand counts optimistically
    const hands = { ...state.hands };
    const prev = hands[e.user_id];
    if (typeof prev === 'number' && prev > 0) hands[e.user_id] = prev - 1;
    set({ state: { ...state, hands } });
  },

  applyTurnChanged: (e) => {
    const { state } = get();
    if (!state) return;
    set({
      state: { ...state, current_player_id: e.next_player_id, turn_started_at: e.turn_started_at },
      turnTimeLeft: 30,
    });
  },

  applyGameEnded: (e) => set({ gameEnded: true, winnerId: e.winner_id, gameResult: { players: e.players ?? [], duration_seconds: e.duration_seconds ?? null } }),

  applyPlayerUnoAvailable: (e) => {
    // Handled by state updates, but could show a toast here if desired
  },

  applyPlayerDeclaredUno: (e) => {
    const { state, players } = get();
    if (!state) return;
    set({
      players: players.map(p => p.user_id === e.user_id ? { ...p, called_uno: true } : p),
      state: {
        ...state,
        uno_status: {
          ...state.uno_status,
          [e.user_id]: { called_uno: true, is_challengeable: false }
        }
      }
    });
  },

  applyPlayerUnoCaught: (e) => {
    // Can play sound or toast here, hand update handled by PlayerDrawPenalty or state polling
  },

  applyPlayerDrawPenalty: (e) => {
    const { state } = get();
    if (!state) return;
    const hands = { ...state.hands };
    const prev = hands[e.user_id];
    if (typeof prev === 'number') hands[e.user_id] = prev + e.amount;
    
    set({
      state: {
        ...state,
        hands,
        uno_status: {
          ...state.uno_status,
          [e.user_id]: { called_uno: false, is_challengeable: false }
        }
      }
    });
  },

  reset: () => set({
    gameId: null, roomCode: null, state: null, players: [],
    selectedCard: null, isMyTurn: false, showColorPicker: false,
    gameEnded: false, winnerId: null, turnTimeLeft: 30, gameResult: null,
  }),
}));
