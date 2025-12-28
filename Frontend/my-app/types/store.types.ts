import { User, Chat, Message, Call, CallParticipant, CallQuality } from './index';

// Auth Store
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Chat Store
export interface ChatState {
  chats: Chat[];
  currentChat: Chat | null;
  messages: Map<string, Message[]>;
  unreadCounts: Map<string, number>;
  typingUsers: Map<string, Set<number>>;
  onlineUsers: Map<number, { is_online: boolean; last_seen?: string }>;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
}

// Call Store
export interface CallState {
  activeCall: Call | null;
  incomingCall: Call | null;
  participants: Map<string, CallParticipant[]>;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  callQuality: Map<string, CallQuality[]>;
  isCallActive: boolean;
  isJoining: boolean;
  isMuted: boolean;
  hasVideo: boolean;
  isLoading: boolean;
  error: string | null;
}

// UI Store
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  createdAt: string;
}

export interface ModalState {
  id: string;
  type: string;
  props: Record<string, any>;
  isOpen: boolean;
}

export interface UIState {
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  notifications: Notification[];
  modals: ModalState[];
  loading: boolean;
  loadingMessage?: string;
  error: string | null;
}