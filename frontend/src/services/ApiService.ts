import type { User, Reflection, Question, Group, ReflectionStats } from '../types';

const BASE = '/api';

function getToken() {
  return localStorage.getItem('undo_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string>) || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unbekannter Fehler');
  return data as T;
}

export const ApiService = {
  // Auth
  register: (body: { username: string; email: string; password: string; first_name?: string }) =>
    request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (username: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  getMe: () => request<User>('/auth/me'),

  updateProfile: (body: Partial<User>) =>
    request<User>('/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),

  changePassword: (current_password: string, new_password: string) =>
    request<{ success: boolean }>('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ current_password, new_password }),
    }),

  // Reflections
  getQuestion: (mode: string) =>
    request<Question | null>(`/reflections/questions?mode=${mode}`),

  createReflection: (body: {
    mode: string;
    question: string;
    question_id?: number;
    answer: string;
    category?: string;
  }) =>
    request<{ reflection: Reflection; tokensEarned: number }>('/reflections', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  generateFeedback: (id: number) =>
    request<{ feedback: string }>(`/reflections/${id}/feedback`, { method: 'POST' }),

  getReflections: (page = 1, limit = 20, category?: string) =>
    request<{ reflections: Reflection[]; total: number }>(
      `/reflections?page=${page}&limit=${limit}${category ? `&category=${category}` : ''}`
    ),

  getReflection: (id: number) => request<Reflection>(`/reflections/${id}`),

  getStats: () => request<ReflectionStats>('/reflections/stats'),

  // Groups
  getGroups: () => request<Group[]>('/groups'),

  createGroup: (body: { name: string; motive?: string; chance?: string }) =>
    request<Group>('/groups', { method: 'POST', body: JSON.stringify(body) }),

  getGroup: (id: string) => request<Group>(`/groups/${id}`),

  joinGroup: (id: string) =>
    request<{ success: boolean }>(`/groups/${id}/join`, { method: 'POST' }),

  leaveGroup: (id: string) =>
    request<{ success: boolean }>(`/groups/${id}/leave`, { method: 'POST' }),

  updateGroup: (id: string, body: { name?: string; motive?: string; chance?: string }) =>
    request<Group>(`/groups/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  postGroupReflection: (groupId: string, question: string, answer: string) =>
    request<{ id: number }>(`/groups/${groupId}/reflections`, {
      method: 'POST',
      body: JSON.stringify({ question, answer }),
    }),

  // Tokens
  getTokens: () =>
    request<{
      tokens: number;
      streak: number;
      subscription: string;
      pro_until?: string;
      history: { id: number; amount: number; reason: string; created_at: string }[];
    }>('/tokens'),

  redeemCode: (code: string) =>
    request<{ success: boolean; tokens: number; subscription: string; pro_until?: string }>(
      '/tokens/redeem',
      { method: 'POST', body: JSON.stringify({ code }) }
    ),

  getGrowth: () =>
    request<{
      first: { answer: string; question: string; created_at: string } | null;
      latest: { answer: string; question: string; created_at: string } | null;
      firstWords: number;
      latestWords: number;
      avgFirst: number;
      avgLast: number;
      totalWords: number;
      thisWeekCount: number;
      topCategoryThisWeek: string | null;
      daysSinceStart: number;
    }>('/reflections/growth'),

  // Push notifications
  spendToken: (reason: string) =>
    request<{ tokens: number }>('/tokens/spend', {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  getVapidPublicKey: () =>
    request<{ key: string }>('/push/vapid-public-key'),

  getPushStatus: () =>
    request<{ subscribed: boolean; morningTime: string; eveningTime: string }>('/push/status'),

  subscribePush: (subscription: object, morningTime: string, eveningTime: string) =>
    request<{ success: boolean }>('/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription, morningTime, eveningTime }),
    }),

  unsubscribePush: (endpoint: string) =>
    request<{ success: boolean }>('/push/unsubscribe', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint }),
    }),
};
