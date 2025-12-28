// App constants
export const APP = {
  NAME: 'ChatApp',
  VERSION: '1.0.0',
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_VIDEO_SIZE: 100 * 1024 * 1024, // 100MB
} as const;

// Time constants
export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000,
} as const;

// Message constants
export const MESSAGE = {
  MAX_LENGTH: 2000,
  EDIT_TIME_LIMIT: 15 * TIME.MINUTE, // 15 minutes
  DELETE_TIME_LIMIT: 1 * TIME.HOUR, // 1 hour
} as const;

// Pagination constants
export const PAGINATION = {
  CHATS_PER_PAGE: 20,
  MESSAGES_PER_PAGE: 50,
  MEDIA_PER_PAGE: 20,
  SEARCH_RESULTS_PER_PAGE: 20,
} as const;

// Media type constants
export const MEDIA_TYPES = {
  IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'],
  VIDEO: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
  AUDIO: ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/aac'],
  DOCUMENT: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
  ],
} as const;

// Emoji constants
export const EMOJIS = {
  REACTIONS: ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '👏'],
  COMMON: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃'],
} as const;

// Cache constants
export const CACHE = {
  USER_DATA_TTL: 5 * TIME.MINUTE,
  CHATS_TTL: 2 * TIME.MINUTE,
  MESSAGES_TTL: 1 * TIME.MINUTE,
  ONLINE_STATUS_TTL: 30 * TIME.SECOND,
} as const;

// Error messages
export const ERROR_MESSAGES = {
  NETWORK: 'Network connection failed. Please check your connection.',
  UNAUTHORIZED: 'Authentication failed. Please login again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER: 'Internal server error.',
  VALIDATION: 'Input data validation failed.',
  FILE_TOO_LARGE: 'File size exceeds the limit.',
  UNSUPPORTED_FILE_TYPE: 'Unsupported file type.',
  MEDIA_PERMISSION: 'Camera/microphone permission required.',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  LOGIN: 'Login successful',
  REGISTER: 'Registration successful',
  MESSAGE_SENT: 'Message sent successfully',
  MESSAGE_EDITED: 'Message edited successfully',
  MESSAGE_DELETED: 'Message deleted successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
  CHAT_CREATED: 'Chat created successfully',
  FILE_UPLOADED: 'File uploaded successfully',
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'chat_app_token',
  USER_DATA: 'chat_app_user',
  THEME: 'chat_app_theme',
  LANGUAGE: 'chat_app_language',
  NOTIFICATIONS: 'chat_app_notifications',
  RECENT_SEARCHES: 'chat_app_recent_searches',
} as const;

// WebRTC constants
export const WEBRTC = {
  ICE_SERVERS: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
  ICE_CANDIDATE_POOL_SIZE: 10,
} as const;

// Notification constants
export const NOTIFICATIONS = {
  TIMEOUT: 5000,
  POSITION: 'bottom-right' as const,
} as const;