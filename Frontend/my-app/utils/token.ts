import { STORAGE_KEYS } from './constants';

/**
 * Token manager utility
 */
export class TokenManager {
  private static memoryToken: string | null = null;
  
  /**
   * Get token
   */
  static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    // First try memory
    if (TokenManager.memoryToken) {
      return TokenManager.memoryToken;
    }
    
    // Then localStorage
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      TokenManager.memoryToken = token;
    }
    
    return token;
  }
  
  /**
   * Set token
   */
  static setToken(token: string): void {
    if (typeof window === 'undefined') return;
    
    TokenManager.memoryToken = token;
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  }
  
  /**
   * Clear token
   */
  static clearToken(): void {
    if (typeof window === 'undefined') return;
    
    TokenManager.memoryToken = null;
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  }
  
  /**
   * Check if token exists
   */
  static hasToken(): boolean {
    return !!TokenManager.getToken();
  }
  
  /**
   * Parse token to get payload
   */
  static parseToken(token: string): {
    user_id?: number;
    username?: string;
    exp?: number;
  } | null {
    try {
      // Simple JWT parsing (in real projects, use a proper JWT library)
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const payload = JSON.parse(atob(parts[1]));
      return {
        user_id: payload.user_id,
        username: payload.username,
        exp: payload.exp,
      };
    } catch (error) {
      console.error('Failed to parse token:', error);
      return null;
    }
  }
  
  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    const payload = TokenManager.parseToken(token);
    if (!payload || !payload.exp) return false;
    
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  }
  
  /**
   * Get token expiration date
   */
  static getTokenExpiration(token: string): Date | null {
    const payload = TokenManager.parseToken(token);
    if (!payload || !payload.exp) return null;
    
    return new Date(payload.exp * 1000);
  }
  
  /**
   * Get time until token expires
   */
  static getTimeUntilExpiration(token: string): number | null {
    const payload = TokenManager.parseToken(token);
    if (!payload || !payload.exp) return null;
    
    const now = Math.floor(Date.now() / 1000);
    return payload.exp - now;
  }
  
  /**
   * Check if token needs refresh (e.g., expires in less than 5 minutes)
   */
  static needsRefresh(token: string, thresholdSeconds = 300): boolean {
    const timeLeft = TokenManager.getTimeUntilExpiration(token);
    if (!timeLeft) return false;
    
    return timeLeft < thresholdSeconds;
  }
}

/**
 * Generate a random token (for testing/development)
 */
export const generateRandomToken = (length = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Generate session ID
 */
export const generateSessionId = (): string => {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};