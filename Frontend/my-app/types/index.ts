// index.ts - Main exports file

// Generic API Response
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  statusCode?: number;
  message?: string;
}

// Paginated Response
export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
  page: number;
  page_size: number;
  total_pages: number;
}

// Error Response
export interface ErrorResponse {
  error: string;
  code?: string;
  details?: {
    field: string;
    message: string;
  }[];
  timestamp: string;
  path?: string;
}

// Success Response
export interface SuccessResponse<T = any> {
  data: T;
  message?: string;
  status: 'success';
  timestamp: string;
}

// Upload Progress
export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
  speed: number;
  timeRemaining: number;
}

// Health Check
export interface HealthCheck {
  status: string;
  timestamp: string;
  database: string;
  cache: string;
  version: string;
}

// Unread Counts
export interface UnreadCounts {
  [chatId: string]: number;
}

// Export all types from modules
export * from './api.types';
export * from './user.types';
export * from './chat.types';
export * from './message.types';
export * from './media.types';
export * from './call.types';
export * from './socket.types';
export * from './store.types';