import { MEDIA_TYPES, APP, ERROR_MESSAGES } from './constants';

/**
 * Validation utility functions
 */
export class Validators {
  /**
   * Validate email
   */
  static validateEmail(email: string): { valid: boolean; error?: string } {
    if (!email) {
      return { valid: false, error: 'Email is required' };
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Invalid email format' };
    }
    
    return { valid: true };
  }
  
  /**
   * Validate username
   */
  static validateUsername(username: string): { valid: boolean; error?: string } {
    if (!username) {
      return { valid: false, error: 'Username is required' };
    }
    
    if (username.length < 3) {
      return { valid: false, error: 'Username must be at least 3 characters' };
    }
    
    if (username.length > 30) {
      return { valid: false, error: 'Username must be less than 30 characters' };
    }
    
    const usernameRegex = /^[a-zA-Z0-9_.-]+$/;
    if (!usernameRegex.test(username)) {
      return { valid: false, error: 'Username can only contain letters, numbers, dots, hyphens, and underscores' };
    }
    
    return { valid: true };
  }
  
  /**
   * Validate password
   */
  static validatePassword(password: string): { valid: boolean; error?: string } {
    if (!password) {
      return { valid: false, error: 'Password is required' };
    }
    
    if (password.length < 6) {
      return { valid: false, error: 'Password must be at least 6 characters' };
    }
    
    if (password.length > 100) {
      return { valid: false, error: 'Password must be less than 100 characters' };
    }
    
    return { valid: true };
  }
  
  /**
   * Validate message text
   */
  static validateMessage(text: string): { valid: boolean; error?: string } {
    if (!text?.trim()) {
      return { valid: false, error: 'Message cannot be empty' };
    }
    
    if (text.length > 2000) {
      return { valid: false, error: 'Message is too long (max 2000 characters)' };
    }
    
    return { valid: true };
  }
  
  /**
   * Validate file
   */
  static validateFile(file: File): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: 'No file selected' };
    }
    
    // Check file size
    if (file.size > APP.MAX_FILE_SIZE) {
      return { valid: false, error: ERROR_MESSAGES.FILE_TOO_LARGE };
    }
    
    // Check file type
    const isValidType = 
      MEDIA_TYPES.IMAGE.includes(file.type as typeof MEDIA_TYPES.IMAGE[number]) ||
      MEDIA_TYPES.VIDEO.includes(file.type as typeof MEDIA_TYPES.VIDEO[number]) ||
      MEDIA_TYPES.AUDIO.includes(file.type as typeof MEDIA_TYPES.AUDIO[number]) ||
      MEDIA_TYPES.DOCUMENT.includes(file.type as typeof MEDIA_TYPES.DOCUMENT[number]);
    
    if (!isValidType) {
      return { valid: false, error: ERROR_MESSAGES.UNSUPPORTED_FILE_TYPE };
    }
    
    return { valid: true };
  }
  
  /**
   * Validate image file
   */
  static validateImage(file: File): { valid: boolean; error?: string } {
    const basicValidation = this.validateFile(file);
    if (!basicValidation.valid) return basicValidation;
    
    if (!MEDIA_TYPES.IMAGE.includes(file.type as typeof MEDIA_TYPES.IMAGE[number])) {
      return { valid: false, error: 'File must be an image (JPEG, PNG, GIF, WebP, BMP)' };
    }
    
    if (file.size > APP.MAX_IMAGE_SIZE) {
      return { valid: false, error: 'Image size must be less than 5MB' };
    }
    
    return { valid: true };
  }
  
  /**
   * Validate video file
   */
  static validateVideo(file: File): { valid: boolean; error?: string } {
    const basicValidation = this.validateFile(file);
    if (!basicValidation.valid) return basicValidation;
    
    if (!MEDIA_TYPES.VIDEO.includes(file.type as typeof MEDIA_TYPES.VIDEO[number])) {
      return { valid: false, error: 'File must be a video (MP4, WebM, OGG, QuickTime)' };
    }
    
    if (file.size > APP.MAX_VIDEO_SIZE) {
      return { valid: false, error: 'Video size must be less than 100MB' };
    }
    
    return { valid: true };
  }
  
  /**
   * Validate URL
   */
  static validateURL(url: string): { valid: boolean; error?: string } {
    if (!url) {
      return { valid: false, error: 'URL is required' };
    }
    
    try {
      new URL(url);
      return { valid: true };
    } catch {
      return { valid: false, error: 'Invalid URL format' };
    }
  }
  
  /**
   * Validate phone number (basic)
   */
  static validatePhone(phone: string): { valid: boolean; error?: string } {
    if (!phone) {
      return { valid: false, error: 'Phone number is required' };
    }
    
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
      return { valid: false, error: 'Invalid phone number format' };
    }
    
    return { valid: true };
  }
  
  /**
   * Validate chat name
   */
  static validateChatName(name: string): { valid: boolean; error?: string } {
    if (!name?.trim()) {
      return { valid: false, error: 'Chat name is required' };
    }
    
    if (name.length < 2) {
      return { valid: false, error: 'Chat name must be at least 2 characters' };
    }
    
    if (name.length > 100) {
      return { valid: false, error: 'Chat name must be less than 100 characters' };
    }
    
    return { valid: true };
  }
  
  /**
   * Validate emoji
   */
  static validateEmoji(emoji: string): { valid: boolean; error?: string } {
    if (!emoji) {
      return { valid: false, error: 'Emoji is required' };
    }
    
    // Basic emoji validation (this is simplified)
    const emojiRegex = /^[\p{Emoji}]$/u;
    if (!emojiRegex.test(emoji) && emoji.length > 2) {
      return { valid: false, error: 'Invalid emoji' };
    }
    
    return { valid: true };
  }
}

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Deep clone object
 */
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Check if object is empty
 */
export const isEmpty = (obj: Record<string, any>): boolean => {
  return Object.keys(obj).length === 0;
};

/**
 * Generate unique ID
 */
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

/**
 * Remove duplicates from array
 */
export const removeDuplicates = <T>(array: T[], key?: keyof T): T[] => {
  if (!key) {
    return [...new Set(array)];
  }
  
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
};

/**
 * Convert file size to human readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};