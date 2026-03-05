// services/auth.service.ts
import { api } from './api';
import type { User } from '@/types/user.types';

export interface LoginResponse {
  token: string;
  user: User;
}

export interface RegisterResponse {
  token: string;
  user: User;
}

export interface VerifyEmailResponse {
  status: string;
}

export interface WebSocketTokenResponse {
  token: string;
  user_id: number;
  username: string;
}

export interface UserOnlineStatus {
  is_online: boolean;
  last_seen?: string;
  status?: string;
  privacy?: string;
}

class AuthService {
  private readonly baseUrl = '/auth';

  async login(credentials: { username: string; password: string }): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>(`${this.baseUrl}/login/`, credentials);
    return response.data;
  }

  async register(data: {
    username: string;
    email: string;
    password: string;
    confirm_password: string;
    first_name?: string;
    last_name?: string;
  }): Promise<RegisterResponse> {
    const response = await api.post<RegisterResponse>(`${this.baseUrl}/register/`, data);
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await api.post(`${this.baseUrl}/logout/`);
    } finally {
      localStorage.removeItem('auth-storage');
    }
  }

  async verifyEmail(data: { email: string; verification_code: string }): Promise<VerifyEmailResponse> {
    const response = await api.post<VerifyEmailResponse>(`${this.baseUrl}/verify-email/`, data);
    return response.data;
  }

  async resendVerificationCode(email: string): Promise<void> {
    await api.post(`${this.baseUrl}/resend-verification/`, { email });
  }

  async requestPasswordReset(email: string): Promise<void> {
    await api.post(`${this.baseUrl}/password-reset-request/`, { email });
  }

  async resetPassword(data: { 
    reset_token: string; 
    new_password: string; 
    confirm_password: string;
  }): Promise<void> {
    await api.post(`${this.baseUrl}/password-reset-confirm/`, data);
  }

  async updateProfile(data: FormData | Partial<User>): Promise<User> {
    const isFormData = data instanceof FormData;
    const response = await api.patch<User>(
      '/users/me/update/',
      data,
      isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined
    );
    return response.data;
  }

  async updateLastSeen(): Promise<void> {
    await api.post('/users/me/update-last-seen/');
  }

  async setOffline(): Promise<void> {
    await api.post('/users/me/set-offline/');
  }

  async getWebSocketToken(): Promise<WebSocketTokenResponse> {
    const response = await api.get<WebSocketTokenResponse>(`${this.baseUrl}/websocket-token/`);
    return response.data;
  }

  async getUserProfile(userId?: number): Promise<User> {
    const url = userId ? `/users/${userId}/` : '/users/me/';
    const response = await api.get<User>(url);
    return response.data;
  }

  async searchUsers(query: string): Promise<User[]> {
    const response = await api.get<User[]>('/users/search/', { params: { q: query } });
    return response.data;
  }

  async getUserOnlineStatus(userId: number): Promise<UserOnlineStatus> {
    const response = await api.get<UserOnlineStatus>(`/users/${userId}/online-status/`);
    return response.data;
  }
}

export const authService = new AuthService();
