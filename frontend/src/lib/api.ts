import axios from 'axios';

const getBaseUrl = () => {
  let url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    url = url.replace('localhost', window.location.hostname).replace('127.0.0.1', window.location.hostname);
  }
  return url;
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  withCredentials: true,
});

// Request interceptor — attach token and dynamically adapt host for local LAN devices
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    if (config.baseURL) {
      config.baseURL = config.baseURL.replace('localhost', window.location.hostname).replace('127.0.0.1', window.location.hostname);
    }
  }
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — handle 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const url = err.config?.url ?? '';
      // Don't redirect on auth bootstrap calls
      const isAuthCall = url.includes('/auth/me') || url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/guest');
      if (!isAuthCall && typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth ──────────────────────────────────────────────────
export const authApi = {
  register: (d: any) => api.post('/auth/register', d),
  login: (d: any) => api.post('/auth/login', d),
  guestLogin: () => api.post('/auth/guest'),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (d: any) => api.post('/auth/reset-password', d),
  socialRedirect: (p: string) => api.get(`/auth/social/${p}/redirect`),
  socialCallback: (p: string, t: string) => api.post(`/auth/social/${p}/callback`, { token: t }),
};

// ── Users ─────────────────────────────────────────────────
export const userApi = {
  profile: (username: string) => api.get(`/users/${username}`),
  search: (q: string) => api.get('/users/search', { params: { q } }),
  updateProfile: (d: any) => api.patch('/me', d),
  uploadAvatar: (form: FormData) => api.post('/me/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  changePassword: (d: any) => api.post('/me/password', d),
  myStats: () => api.get('/me/stats'),
};

// ── Rooms ─────────────────────────────────────────────────
export const roomApi = {
  list: (params?: any) => api.get('/rooms', { params }),
  create: (d: any) => api.post('/rooms', d),
  show: (code: string) => api.get(`/rooms/${code}`),
  join: (code: string, password?: string) => api.post(`/rooms/${code}/join`, { password }),
  leave: (code: string) => api.post(`/rooms/${code}/leave`),
  kick: (code: string, userId: number) => api.delete(`/rooms/${code}/kick/${userId}`),
  toggleReady: (code: string) => api.post(`/rooms/${code}/ready`),
  updateSettings: (code: string, settings: any) => api.patch(`/rooms/${code}/settings`, settings),
  startGame: (code: string) => api.post(`/rooms/${code}/start`),
  messages: (code: string) => api.get(`/rooms/${code}/chat`),
  sendMessage: (code: string, message: string) => api.post(`/rooms/${code}/chat`, { message }),
};

// ── Game ──────────────────────────────────────────────────
export const gameApi = {
  state: (gameId: number) => api.get(`/games/${gameId}/state`),
  playCard: (gameId: number, d: { card_id: string; chosen_color?: string | null }) => api.post(`/games/${gameId}/play`, d),
  drawCard: (gameId: number) => api.post(`/games/${gameId}/draw`),
  callUno: (gameId: number) => api.post(`/games/${gameId}/uno`),
  challengeUno: (gameId: number, targetId: number) => api.post(`/games/${gameId}/challenge-uno`, { target_id: targetId }),
  challengeWildFour: (gameId: number) => api.post(`/games/${gameId}/challenge-w4`),
  history: (params?: any) => api.get('/games/history', { params }),
};

// ── Notifications ─────────────────────────────────────────
export const notifApi = {
  list: (params?: any) => api.get('/notifications', { params }),
  unreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id: number) => api.post(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/read-all'),
};

// ── Friends ───────────────────────────────────────────────
export const friendApi = {
  list: () => api.get('/friends'),
  requests: () => api.get('/friends/requests'),
  sendRequest: (userId: number) => api.post(`/friends/request/${userId}`),
  acceptRequest: (requestId: number) => api.post(`/friends/accept/${requestId}`),
  rejectRequest: (requestId: number) => api.post(`/friends/reject/${requestId}`),
  removeFriend: (friendId: number) => api.delete(`/friends/${friendId}`),
};

// ── Leaderboard ───────────────────────────────────────────
export const leaderboardApi = {
  get: (type: 'xp' | 'wins' | 'win_streak' = 'xp', limit = 50) => api.get('/leaderboard', { params: { type, limit } }),
};

// ── Admin ─────────────────────────────────────────────────
export const adminApi = {
  stats: () => api.get('/admin/stats'),
  users: (params?: any) => api.get('/admin/users', { params }),
  games: (params?: any) => api.get('/admin/games', { params }),
};
