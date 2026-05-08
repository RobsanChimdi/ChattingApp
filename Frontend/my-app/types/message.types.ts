// message.types.ts
import { User } from './user.types';
import { MessageMedia } from './media.types';
import { ChatType } from './chat.types';

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'location';
export type MessageStatusType = 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: number;
  client_message_id?: string;
  chat: number;
  chat_info?: {
    id: number;
    name?: string;
    chat_type: ChatType;
  };
  sender: number;
  sender_info?: {
    id: number;
    username: string;
    display_name: string;
    profile_image?: string;
  };
  message_type: MessageType;
  text?: string;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  is_forwarded: boolean;
  is_deleted: boolean;
  deleted_at?: string;
  deleted_by?: number;
  reply_to?: number;
  reply_to_info?: MessageSummary;
  latitude?: number;
  longitude?: number;
  location_name?: string;
  location_data?: {
    latitude: number;
    longitude: number;
    location_name?: string;
  };
  media?: MessageMedia[];
  statuses?: MessageStatus[];
  reactions?: MessageReaction[];
  status_summary?: {
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  };
}

export interface MessageStatus {
  id: number;
  message: number;
  user: number;
  user_info?: {
    id: number;
    username: string;
    display_name: string;
    profile_image?: string;
  };
  status: MessageStatusType;
  delivered_at?: string;
  read_at?: string;
  updated_at: string;
}

export interface MessageReaction {
  id: number;
  message: number;
  user: number;
  user_info?: {
    id: number;
    username: string;
    display_name: string;
    profile_image?: string;
  };
  emoji: string;
  reacted_at: string;
}

export interface MessageSummary {
  id: number;
  sender_info: {
    id: number;
    username: string;
    display_name: string;
    profile_image?: string;
  };
  message_type: MessageType;
  text?: string;
  summary: string;
  is_edited: boolean;
  is_forwarded: boolean;
  is_deleted: boolean;
  created_at: string;
  reply_to_info?: MessageSummary;
  media_count: number;
  reactions_summary: Record<string, number>;
}

export interface MessageCreateData {
  chat: number;
  text?: string;
  message_type?: MessageType;
  reply_to?: number;
  latitude?: number;
  longitude?: number;
  location_name?: string;
  files?: File[];
}

export interface MessageEditData {
  text: string;
}

export interface MessageForwardData {
  target_chat_id: number;
}

export interface MessageReactionData {
  emoji: string;
}

export interface TypingIndicator {
  chat_id: number;
  user_id: number;
  is_typing: boolean;
  timestamp: string;
}