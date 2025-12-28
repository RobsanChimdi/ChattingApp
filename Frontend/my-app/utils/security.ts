/**
 * Security utility functions
 */
export class SecurityUtils {
  /**
   * Sanitize HTML string
   */
  static sanitizeHTML(html: string): string {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  }
  
  /**
   * Escape special characters for regex
   */
  static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  /**
   * Check if string contains malicious content
   */
  static hasMaliciousContent(str: string): boolean {
    const maliciousPatterns = [
      /<script.*?>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /data:/gi,
      /vbscript:/gi,
    ];
    
    return maliciousPatterns.some(pattern => pattern.test(str));
  }
  
  /**
   * Validate input against XSS attacks
   */
  static validateInput(input: string): { valid: boolean; sanitized?: string; error?: string } {
    if (this.hasMaliciousContent(input)) {
      return {
        valid: false,
        sanitized: this.sanitizeHTML(input),
        error: 'Input contains potentially harmful content',
      };
    }
    
    return {
      valid: true,
      sanitized: input,
    };
  }
  
  /**
   * Generate CSRF token
   */
  static generateCSRFToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  /**
   * Hash string (simple implementation)
   */
  static async hashString(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  
  /**
   * Generate secure random string
   */
  static generateSecureRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
    
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[randomValues[i] % chars.length];
    }
    
    return result;
  }
  
  /**
   * Mask sensitive data
   */
  static maskSensitiveData(data: string, visibleChars = 4): string {
    if (data.length <= visibleChars * 2) {
      return '*'.repeat(data.length);
    }
    
    const firstPart = data.substring(0, visibleChars);
    const lastPart = data.substring(data.length - visibleChars);
    const maskedPart = '*'.repeat(data.length - visibleChars * 2);
    
    return firstPart + maskedPart + lastPart;
  }
}

/**
 * Generate password strength score
 */
export const getPasswordStrength = (password: string): {
  score: number;
  strength: 'very weak' | 'weak' | 'fair' | 'good' | 'strong';
  suggestions: string[];
} => {
  let score = 0;
  const suggestions: string[] = [];
  
  // Length check
  if (password.length >= 8) score += 1;
  else suggestions.push('Use at least 8 characters');
  
  if (password.length >= 12) score += 1;
  
  // Character variety
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  
  // Suggestions for missing character types
  if (!/[a-z]/.test(password)) suggestions.push('Add lowercase letters');
  if (!/[A-Z]/.test(password)) suggestions.push('Add uppercase letters');
  if (!/[0-9]/.test(password)) suggestions.push('Add numbers');
  if (!/[^a-zA-Z0-9]/.test(password)) suggestions.push('Add special characters');
  
  // Determine strength
  let strength: 'very weak' | 'weak' | 'fair' | 'good' | 'strong';
  if (score <= 2) strength = 'very weak';
  else if (score <= 4) strength = 'weak';
  else if (score <= 6) strength = 'fair';
  else if (score <= 8) strength = 'good';
  else strength = 'strong';
  
  return { score, strength, suggestions };
};