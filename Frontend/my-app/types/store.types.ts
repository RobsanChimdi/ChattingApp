// store.types.ts
import { User } from './user.types';
import { Chat, ChatListItem } from './chat.types';
import { Message } from './message.types';
import { Call, CallParticipant, CallQuality } from './call.types';

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
  chats: ChatListItem[];
  currentChat: Chat | null;
  messages: Map<number, Message[]>;
  unreadCounts: Map<number, number>;
  typingUsers: Map<number, Set<number>>;
  onlineUsers: Map<number, { is_online: boolean; last_seen?: string }>;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
}

// Call Store
export interface CallState {
  activeCall: Call | null;
  incomingCall: Call | null;
  participants: Map<number, CallParticipant[]>;
  localStream: MediaStream | null;
  remoteStreams: Map<number, MediaStream>;
  callQuality: Map<number, CallQuality[]>;
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

// Root Store
export interface RootState {
  auth: AuthState;
  chat: ChatState;
  call: CallState;
  ui: UIState;
}