import { TIME } from './constants';

/**
 * Format date/time
 */
export const formatDate = (
  date: Date | string | number,
  format: 'relative' | 'date' | 'time' | 'datetime' | 'full' = 'relative'
): string => {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  
  // Relative time
  if (format === 'relative') {
    if (diff < TIME.MINUTE) {
      return 'Just now';
    } else if (diff < TIME.HOUR) {
      const minutes = Math.floor(diff / TIME.MINUTE);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diff < TIME.DAY) {
      const hours = Math.floor(diff / TIME.HOUR);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (diff < TIME.WEEK) {
      const days = Math.floor(diff / TIME.DAY);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    } else {
      return formatDate(d, 'date');
    }
  }
  
  // Date formatting
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  switch (format) {
    case 'date':
      return `${year}-${month}-${day}`;
    case 'time':
      return `${hours}:${minutes}`;
    case 'datetime':
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    case 'full':
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    default:
      return d.toISOString();
  }
};

/**
 * Format chat time (for message lists)
 */
export const formatChatTime = (date: Date | string): string => {
  const d = new Date(date);
  const now = new Date();
  
  // Today
  if (d.toDateString() === now.toDateString()) {
    return formatDate(d, 'time');
  }
  
  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  
  // Within this week
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  if (d > weekAgo) {
    const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return weekDays[d.getDay()];
  }
  
  // Older
  return formatDate(d, 'date');
};

/**
 * Format call duration
 */
export const formatCallDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
};

/**
 * Get relative time
 */
export const getRelativeTime = (date: Date | string): {
  value: number;
  unit: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
  isFuture: boolean;
} => {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const absDiff = Math.abs(diff);
  
  if (absDiff < TIME.MINUTE) {
    return {
      value: Math.floor(absDiff / TIME.SECOND),
      unit: 'second',
      isFuture: diff < 0,
    };
  } else if (absDiff < TIME.HOUR) {
    return {
      value: Math.floor(absDiff / TIME.MINUTE),
      unit: 'minute',
      isFuture: diff < 0,
    };
  } else if (absDiff < TIME.DAY) {
    return {
      value: Math.floor(absDiff / TIME.HOUR),
      unit: 'hour',
      isFuture: diff < 0,
    };
  } else if (absDiff < TIME.WEEK) {
    return {
      value: Math.floor(absDiff / TIME.DAY),
      unit: 'day',
      isFuture: diff < 0,
    };
  } else if (absDiff < TIME.MONTH) {
    return {
      value: Math.floor(absDiff / TIME.WEEK),
      unit: 'week',
      isFuture: diff < 0,
    };
  } else if (absDiff < TIME.YEAR) {
    return {
      value: Math.floor(absDiff / (TIME.DAY * 30)),
      unit: 'month',
      isFuture: diff < 0,
    };
  } else {
    return {
      value: Math.floor(absDiff / TIME.YEAR),
      unit: 'year',
      isFuture: diff < 0,
    };
  }
};

/**
 * Check if date is today
 */
export const isToday = (date: Date | string): boolean => {
  const d = new Date(date);
  const today = new Date();
  return d.toDateString() === today.toDateString();
};

/**
 * Check if date is yesterday
 */
export const isYesterday = (date: Date | string): boolean => {
  const d = new Date(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return d.toDateString() === yesterday.toDateString();
};

/**
 * Check if date is within this week
 */
export const isThisWeek = (date: Date | string): boolean => {
  const d = new Date(date);
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  return d > weekAgo;
};

/**
 * Get timestamp
 */
export const getTimestamp = (date?: Date | string): number => {
  if (!date) return Date.now();
  return new Date(date).getTime();
};

/**
 * Generate unique timestamp-based ID
 */
export const generateTimestampId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Calculate time difference in human-readable format
 */
export const getTimeDifference = (date1: Date | string, date2: Date | string): string => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diff = Math.abs(d2.getTime() - d1.getTime());
  
  if (diff < TIME.MINUTE) {
    return `${Math.floor(diff / TIME.SECOND)} seconds`;
  } else if (diff < TIME.HOUR) {
    return `${Math.floor(diff / TIME.MINUTE)} minutes`;
  } else if (diff < TIME.DAY) {
    return `${Math.floor(diff / TIME.HOUR)} hours`;
  } else {
    return `${Math.floor(diff / TIME.DAY)} days`;
  }
};