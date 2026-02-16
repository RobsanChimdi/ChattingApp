// store/auth.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types/user.types';
import { authService } from '@/services/auth.service';
import { api } from '@/services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isEmailVerified: boolean;
  verificationEmailSent: boolean;
}

interface AuthActions {
  // Authentication actions
  login: (credentials: { username: string; password: string }) => Promise<void>;
  register: (data: {
    username: string;
    email: string;
    password: string;
    confirm_password: string;
    first_name?: string;
    last_name?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  
  // Email verification
  verifyEmail: (data: { email: string; verification_code: string }) => Promise<boolean>;
  resendVerificationCode: (email: string) => Promise<void>;
  
  // Password reset
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (data: { 
    reset_token: string; 
    new_password: string; 
    confirm_password: string;
  }) => Promise<void>;
  
  // User actions
  setUser: (user: User | null) => void;
  setToken: (token: string) => void;
  clearAuth: () => void;
  
  // Profile actions
  updateProfile: (data: FormData | Partial<User>) => Promise<User>;
  updateLastSeen: () => Promise<void>;
  setOffline: () => Promise<void>;
  
  // WebSocket token
  getWebSocketToken: () => Promise<{ token: string; user_id: number }>;
  
  // Status
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  resetState: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isEmailVerified: false,
      verificationEmailSent: false,
      
      // Authentication actions
      login: async (credentials) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authService.login(credentials);
          
          // Check if email is verified
          if (response.user && !response.user.is_verified) {
            set({ 
              error: 'Please verify your email before logging in',
              isLoading: false,
              user: response.user,
              token: response.token,
            });
            return;
          }
          
          // Set token in API service
          api.setToken(response.token);
          
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isEmailVerified: response.user?.is_verified || false,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error.response?.data?.error || error.response?.data?.message || 'Login failed',
            isLoading: false,
            isAuthenticated: false,
          });
          throw error;
        }
      },
      
      register: async (data) => {
        set({ isLoading: true, error: null, verificationEmailSent: false });
        
        try {
          const response = await authService.register(data);
          
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: false, // Not authenticated until email verified
            isEmailVerified: false,
            verificationEmailSent: true,
            isLoading: false,
          });
          
          // Don't set API token yet - user needs to verify email first
        } catch (error: any) {
          set({
            error: error.response?.data?.error || 
                  error.response?.data?.message || 
                  'Registration failed',
            isLoading: false,
            isAuthenticated: false,
          });
          throw error;
        }
      },
      
      logout: async () => {
        set({ isLoading: true });
        
        try {
          await authService.logout();
          api.removeToken();
          get().clearAuth();
        } catch (error: any) {
          console.error('Logout error:', error);
        } finally {
          set({ isLoading: false });
        }
      },
      
      // Email verification
      verifyEmail: async (data) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authService.verifyEmail(data);
          
          if (response.status === 'verified') {
            // Update user verification status
            const currentUser = get().user;
            if (currentUser) {
              set({ 
                user: { ...currentUser, is_verified: true },
                isEmailVerified: true,
                isAuthenticated: true, // Now authenticated
                isLoading: false,
              });
              
              // Set token now that email is verified
              if (get().token) {
                api.setToken(get().token!);
              }
            }
            return true;
          }
          return false;
        } catch (error: any) {
          set({
            error: error.response?.data?.error || 'Verification failed',
            isLoading: false,
          });
          throw error;
        }
      },
      
      resendVerificationCode: async (email: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await authService.resendVerificationCode(email);
          set({ verificationEmailSent: true, isLoading: false });
        } catch (error: any) {
          set({
            error: error.response?.data?.error || 'Failed to resend code',
            isLoading: false,
          });
          throw error;
        }
      },
      
      // Password reset
      requestPasswordReset: async (email: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await authService.requestPasswordReset(email);
          set({ isLoading: false });
        } catch (error: any) {
          set({
            error: error.response?.data?.error || 'Failed to request password reset',
            isLoading: false,
          });
          throw error;
        }
      },
      
      resetPassword: async (data) => {
        set({ isLoading: true, error: null });
        
        try {
          await authService.resetPassword(data);
          set({ isLoading: false });
        } catch (error: any) {
          set({
            error: error.response?.data?.error || 'Failed to reset password',
            isLoading: false,
          });
          throw error;
        }
      },
      
      // User actions
      setUser: (user) => {
        set({ 
          user,
          isAuthenticated: !!user,
          isEmailVerified: user?.is_verified || false,
        });
      },
      
      setToken: (token) => {
        set({ token });
        if (token) {
          api.setToken(token);
        }
      },
      
      clearAuth: () => {
        api.removeToken();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
          isEmailVerified: false,
          verificationEmailSent: false,
        });
      },
      
      // Profile actions
      updateProfile: async (data) => {
        set({ isLoading: true, error: null });
        
        try {
          const updatedUser = await authService.updateProfile(data);
          set({ 
            user: updatedUser, 
            isLoading: false,
            isEmailVerified: updatedUser.is_verified,
          });
          return updatedUser;
        } catch (error: any) {
          set({
            error: error.response?.data?.error || 'Profile update failed',
            isLoading: false,
          });
          throw error;
        }
      },
      
      updateLastSeen: async () => {
        try {
          await authService.updateLastSeen();
        } catch (error) {
          console.error('Failed to update last seen:', error);
        }
      },
      
      setOffline: async () => {
        try {
          await authService.setOffline();
        } catch (error) {
          console.error('Failed to set offline:', error);
        }
      },
      
      // WebSocket token
      getWebSocketToken: async () => {
        try {
          const response = await authService.getWebSocketToken();
          return response;
        } catch (error) {
          console.error('Failed to get WebSocket token:', error);
          throw error;
        }
      },
      
      // Status
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
      resetState: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          isEmailVerified: false,
          verificationEmailSent: false,
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        isEmailVerified: state.isEmailVerified,
      }),
    }
  )
);

// Selectors for better performance
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthError = () => useAuthStore((state) => state.error);
export const useIsEmailVerified = () => useAuthStore((state) => state.isEmailVerified);
export const useVerificationEmailSent = () => useAuthStore((state) => state.verificationEmailSent);