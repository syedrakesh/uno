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
  const currentHost = window.location.hostname;

  let wsHost = process.env.NEXT_PUBLIC_PUSHER_HOST || currentHost;
  if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
    wsHost = currentHost;
  }

  const wsPort = parseInt(process.env.NEXT_PUBLIC_PUSHER_PORT || '8080');
  let apiBase = process.env.NEXT_PUBLIC_API_URL || `http://${currentHost}:8000/api/v1`;
  if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
    apiBase = apiBase.replace('localhost', currentHost).replace('127.0.0.1', currentHost);
  }

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
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
  }
}

export function listenRoom(roomId: number, callbacks: {
  onUpdated?: (data: any) => void;
  onChat?: (data: any) => void;
}) {
  const echo = getEcho();
  const channel = echo.join(`room.${roomId}`);

  if (callbacks.onUpdated) {
    channel.listen('.room.player_joined', callbacks.onUpdated);
    channel.listen('.room.player_left', callbacks.onUpdated);
    channel.listen('.room.player_ready', callbacks.onUpdated);
    channel.listen('.room.settings_updated', callbacks.onUpdated);
    channel.listen('.room.game_started', callbacks.onUpdated);
  }
  
  if (callbacks.onChat) {
    channel.listen('.chat.message', callbacks.onChat);
  }

  return () => {
    echo.leave(`room.${roomId}`);
  };
}

export function listenGame(gameId: number, callbacks: {
  onStateUpdated?: (data: any) => void;
  onCardPlayed?: (data: any) => void;
  onTurnChanged?: (data: any) => void;
  onGameEnded?: (data: any) => void;
  onPlayerUnoAvailable?: (data: any) => void;
  onPlayerDeclaredUno?: (data: any) => void;
  onPlayerUnoCaught?: (data: any) => void;
  onPlayerDrawPenalty?: (data: any) => void;
}) {
  const echo = getEcho();
  const channel = echo.private(`game.${gameId}`);

  if (callbacks.onStateUpdated) channel.listen('.game.state.updated', callbacks.onStateUpdated);
  if (callbacks.onCardPlayed) channel.listen('.game.card.played', callbacks.onCardPlayed);
  if (callbacks.onTurnChanged) channel.listen('.game.turn.changed', callbacks.onTurnChanged);
  if (callbacks.onGameEnded) channel.listen('.game.ended', callbacks.onGameEnded);
  if (callbacks.onPlayerUnoAvailable) channel.listen('.player.uno_available', callbacks.onPlayerUnoAvailable);
  if (callbacks.onPlayerDeclaredUno) channel.listen('.player.declared_uno', callbacks.onPlayerDeclaredUno);
  if (callbacks.onPlayerUnoCaught) channel.listen('.player.uno_caught', callbacks.onPlayerUnoCaught);
  if (callbacks.onPlayerDrawPenalty) channel.listen('.player.draw_penalty', callbacks.onPlayerDrawPenalty);

  return () => {
    echo.leave(`game.${gameId}`);
  };
}
