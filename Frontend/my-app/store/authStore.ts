// store/auth.store.ts

import { create } from 'zustand';

import { persist } from 'zustand/middleware';

import type { User } from '@/types/user.types';

import { authService } from '@/services/auth.service';

import { api } from '@/services/api';

import { extractErrorMessage } from '@/utils/errorHandler';



interface AuthState {

  user: User | null;

  token: string | null;

  isAuthenticated: boolean;

  isLoading: boolean;

  error: string | null;

  isEmailVerified: boolean;

  verificationEmailSent: boolean;

  pendingVerificationEmail: string | null;

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

    bio?: string;

    phone_number?: string;

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

  setToken: (token: string | null) => void;

  clearAuth: () => void;

  

  // Profile actions

  updateProfile: (data: FormData | Partial<User>) => Promise<User>;

  updateLastSeen: () => Promise<void>;

  setOffline: () => Promise<void>;

  

  // WebSocket token

  getWebSocketToken: () => Promise<{ token: string; user_id: number; username?: string }>;

  

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

      isLoading: true, // Start as true to prevent redirect during rehydration

      error: null,

      isEmailVerified: false,

      verificationEmailSent: false,

      pendingVerificationEmail: null,

      

      // Authentication actions

      login: async (credentials) => {

        set({ isLoading: true, error: null });

        

        try {

          // Clear old auth data before login
          localStorage.removeItem('auth-storage');
          localStorage.removeItem('token');

          const response = await authService.login(credentials);

          api.setToken(response.token);

          

          set({

            user: response.user,

            token: response.token,

            isAuthenticated: true,

            isEmailVerified: response.user?.is_verified || false,

            isLoading: false,

            error: null,

            pendingVerificationEmail: null,

          });

          // Fetch fresh user data to ensure latest online status
          try {
            const freshUser = await authService.getUserProfile();
            set({ user: freshUser });
          } catch (error) {
            console.error('Failed to fetch fresh user data:', error);
          }

        } catch (error: any) {

          set({

            error: extractErrorMessage(error),

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

            verificationEmailSent: true,

            pendingVerificationEmail: response.email || data.email,

            isLoading: false,

          });

          

          // Note: User is not authenticated until email is verified

        } catch (error: any) {

          set({

            error: extractErrorMessage(error),

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

          // Clear persisted storage to prevent rehydration
          localStorage.removeItem('auth-storage');
          localStorage.removeItem('token');

        } catch (error: any) {

          console.error('Logout error:', error);

          // Even if logout fails, clear local auth state
          localStorage.removeItem('auth-storage');
          localStorage.removeItem('token');
          get().clearAuth();

        } finally {

          set({ isLoading: false });

        }

      },

      

      // Email verification

      verifyEmail: async (data) => {

        set({ isLoading: true, error: null });

        

        try {

          const response = await authService.verifyEmail(data);

          

          if (response.status === 'verified' && response.user && response.token) {

            api.setToken(response.token);

            set({ 

              user: response.user,

              token: response.token,

              isAuthenticated: true,

              isEmailVerified: true,

              isLoading: false,

              pendingVerificationEmail: null,

            });

            return true;

          }

          set({ isLoading: false });

          return false;

        } catch (error: any) {

          set({

            error: extractErrorMessage(error),

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

            error: extractErrorMessage(error),

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

            error: extractErrorMessage(error),

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

            error: extractErrorMessage(error),

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

          pendingVerificationEmail: null,

        });

      },

      

      // Profile actions

      updateProfile: async (data) => {

        set({ isLoading: true, error: null });

        

        try {

          await authService.updateProfile(data);
          
          // Fetch fresh user data to get the updated profile image URL
          const freshUser = await authService.getUserProfile();

          set({ 

            user: freshUser, 

            isLoading: false,

            isEmailVerified: freshUser.is_verified,

          });

          return freshUser;

        } catch (error: any) {

          set({

            error: extractErrorMessage(error),

            isLoading: false,

          });

          throw error;

        }

      },

      

      updateLastSeen: async () => {
        try {
          await authService.updateLastSeen();
          
          // Update local user state to reflect online status
          const currentUser = get().user;
          if (currentUser) {
            set({ user: { ...currentUser, is_online: true } });
          }
        } catch (error) {
          // Silently fail - this is a non-critical background operation
        }
      },

      

      setOffline: async () => {
        try {
          await authService.setOffline();

          const currentUser = get().user;
          if (currentUser) {
            set({ user: { ...currentUser, is_online: false } });
          }
        } catch (error) {
          // Silently fail - this is a non-critical background operation
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

        api.removeToken();

        set({

          user: null,

          token: null,

          isAuthenticated: false,

          isLoading: false,

          error: null,

          isEmailVerified: false,

          verificationEmailSent: false,

          pendingVerificationEmail: null,

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

        pendingVerificationEmail: state.pendingVerificationEmail,

      }),

      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isLoading = false;
          if (state?.token) {
            api.setToken(state.token);
            
            // Fetch fresh user data to ensure latest online status and validate token
            authService.getUserProfile()
              .then(freshUser => {
                if (state) {
                  state.user = freshUser;
                  state.isAuthenticated = true;
                }
              })
              .catch(error => {
                console.error('Failed to fetch fresh user data on rehydration, clearing auth:', error);
                // Token is invalid, clear authentication state
                if (state) {
                  state.user = null;
                  state.token = null;
                  state.isAuthenticated = false;
                  state.isEmailVerified = false;
                }
                localStorage.removeItem('auth-storage');
                localStorage.removeItem('token');
              });
          } else {
            // No token, ensure authentication state is cleared
            state.isAuthenticated = false;
          }
        }
      },

    }

  )

);



// Selectors for better performance

export const useUser = () => useAuthStore((state) => state.user);

export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);

export const useAuthToken = () => useAuthStore((state) => state.token);

export const useAuthLoading = () => useAuthStore((state) => state.isLoading);

export const useAuthError = () => useAuthStore((state) => state.error);

export const useIsEmailVerified = () => useAuthStore((state) => state.isEmailVerified);

export const useVerificationEmailSent = () => useAuthStore((state) => state.verificationEmailSent);