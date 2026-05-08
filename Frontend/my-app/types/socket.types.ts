// socket.types.ts
import { Message, MessageReaction } from './message.types';
import { Call, CallParticipant } from './call.types';

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
  message_id: number;
  chat_id: number;
}

export interface MessageReactionEvent {
  message_id: number;
  chat_id: number;
  reaction: MessageReaction;
  action: 'added' | 'removed';
}

export interface TypingEvent {
  chat_id: number;
  user_id: number;
  is_typing: boolean;
}

export interface UserTypingEvent {
  chat_id: number;
  user_id: number;
}

// Call Events
export interface IncomingCallEvent {
  call: Call;
}

export interface CallAcceptedEvent {
  call_id: number;
  participant: CallParticipant;
}

export interface CallRejectedEvent {
  call_id: number;
  user_id: number;
}

export interface CallEndedEvent {
  call_id: number;
  reason: string;
}

export interface ParticipantJoinedEvent {
  call_id: number;
  participant: CallParticipant;
}

export interface ParticipantLeftEvent {
  call_id: number;
  user_id: number;
}

export interface ParticipantMutedEvent {
  call_id: number;
  user_id: number;
  is_muted: boolean;
}

export interface ParticipantVideoToggledEvent {
  call_id: number;
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
  callId: number;
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
  credentialType?: 'password' | 'oauth';
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

// Socket Events Constants
export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  
  // Chat
  NEW_MESSAGE: 'new_message',
  MESSAGE_EDITED: 'message_edited',
  MESSAGE_DELETED: 'message_deleted',
  MESSAGE_REACTION: 'message_reaction',
  TYPING_START: 'typing_start',
  TYPING_END: 'typing_end',
  
  // Chat Management
  CHAT_CREATED: 'chat_created',
  CHAT_UPDATED: 'chat_updated',
  PARTICIPANT_ADDED: 'participant_added',
  PARTICIPANT_REMOVED: 'participant_removed',
  
  // Call
  INCOMING_CALL: 'incoming_call',
  CALL_ACCEPTED: 'call_accepted',
  CALL_REJECTED: 'call_rejected',
  CALL_ENDED: 'call_ended',
  PARTICIPANT_JOINED: 'participant_joined',
  PARTICIPANT_LEFT: 'participant_left',
  PARTICIPANT_MUTED: 'participant_muted',
  PARTICIPANT_VIDEO_TOGGLED: 'participant_video_toggled',
  
  // User Status
  USER_ONLINE_STATUS: 'user_online_status',
  
  // WebRTC
  WEBRTC_SIGNAL: 'webrtc_signal',
  CALL_QUALITY_UPDATE: 'call_quality_update',
} as const;

export type SocketEventType = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];