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

export function listenRoom(roomCode: string, callbacks: {
  onPlayerJoined?: (data: any) => void;
  onPlayerLeft?: (data: any) => void;
  onPlayerReady?: (data: any) => void;
  onSettingsUpdated?: (data: any) => void;
  onGameStarted?: (data: any) => void;
  onMessage?: (data: any) => void;
}) {
  const echo = getEcho();
  const channel = echo.private(`room.${roomCode}`);

  if (callbacks.onPlayerJoined) channel.listen('.room.player.joined', callbacks.onPlayerJoined);
  if (callbacks.onPlayerLeft) channel.listen('.room.player.left', callbacks.onPlayerLeft);
  if (callbacks.onPlayerReady) channel.listen('.room.player.ready', callbacks.onPlayerReady);
  if (callbacks.onSettingsUpdated) channel.listen('.room.settings.updated', callbacks.onSettingsUpdated);
  if (callbacks.onGameStarted) channel.listen('.room.game.started', callbacks.onGameStarted);
  if (callbacks.onMessage) channel.listen('.room.message.sent', callbacks.onMessage);

  return () => {
    echo.leave(`room.${roomCode}`);
  };
}

export function listenGame(gameId: number, callbacks: {
  onStateUpdated?: (data: any) => void;
  onCardPlayed?: (data: any) => void;
  onTurnChanged?: (data: any) => void;
  onGameEnded?: (data: any) => void;
}) {
  const echo = getEcho();
  const channel = echo.private(`game.${gameId}`);

  if (callbacks.onStateUpdated) channel.listen('.game.state.updated', callbacks.onStateUpdated);
  if (callbacks.onCardPlayed) channel.listen('.game.card.played', callbacks.onCardPlayed);
  if (callbacks.onTurnChanged) channel.listen('.game.turn.changed', callbacks.onTurnChanged);
  if (callbacks.onGameEnded) channel.listen('.game.ended', callbacks.onGameEnded);

  return () => {
    echo.leave(`game.${gameId}`);
  };
}
