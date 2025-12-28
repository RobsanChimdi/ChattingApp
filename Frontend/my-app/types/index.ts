// Export all core types
export * from './user.types';
export * from './chat.types';
export * from './message.types';
export * from './media.types';
export * from './call.types';
export * from './api.types';
export * from './socket.types';
export * from './store.types';

// Utility Types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = {
  [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
}[Keys] & Partial<T>;

export type RequireExactlyOne<T, Keys extends keyof T = keyof T> = {
  [K in Keys]-?: Required<Pick<T, K>> & Partial<Record<Exclude<Keys, K>, undefined>>
}[Keys];

// Event Map for type-safe event handling
export interface EventMap {
  // Auth events
  'auth:login': { user: User; token: string };
  'auth:logout': undefined;
  'auth:token_expired': undefined;
  
  // Chat events
  'chat:new_message': { message: Message };
  'chat:message_edited': { message: Message };
  'chat:message_deleted': { message_id: string; chat_id: string };
  'chat:message_reaction': { 
    message_id: string; 
    chat_id: string; 
    reaction: MessageReaction;
    action: 'added' | 'removed';
  };
  'chat:typing': { chat_id: string; user_id: number; is_typing: boolean };
  'chat:user_online': { user_id: number; is_online: boolean; last_seen: string };
  
  // Call events
  'call:initiated': { call: Call };
  'call:joined': { call_id: string; participant: CallParticipant };
  'call:left': { call_id: string; user_id: number };
  'call:ended': { call_id: string; reason: string };
  'call:quality_update': { 
    call_id: string; 
    user_id: number; 
    quality: CallQuality 
  };
  
  // WebRTC events
  'webrtc:signal': WebRTCSignal;
  
  // System events
  'system:error': ErrorEvent;
  'system:warning': { message: string; code: string };
  'system:info': { message: string; data?: any };
}

export type EventType = keyof EventMap;
export type EventPayload<T extends EventType> = EventMap[T];

// Store Types
export type StoreState = {
  auth: AuthState;
  chat: ChatState;
  call: CallState;
};

// Import types for EventMap (circular reference fix)
import { 
  User, 
  Message, 
  MessageReaction, 
  Call, 
  CallParticipant, 
  CallQuality,
  WebRTCSignal,
  ErrorEvent 
} from '.';

// Import store types
import { AuthState, ChatState, CallState } from './store.types';