import { Message, Call, CallParticipant, MessageReaction } from './index';

export interface SocketEvent<T = any> {
  type: string;
  payload: T;
  timestamp: string;
}

// Chat Events
export interface NewMessageEvent {
  message: Message;
}

export interface MessageEditedEvent {
  message: Message;
}

export interface MessageDeletedEvent {
  message_id: string;
  chat_id: string;
}

export interface MessageReactionEvent {
  message_id: string;
  chat_id: string;
  reaction: MessageReaction;
  action: 'added' | 'removed';
}

export interface TypingEvent {
  chat_id: string;
  user_id: number;
  is_typing: boolean;
}

export interface UserTypingEvent {
  chat_id: string;
  user_id: number;
}

// Call Events
export interface IncomingCallEvent {
  call: Call;
}

export interface CallAcceptedEvent {
  call_id: string;
  participant: CallParticipant;
}

export interface CallRejectedEvent {
  call_id: string;
  user_id: number;
}

export interface CallEndedEvent {
  call_id: string;
  reason: string;
}

export interface ParticipantJoinedEvent {
  call_id: string;
  participant: CallParticipant;
}

export interface ParticipantLeftEvent {
  call_id: string;
  user_id: number;
}

export interface ParticipantMutedEvent {
  call_id: string;
  user_id: number;
  is_muted: boolean;
}

export interface ParticipantVideoToggledEvent {
  call_id: string;
  user_id: number;
  has_video: boolean;
}

// User Events
export interface UserOnlineStatusEvent {
  user_id: number;
  is_online: boolean;
  last_seen?: string;
}

// WebRTC Events
export interface WebRTCSignal {
  callId: string;
  senderId: number;
  targetId?: number;
  type: 'offer' | 'answer' | 'candidate' | 'bye';
  data: any;
}
// WebRTC ICE server type
export interface ICEServer {
  urls: string | string[];
  username?: string;
  credential?: string;
  credentialType?: 'password' | 'oauth' | string; // fallback to string
}

// Connection Events
export interface ConnectionEvent {
  connected: boolean;
  reason?: string;
}

export interface ErrorEvent {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}