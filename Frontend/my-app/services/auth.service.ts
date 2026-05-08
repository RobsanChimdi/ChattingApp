// services/auth.service.ts
import { api } from './api';
import type { User } from '@/types/user.types';

export interface LoginResponse {
  token: string;
  user: User;
  user_id: number;
}

export interface RegisterResponse {
  message: string;
  user_id: number;
  email: string;
}

export interface VerifyEmailResponse {
  status: string;
  token?: string;
  user?: User;
}

export interface WebSocketTokenResponse {
  token: string;
  user_id: number;
  username?: string;
}

export interface UserOnlineStatus {
  is_online: boolean;
  last_seen?: string;
  status?: string;
  privacy?: string;
}

export interface PasswordResetResponse {
  status: string;
}

class AuthService {
  private readonly baseUrl = '';

  async login(credentials: { username: string; password: string }): Promise<LoginResponse> {
    return await api.post<LoginResponse>(`/auth/login/`, credentials);
  }

  async register(data: {
    username: string;
    email: string;
    password: string;
    confirm_password: string;
    first_name?: string;
    last_name?: string;
    bio?: string;
    phone_number?: string;
  }): Promise<RegisterResponse> {
    return await api.post<RegisterResponse>(`/auth/register/`, data);
  }

  async logout(): Promise<void> {
    try {
      await api.post(`/auth/logout/`);
    } finally {
      // Clear storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-storage');
        localStorage.removeItem('token');
      }
    }
  }

  async verifyEmail(data: { email: string; verification_code: string }): Promise<VerifyEmailResponse> {
    return await api.post<VerifyEmailResponse>(`/auth/verify-email/`, data);
  }

  async resendVerificationCode(email: string): Promise<{ message: string }> {
    return await api.post<{ message: string }>(`/auth/resend-verification/`, { email });
  }

  async requestPasswordReset(email: string): Promise<PasswordResetResponse> {
    return await api.post<PasswordResetResponse>(`/auth/password-reset-request/`, { email });
  }

  async resetPassword(data: { 
    reset_token: string; 
    new_password: string; 
    confirm_password: string;
  }): Promise<PasswordResetResponse> {
    return await api.post<PasswordResetResponse>(`/auth/password-reset-confirm/`, data);
  }

  async updateProfile(data: FormData | Partial<User>): Promise<User> {
    const isFormData = data instanceof FormData;
    const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined;
    return await api.patch<User>(`/users/me/update/`, data, config);
  }

  async updateLastSeen(): Promise<{ status: string }> {
    return await api.post<{ status: string }>(`/users/me/update-last-seen/`);
  }

  async setOffline(): Promise<{ status: string }> {
    return await api.post<{ status: string }>(`/users/me/set-offline/`);
  }

  async getWebSocketToken(): Promise<WebSocketTokenResponse> {
    return await api.get<WebSocketTokenResponse>(`/auth/websocket-token/`);
  }

  async getUserProfile(userId?: number): Promise<User> {
    const url = userId ? `/users/${userId}/` : '/users/me/';
    return await api.get<User>(url);
  }

  async searchUsers(query: string): Promise<User[]> {
    return await api.get<User[]>(`/users/search/`, { params: { q: query } });
  }

  async getUserOnlineStatus(userId: number): Promise<UserOnlineStatus> {
    return await api.get<UserOnlineStatus>(`/users/${userId}/online-status/`);
  }
}

export const authService = new AuthService();