// hooks/useAuth.ts
import { useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { socketService } from '@/socket/socket';
import type { User } from '@/types/user.types';

interface UseAuthReturn {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isEmailVerified: boolean;
  verificationEmailSent: boolean;
  pendingVerificationEmail: string | null;
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
  
  // Email Verification
  verifyEmail: (data: { email: string; verification_code: string }) => Promise<boolean>;
  resendVerificationCode: (email: string) => Promise<void>;
  
  // Password Reset
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (data: { 
    reset_token: string; 
    new_password: string; 
    confirm_password: string;
  }) => Promise<void>;
  
  // Profile Actions
  updateProfile: (data: FormData | Partial<User>) => Promise<User>;
  updateLastSeen: () => Promise<void>;
  setOffline: () => Promise<void>;
  
  // WebSocket
  getWebSocketToken: () => Promise<{ token: string; user_id: number; username?: string }>;
  
  // Utilities
  requireAuth: (redirectTo?: string) => boolean;
  requireGuest: (redirectTo?: string) => boolean;
  requireVerified: (redirectTo?: string) => boolean;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuth = (): UseAuthReturn => {
  const router = useRouter();
  const pathname = usePathname();
  
  // Get state and actions from store
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    isEmailVerified,
    verificationEmailSent,
    pendingVerificationEmail,
    login: loginAction,
    register: registerAction,
    logout: logoutAction,
    verifyEmail: verifyEmailAction,
    resendVerificationCode: resendVerificationCodeAction,
    requestPasswordReset: requestPasswordResetAction,
    resetPassword: resetPasswordAction,
    updateProfile: updateProfileAction,
    updateLastSeen: updateLastSeenAction,
    setOffline: setOfflineAction,
    getWebSocketToken,
    setError,
    clearError: clearErrorAction,
    setLoading: setLoadingAction,
  } = useAuthStore();

  // FIXED: Only connect socket when authenticated AND email verified
  useEffect(() => {
    let isMounted = true;
    let isConnecting = false;

    const connectSocket = async () => {
      // Prevent multiple connection attempts
      if (isConnecting) return;
      
      // Only connect if:
      // 1. User is authenticated
      // 2. Email is verified  
      // 3. Socket is not already connected
      // 4. Not manually disconnected
      // 5. Page is visible (prevents background connections)
      if (isAuthenticated && isEmailVerified && !socketService.isConnected() && document.visibilityState === 'visible') {
        isConnecting = true;
        try {
          await getWebSocketToken();
          await socketService.connect();
        } catch (error) {
          console.error('Failed to connect socket:', error);
          if (isMounted) {
            setError('Connection error. Please refresh the page.');
          }
        } finally {
          isConnecting = false;
        }
      }
      
      // Disconnect if not authenticated
      if (!isAuthenticated && socketService.isConnected()) {
        socketService.disconnect();
      }
    };

    // Delay initial connection to avoid race conditions
    const timer = setTimeout(connectSocket, 500);

    return () => {
      clearTimeout(timer);
      isMounted = false;
    };
  }, [isAuthenticated, isEmailVerified, getWebSocketToken, setError]);

  // Handle visibility change (tab becomes visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated && isEmailVerified && !socketService.isConnected()) {
        console.log('Tab became visible, reconnecting socket...');
        getWebSocketToken()
          .then(() => socketService.connect())
          .catch(error => console.error('Failed to reconnect socket:', error));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, isEmailVerified, getWebSocketToken]);

  // Auto-update last seen when user is active (only if verified)
  useEffect(() => {
    if (!isAuthenticated || !isEmailVerified) return;

    let lastActivity = Date.now();
    let activityTimer: NodeJS.Timeout;
    let updateTimer: NodeJS.Timeout;
    
    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    const updateLastSeen = () => {
      const now = Date.now();
      if (now - lastActivity >= 30000) {
        updateLastSeenAction().catch(console.error);
        lastActivity = now;
      }
    };

    const handleActivity = () => {
      clearTimeout(activityTimer);
      activityTimer = setTimeout(updateLastSeen, 1000);
    };

    const startPeriodicUpdate = () => {
      updateTimer = setInterval(() => {
        updateLastSeenAction().catch(console.error);
      }, 60000);
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    updateLastSeenAction().catch(console.error);
    startPeriodicUpdate();

    return () => {
      clearTimeout(activityTimer);
      clearInterval(updateTimer);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });

      if (isAuthenticated && isEmailVerified) {
        setOfflineAction().catch(console.error);
      }
    };
  }, [isAuthenticated, isEmailVerified, updateLastSeenAction, setOfflineAction]);

  const login = useCallback(
    async (credentials: { username: string; password: string }): Promise<void> => {
      try {
        await loginAction(credentials);
        clearErrorAction();

        const state = useAuthStore.getState();
        
        if (!state.isEmailVerified) {
          router.push('/verify-email');
          return;
        }

        const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/dashboard';
        sessionStorage.removeItem('redirectAfterLogin');
        router.push(redirectPath);
      } catch (error: any) {
        const errorMessage = error.response?.data?.error || '';
        if (error.response?.status === 403 && errorMessage.toLowerCase().includes('verify')) {
          router.push('/verify-email');
        }
        throw error;
      }
    },
    [loginAction, router, clearErrorAction]
  );

  const register = useCallback(
    async (data: {
      username: string;
      email: string;
      password: string;
      confirm_password: string;
      first_name?: string;
      last_name?: string;
      bio?: string;
      phone_number?: string;
    }): Promise<void> => {
      try {
        await registerAction(data);
        clearErrorAction();
        router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
      } catch (error) {
        throw error;
      }
    },
    [registerAction, router, clearErrorAction]
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await logoutAction();
      clearErrorAction();
      
      if (socketService.isConnected()) {
        socketService.disconnect();
      }
      
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/login');
    }
  }, [logoutAction, router, clearErrorAction]);

  const verifyEmail = useCallback(
    async (data: { email: string; verification_code: string }): Promise<boolean> => {
      try {
        const result = await verifyEmailAction(data);
        clearErrorAction();
        
        if (result) {
          router.push('/dashboard');
        }
        
        return result;
      } catch (error) {
        throw error;
      }
    },
    [verifyEmailAction, router, clearErrorAction]
  );

  const resendVerificationCode = useCallback(
    async (email: string): Promise<void> => {
      try {
        await resendVerificationCodeAction(email);
        clearErrorAction();
      } catch (error) {
        throw error;
      }
    },
    [resendVerificationCodeAction, clearErrorAction]
  );

  const requestPasswordReset = useCallback(
    async (email: string): Promise<void> => {
      try {
        await requestPasswordResetAction(email);
        clearErrorAction();
      } catch (error) {
        throw error;
      }
    },
    [requestPasswordResetAction, clearErrorAction]
  );

  const resetPassword = useCallback(
    async (data: { 
      reset_token: string; 
      new_password: string; 
      confirm_password: string;
    }): Promise<void> => {
      try {
        await resetPasswordAction(data);
        clearErrorAction();
        router.push('/login?reset=success');
      } catch (error) {
        throw error;
      }
    },
    [resetPasswordAction, router, clearErrorAction]
  );

  const updateProfile = useCallback(
    async (data: FormData | Partial<User>): Promise<User> => {
      try {
        const updatedUser = await updateProfileAction(data);
        clearErrorAction();
        return updatedUser;
      } catch (error) {
        throw error;
      }
    },
    [updateProfileAction, clearErrorAction]
  );

  const updateLastSeen = useCallback(async (): Promise<void> => {
    try {
      await updateLastSeenAction();
    } catch (error) {
      console.error('Failed to update last seen:', error);
    }
  }, [updateLastSeenAction]);

  const setOffline = useCallback(async (): Promise<void> => {
    try {
      await setOfflineAction();
    } catch (error) {
      console.error('Failed to set offline:', error);
    }
  }, [setOfflineAction]);

  const requireAuth = useCallback((redirectTo = '/login'): boolean => {
    if (!isAuthenticated && !isLoading) {
      sessionStorage.setItem('redirectAfterLogin', pathname || '/');
      router.push(redirectTo);
      return false;
    }
    return true;
  }, [isAuthenticated, isLoading, pathname, router]);

  const requireGuest = useCallback((redirectTo = '/'): boolean => {
    if (isAuthenticated && !isLoading) {
      router.push(redirectTo);
      return false;
    }
    return true;
  }, [isAuthenticated, isLoading, router]);

  const requireVerified = useCallback((redirectTo = '/verify-email'): boolean => {
    if (isAuthenticated && !isEmailVerified && !isLoading) {
      router.push(redirectTo);
      return false;
    }
    return true;
  }, [isAuthenticated, isEmailVerified, isLoading, router]);

  const clearError = useCallback((): void => {
    clearErrorAction();
  }, [clearErrorAction]);

  const setLoading = useCallback((loading: boolean): void => {
    setLoadingAction(loading);
  }, [setLoadingAction]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    isEmailVerified,
    verificationEmailSent,
    pendingVerificationEmail,
    login,
    register,
    logout,
    verifyEmail,
    resendVerificationCode,
    requestPasswordReset,
    resetPassword,
    updateProfile,
    updateLastSeen,
    setOffline,
    getWebSocketToken,
    requireAuth,
    requireGuest,
    requireVerified,
    clearError,
    setLoading,
  };
};

// Selector hooks for specific auth state
export const useCurrentUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useIsEmailVerified = () => useAuthStore((state) => state.isEmailVerified);
export const useAuthStatus = () => useAuthStore((state) => ({
  isLoading: state.isLoading,
  error: state.error,
  isEmailVerified: state.isEmailVerified,
  verificationEmailSent: state.verificationEmailSent,
}));