import { api } from './api';
import type { User } from '@/types/user.types.ts';

interface LoginCredentials {
  username: string;
  password: string;
}

interface RegisterData extends LoginCredentials {
  email: string;
  first_name?: string;
  last_name?: string;
}

interface AuthResponse {
  token: string;
  user: User;
}

interface WebSocketToken {
  token: string;
  user_id: number;
  username: string;
}

export const authService = {
  // Authentication
  async register(data: RegisterData): Promise<AuthResponse> {
    return api.post<AuthResponse>('/register/', data);
  },

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return api.post<AuthResponse>('/login/', credentials);
  },

  async logout(): Promise<void> {
    await api.post('/logout/');
    api.clearToken();
  },

  // Current user
  async getCurrentUser(): Promise<User> {
    return api.get<User>('/users/me/');
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    return api.put<User>('/users/me/update/', data);
  },

  // WebSocket token
  async getWebSocketToken(): Promise<WebSocketToken> {
    return api.get<WebSocketToken>('/websocket-token/');
  },

  // User status
  async updateLastSeen(): Promise<void> {
    await api.post('/update-last-seen/');
  },

  async setOffline(): Promise<void> {
    await api.post('/set-offline/');
  },

  async getUserOnlineStatus(userId: number) {
    return api.get(`/users/${userId}/online-status/`);
  },

  // User search
  async searchUsers(query: string, page = 1) {
    return api.get('/users/search/', {
      params: { q: query, page },
    });
  },
};