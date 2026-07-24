// services/auth.service.ts
import { api } from './api';
import type { User } from '@/types/user.types';
import { extractErrorMessage } from '@/utils/errorHandler';

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
    try {
      return await api.post<LoginResponse>(`/auth/login/`, credentials);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
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
    try {
      return await api.post<RegisterResponse>(`/auth/register/`, data);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  async logout(): Promise<void> {
    try {
      await api.post(`/auth/logout/`);
    } finally {
      api.removeToken();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-storage');
      }
    }
  }

  async verifyEmail(data: { email: string; verification_code: string }): Promise<VerifyEmailResponse> {
    try {
      return await api.post<VerifyEmailResponse>(`/auth/verify-email/`, data);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  async resendVerificationCode(email: string): Promise<{ message: string }> {
    try {
      return await api.post<{ message: string }>(`/auth/resend-verification/`, { email });
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  async requestPasswordReset(email: string): Promise<PasswordResetResponse> {
    try {
      return await api.post<PasswordResetResponse>(`/auth/password-reset-request/`, { email });
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  async resetPassword(data: { 
    reset_token: string; 
    new_password: string; 
    confirm_password: string;
  }): Promise<PasswordResetResponse> {
    try {
      return await api.post<PasswordResetResponse>(`/auth/password-reset-confirm/`, data);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  async updateProfile(data: FormData | Partial<User>): Promise<User> {
    try {
      const isFormData = data instanceof FormData;
      const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined;
      return await api.patch<User>(`/users/me/update/`, data, config);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  async updateLastSeen(): Promise<{ status: string }> {
    try {
      return await api.post<{ status: string }>(`/users/me/update-last-seen/`);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  async setOffline(): Promise<{ status: string }> {
    try {
      return await api.post<{ status: string }>(`/users/me/set-offline/`);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  async getWebSocketToken(): Promise<WebSocketTokenResponse> {
    try {
      return await api.get<WebSocketTokenResponse>(`/auth/websocket-token/`);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  async getUserProfile(userId?: number): Promise<User> {
    try {
      const url = userId ? `/users/${userId}/` : '/users/me/';
      return await api.get<User>(url);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  async searchUsers(query: string): Promise<User[]> {
    try {
      const response = await api.get<{ results: User[] } | User[]>(`/users/search/`, { params: { q: query } });
      return Array.isArray(response) ? response : response.results;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  async getUserOnlineStatus(userId: number): Promise<UserOnlineStatus> {
    try {
      return await api.get<UserOnlineStatus>(`/users/${userId}/online-status/`);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }
}

export const authService = new AuthService();