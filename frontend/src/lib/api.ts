import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  withCredentials: true,
});

// Request interceptor — attach token
api.interceptors.request.use((config) => {
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
  claimDailyReward: () => api.post('/me/daily-reward'),
  leaderboard: (type = 'xp') => api.get('/leaderboard', { params: { type } }),
};

// ── Friends ───────────────────────────────────────────────
export const friendApi = {
  list: () => api.get('/friends'),
  requests: () => api.get('/friends/requests'),
  send: (userId: number) => api.post(`/friends/${userId}`),
  accept: (id: number) => api.post(`/friends/requests/${id}/accept`),
  decline: (id: number) => api.post(`/friends/requests/${id}/decline`),
  remove: (userId: number) => api.delete(`/friends/${userId}`),
  invite: (userId: number, roomCode: string) => api.post(`/friends/${userId}/invite`, { room_code: roomCode }),
};

// ── Rooms ─────────────────────────────────────────────────
export const roomApi = {
  list: (params?: any) => api.get('/rooms', { params }),
  get: (code: string) => api.get(`/rooms/${code}`),
  create: (d: any) => api.post('/rooms', d),
  join: (code: string, d?: any) => api.post(`/rooms/${code}/join`, d),
  leave: (code: string) => api.post(`/rooms/${code}/leave`),
  ready: (code: string) => api.post(`/rooms/${code}/ready`),
  kick: (code: string, uid: number) => api.delete(`/rooms/${code}/kick/${uid}`),
  ban: (code: string, uid: number, reason?: string) => api.post(`/rooms/${code}/ban/${uid}`, { reason }),
  transfer: (code: string, uid: number) => api.post(`/rooms/${code}/transfer/${uid}`),
  settings: (code: string, d: any) => api.patch(`/rooms/${code}/settings`, d),
  chat: (code: string) => api.get(`/rooms/${code}/chat`),
  sendChat: (code: string, d: any) => api.post(`/rooms/${code}/chat`, d),
};

// ── Game ──────────────────────────────────────────────────
export const gameApi = {
  start: (code: string) => api.post(`/rooms/${code}/start`),
  state: (gameId: number) => api.get(`/games/${gameId}/state`),
  nextRound: (gameId: number) => api.post(`/games/${gameId}/next-round`),
  playCard: (gameId: number, d: any) => api.post(`/games/${gameId}/play`, d),
  drawCard: (gameId: number) => api.post(`/games/${gameId}/draw`),
  callUno: (gameId: number) => api.post(`/games/${gameId}/uno`),
  challengeUno: (gameId: number, targetId: number) => api.post(`/games/${gameId}/challenge-uno`, { target_id: targetId }),
  challengeW4: (gameId: number, targetId: number) => api.post(`/games/${gameId}/challenge-w4`, { target_id: targetId }),
  history: () => api.get('/games/history'),
};

// ── Notifications ─────────────────────────────────────────
export const notifApi = {
  list: () => api.get('/notifications'),
  unreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: number) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
};

// ── Admin ─────────────────────────────────────────────────
export const adminApi = {
  dashboard: () => api.get('/admin/dashboard'),
  users: (p?: any) => api.get('/admin/users', { params: p }),
  banUser: (id: number, d: any) => api.post(`/admin/users/${id}/ban`, d),
  unbanUser: (id: number) => api.delete(`/admin/users/${id}/ban`),
  rooms: (p?: any) => api.get('/admin/rooms', { params: p }),
  closeRoom: (id: number) => api.delete(`/admin/rooms/${id}`),
  reports: (p?: any) => api.get('/admin/reports', { params: p }),
  resolveReport: (id: number, d: any) => api.patch(`/admin/reports/${id}`, d),
  stats: () => api.get('/admin/stats'),
};
