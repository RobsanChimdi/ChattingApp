import { User } from './user.types';
import { Message, MessageType } from './message.types';

export type ChatType = 'private' | 'group';

export interface Chat {
  id: string;
  name?: string;
  description?: string;
  chat_type: ChatType;
  avatar?: string;
  admin?: User;
  participants: User[];
  last_message?: Message;
  unread_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  muted_until?: string;
}

export interface ChatListItem {
  id: string;
  name?: string;
  avatar?: string;
  chat_type: ChatType;
  last_message?: {
    id: string;
    text: string;
    sender: User;
    created_at: string;
    message_type: MessageType;
  };
  unread_count: number;
  participants_count: number;
  updated_at: string;
  is_active: boolean;
}

export interface ChatCreateData {
  name?: string;
  description?: string;
  chat_type: ChatType;
  avatar?: string;
  participant_ids?: number[];
}

export interface PrivateChatCreateData {
  participant_id: number;
}

export interface ChatUpdateData {
  name?: string;
  description?: string;
  avatar?: string;
}

export interface AddParticipantData {
  user_id: number;
}

export interface RemoveParticipantData {
  user_id: number;
}

export interface ChatParticipant {
  user: User;
  joined_at: string;
  role: 'admin' | 'member';
  left_at?: string;
}