import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
  interface Window {
    Pusher: typeof Pusher;
    Echo: Echo<any>;
  }
}

let echoInstance: Echo<any> | null = null;

export function getEcho(): Echo<any> {
  if (echoInstance) return echoInstance;

  if (typeof window === 'undefined') throw new Error('Echo only available in browser');

  window.Pusher = Pusher;

  const token = localStorage.getItem('auth_token');
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const wsHost = process.env.NEXT_PUBLIC_PUSHER_HOST || currentHost;
  const wsPort = parseInt(process.env.NEXT_PUBLIC_PUSHER_PORT || '8080');
  const apiBase = process.env.NEXT_PUBLIC_API_URL || `http://${currentHost}:8000/api/v1`;

  echoInstance = new Echo({
    broadcaster: 'reverb',
    key: process.env.NEXT_PUBLIC_PUSHER_KEY || 'owokg82oo2xpcqdr3cxr',
    wsHost: wsHost,
    wsPort: wsPort,
    wssPort: wsPort,
    forceTLS: false,
    encrypted: false,
    disableStats: true,
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${apiBase}/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
  });

  return echoInstance;
}

export function disconnectEcho(): void {
  echoInstance?.disconnect();
  echoInstance = null;
}

// ── Channel helpers ───────────────────────────────────────
export function listenRoom(
  roomId: number,
  callbacks: { onUpdated?: (e: any) => void; onChat?: (e: any) => void; onPresence?: (members: any) => void }
) {
  const echo = getEcho();
  const channel = echo.join(`room.${roomId}`);

  if (callbacks.onPresence) {
    channel.here(callbacks.onPresence).joining((m: any) => { }).leaving((m: any) => { });
  }
  if (callbacks.onUpdated) channel.listen('.room.updated', callbacks.onUpdated).listen('.room.created', callbacks.onUpdated).listen('.room.player_joined', callbacks.onUpdated).listen('.room.player_left', callbacks.onUpdated).listen('.room.player_ready', callbacks.onUpdated).listen('.room.game_started', callbacks.onUpdated).listen('.room.settings_updated', callbacks.onUpdated).listen('.room.ownership_transferred', callbacks.onUpdated).listen('.room.player_kicked', callbacks.onUpdated).listen('.room.player_banned', callbacks.onUpdated);
  if (callbacks.onChat) channel.listen('.chat.message', callbacks.onChat);

  return () => echo.leave(`room.${roomId}`);
}

export function listenGame(
  gameId: number,
  callbacks: {
    onStateUpdated?: (e: any) => void;
    onCardPlayed?: (e: any) => void;
    onTurnChanged?: (e: any) => void;
    onGameEnded?: (e: any) => void;
  }
) {
  const echo = getEcho();
  const channel = echo.private(`game.${gameId}`);

  if (callbacks.onStateUpdated) channel.listen('.game.state.updated', callbacks.onStateUpdated);
  if (callbacks.onCardPlayed) channel.listen('.card.played', callbacks.onCardPlayed);
  if (callbacks.onTurnChanged) channel.listen('.turn.changed', callbacks.onTurnChanged);
  if (callbacks.onGameEnded) channel.listen('.game.ended', callbacks.onGameEnded);

  return () => echo.leave(`game.${gameId}`);
}

export function listenUserNotifications(userId: number, onNotification: (e: any) => void) {
  const echo = getEcho();
  echo.private(`user.${userId}`).notification(onNotification);
  return () => echo.leave(`user.${userId}`);
}
