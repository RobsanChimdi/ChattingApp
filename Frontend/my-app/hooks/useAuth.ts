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
  
  // Authentication Actions
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
  getWebSocketToken: () => Promise<{ token: string; user_id: number }>;
  
  // Utilities
  requireAuth: (redirectTo?: string) => boolean;
  requireGuest: (redirectTo?: string) => boolean;
  requireVerified: (redirectTo?: string) => boolean;
  clearError: () => void;
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
  } = useAuthStore();

  // Auto-connect socket when authenticated and email verified
  useEffect(() => {
    const connectSocket = async () => {
      if (isAuthenticated && isEmailVerified && !socketService.isConnected()) {
        try {
          // Get WebSocket token for authentication
          const { token } = await getWebSocketToken();
          await socketService.connect();
        } catch (error) {
          console.error('Failed to connect socket:', error);
          setError('Connection error. Please refresh the page.');
        }
      }
      
      if (!isAuthenticated && socketService.isConnected()) {
        socketService.disconnect();
      }
    };

    connectSocket();
  }, [isAuthenticated, isEmailVerified, getWebSocketToken, setError]);

  // Auto-update last seen when user is active (only if verified)
  useEffect(() => {
    if (!isAuthenticated || !isEmailVerified) return;

    let lastActivity = Date.now();
    let activityTimer: NodeJS.Timeout;
    
    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    const handleActivity = () => {
      const now = Date.now();
      // Update last seen every 30 seconds of activity
      if (now - lastActivity > 30000) {
        updateLastSeenAction().catch(console.error);
        lastActivity = now;
      }
    };

    // Debounced activity handler
    const debouncedHandleActivity = () => {
      clearTimeout(activityTimer);
      activityTimer = setTimeout(handleActivity, 1000);
    };

    // Add event listeners
    activityEvents.forEach((event) => {
      window.addEventListener(event, debouncedHandleActivity);
    });

    // Initial update
    updateLastSeenAction().catch(console.error);

    return () => {
      // Cleanup event listeners
      clearTimeout(activityTimer);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, debouncedHandleActivity);
      });

      // Set offline when component unmounts (if still authenticated)
      if (isAuthenticated && isEmailVerified) {
        setOfflineAction().catch(console.error);
      }
    };
  }, [isAuthenticated, isEmailVerified, updateLastSeenAction, setOfflineAction]);

  // Wrapped actions with error handling and redirects
  const login = useCallback(
    async (credentials: { username: string; password: string }): Promise<void> => {
      try {
        await loginAction(credentials);
        clearErrorAction();

        const state = useAuthStore.getState();
        
        // Check if email is verified after login attempt
        if (!state.isEmailVerified) {
          // Redirect to verification page if email not verified
          router.push('/verify-email');
          return;
        }

        // Redirect to main page after successful login
        const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/';
        sessionStorage.removeItem('redirectAfterLogin');
        router.push(redirectPath);
      } catch (error) {
        // Error is already set in store
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
    }): Promise<void> => {
      try {
        await registerAction(data);
        clearErrorAction();
        
        // Redirect to verification page after successful registration
        router.push('/verify-email');
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
      
      // Redirect to login page
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect even if API call fails
      router.push('/login');
    }
  }, [logoutAction, router, clearErrorAction]);

  // Email verification
  const verifyEmail = useCallback(
    async (data: { email: string; verification_code: string }): Promise<boolean> => {
      try {
        const result = await verifyEmailAction(data);
        clearErrorAction();
        
        if (result) {
          router.push('/');
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

  // Password reset
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

  // Auth guards
  const requireAuth = useCallback((redirectTo = '/login'): boolean => {
    if (!isAuthenticated && !isLoading) {
      // Save current path for redirect after login
      sessionStorage.setItem('redirectAfterLogin', pathname);
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

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,
    isEmailVerified,
    verificationEmailSent,
    
    // Authentication Actions
    login,
    register,
    logout,
    
    // Email Verification
    verifyEmail,
    resendVerificationCode,
    
    // Password Reset
    requestPasswordReset,
    resetPassword,
    
    // Profile Actions
    updateProfile,
    updateLastSeen,
    setOffline,
    
    // WebSocket
    getWebSocketToken,
    
    // Utilities
    requireAuth,
    requireGuest,
    requireVerified,
    clearError,
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