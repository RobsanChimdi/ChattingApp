import { User } from './user.types';
import { MessageMedia } from './media.types';
import { ChatType } from './chat.types'; // Make sure ChatType is exported from './chat'

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file';
export type MessageStatusType = 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: string;
  chat_id: string;
  sender: User;
  text?: string;
  message_type: MessageType;
  media?: MessageMedia[];
  reactions: MessageReaction[];
  statuses: MessageStatus[];
  reply_to?: Message;
  is_forwarded: boolean;
  is_edited: boolean;
  is_deleted: boolean;
  edited_at?: string;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface MessageStatus {
  id: string;
  message_id: string;
  user: User;
  status: MessageStatusType;
  delivered_at?: string;
  read_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user: User;
  emoji: string;
  created_at: string;
}

export interface MessageCreateData {
  chat: string;
  text?: string;
  message_type?: MessageType;
  reply_to?: string;
  files?: File[];
}

export interface MessageEditData {
  text: string;
}

export interface MessageForwardData {
  chat_id: string;
}

export interface MessageReactionData {
  emoji: string;
}

export interface MessageSummary {
  id: string;
  text: string;
  sender: User;
  chat: {
    id: string;
    name?: string;
    chat_type: ChatType;
  };
  created_at: string;
  message_type: MessageType;
}

export interface TypingIndicator {
  chat_id: string;
  user_id: number;
  is_typing: boolean;
  timestamp: string;
}