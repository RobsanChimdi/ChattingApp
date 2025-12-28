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
  
  // Actions
  login: (credentials: { username: string; password: string }) => Promise<void>;
  register: (data: {
    username: string;
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  
  // Status
  updateLastSeen: () => Promise<void>;
  setOffline: () => Promise<void>;
  
  // Utilities
  requireAuth: (redirectTo?: string) => boolean;
  requireGuest: (redirectTo?: string) => boolean;
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
    login: loginAction,
    register: registerAction,
    logout: logoutAction,
    updateProfile: updateProfileAction,
    updateLastSeen,
    setOffline,
    setError,
    clearError,
  } = useAuthStore();

  // Auto-connect socket when authenticated
  useEffect(() => {
    if (isAuthenticated && !socketService.isConnected()) {
      socketService.connect().catch((error) => {
        console.error('Failed to connect socket:', error);
        setError('Connection error. Please refresh the page.');
      });
    }
    
    if (!isAuthenticated && socketService.isConnected()) {
      socketService.disconnect();
    }
  }, [isAuthenticated, setError]);

  // Auto-update last seen when user is active
  useEffect(() => {
    if (!isAuthenticated) return;

    let lastActivity = Date.now();
    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll'];

    const handleActivity = () => {
      const now = Date.now();
      // Update last seen every 30 seconds of activity
      if (now - lastActivity > 30000) {
        updateLastSeen().catch(console.error);
        lastActivity = now;
      }
    };

    // Add event listeners
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    // Initial update
    updateLastSeen().catch(console.error);

    return () => {
      // Cleanup event listeners
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });

      // Set offline when component unmounts (if still authenticated)
      if (isAuthenticated) {
        setOffline().catch(console.error);
      }
    };
  }, [isAuthenticated, updateLastSeen, setOffline]);

  // Wrapped actions with error handling
  interface LoginCredentials {
    username: string;
    password: string;
  }

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<void> => {
      try {
        await loginAction(credentials);
        clearError();

        // Redirect to main page after successful login
        const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/';
        sessionStorage.removeItem('redirectAfterLogin');
        router.push(redirectPath);
      } catch (error) {
        // Error is already set in store
        throw error;
      }
    },
    [loginAction, router, clearError]
  );

  interface RegisterData {
    username: string;
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
  }

  const register = useCallback(
    async (data: RegisterData): Promise<void> => {
      try {
        await registerAction(data);
        clearError();
        
        // Redirect to main page after successful registration
        router.push('/');
      } catch (error) {
        throw error;
      }
    },
    [registerAction, router, clearError]
  );

  const logout = useCallback(async () => {
    try {
      await logoutAction();
      clearError();
      
      // Redirect to login page
      router.push('/login');
    } catch (error) {
      throw error;
    }
  }, [logoutAction, router, clearError]);

  interface UpdateProfileData extends Partial<User> {}

  const updateProfile = useCallback(
    async (data: UpdateProfileData): Promise<void> => {
      try {
        await updateProfileAction(data);
        clearError();
      } catch (error) {
        throw error;
      }
    },
    [updateProfileAction, clearError]
  );

  // Auth guards
  const requireAuth = useCallback((redirectTo = '/login') => {
    if (!isAuthenticated && !isLoading) {
      // Save current path for redirect after login
      sessionStorage.setItem('redirectAfterLogin', pathname);
      router.push(redirectTo);
      return false;
    }
    return true;
  }, [isAuthenticated, isLoading, pathname, router]);

  const requireGuest = useCallback((redirectTo = '/') => {
    if (isAuthenticated && !isLoading) {
      router.push(redirectTo);
      return false;
    }
    return true;
  }, [isAuthenticated, isLoading, router]);

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,
    
    // Actions
    login,
    register,
    logout,
    updateProfile,
    
    // Status
    updateLastSeen,
    setOffline,
    
    // Utilities
    requireAuth,
    requireGuest,
  };
};

// Selector hooks for specific auth state
export const useCurrentUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useAuthStatus = () => useAuthStore((state) => ({
  isLoading: state.isLoading,
  error: state.error,
}));