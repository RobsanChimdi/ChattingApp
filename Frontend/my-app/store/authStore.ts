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
}

interface AuthActions {
  // Authentication actions
  login: (credentials: { username: string; password: string }) => Promise<void>;
  register: (data: {
    username: string;
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  
  // User actions
  setUser: (user: User | null) => void;
  setToken: (token: string) => void;
  clearAuth: () => void;
  
  // Profile actions
  updateProfile: (data: Partial<User>) => Promise<void>;
  updateLastSeen: () => Promise<void>;
  setOffline: () => Promise<void>;
  
  // Status
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
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
      
      // Authentication actions
      login: async (credentials) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authService.login(credentials);
              api.setToken(response.token);

          
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error.response?.data?.error || 'Login failed',
            isLoading: false,
            isAuthenticated: false,
          });
          throw error;
        }
      },
      
      register: async (data) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authService.register(data);
           api.setToken(response.token);
          
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error.response?.data?.error || 'Registration failed',
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
          get().clearAuth();
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
        } finally {
          set({ isLoading: false });
        }
      },
      
      // User actions
      setUser: (user) => {
        set({ 
          user,
          isAuthenticated: !!user,
        });
      },
      
      setToken: (token) => {
        set({ token });
      },
      
      clearAuth: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },
      
      // Profile actions
      updateProfile: async (data) => {
        set({ isLoading: true, error: null });
        
        try {
          const updatedUser = await authService.updateProfile(data);
          set({ user: updatedUser, isLoading: false });
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
      
      // Status
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Selectors for better performance
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthError = () => useAuthStore((state) => state.error);