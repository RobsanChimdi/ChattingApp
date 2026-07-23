// chat.types.ts
import { User } from './user.types';
import { Message, MessageType } from './message.types';

export type ChatType = 'private' | 'group';

export interface Chat {
  id: number;
  name?: string;
  description?: string;
  chat_type: ChatType;
  image?: string;
  avatar?: string;
  display_image?: string;
  display_name?: string;
  admin?: User;
  admin_info?: {
    id: number;
    username: string;
    display_name: string;
    profile_image?: string;
  };
  participants: User[];
  participants_info?: {
    id: number;
    username: string;
    display_name: string;
    profile_image?: string;
    is_online: boolean;
    last_seen?: string;
  }[];
  last_message?: {
    id: number;
    sender: string;
    message_type: MessageType;
    summary: string;
    created_at: string;
    is_edited: boolean;
  };
  unread_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatListItem {
  id: number;
  name?: string;
  display_name?: string;
  image?: string;
  avatar?: string;
  display_image?: string;
  chat_type: ChatType;
  description?: string;
  last_message?: {
    id: number;
    sender: string;
    message_type: MessageType;
    summary: string;
    created_at: string;
    is_edited: boolean;
  };
  unread_count: number;
  participants_info?: {
    id: number;
    username: string;
    display_name: string;
    profile_image?: string;
    is_online: boolean;
    last_seen?: string;
  }[];
  updated_at: string;
}

export interface ChatCreateData {
  name?: string;
  description?: string;
  chat_type: ChatType;
  image?: File | string;
  participants?: number[];
}

export interface PrivateChatCreateData {
  participant_id: number;
}

export interface ChatUpdateData {
  name?: string;
  description?: string;
  image?: File | string;
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