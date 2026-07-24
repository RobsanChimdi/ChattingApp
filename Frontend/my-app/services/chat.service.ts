// services/chat.service.ts
import { api } from './api';
import type { Chat, ChatCreateData } from '@/types/chat.types';
import type { Message } from '@/types/message.types';
import { extractErrorMessage } from '@/utils/errorHandler';

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

export const chatService = {
  // Chat list
  async getChats(page = 1, pageSize = 20): Promise<PaginatedResponse<Chat>> {
    try {
      return await api.get<PaginatedResponse<Chat>>('/chats/', {
        params: { page, page_size: pageSize }
      });
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  // Create chat
  async createChat(data: ChatCreateData): Promise<Chat> {
    try {
      return await api.post<Chat>('/chats/', data);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  // Create private chat
  async createPrivateChat(participantId: number): Promise<Chat> {
    try {
      return await api.post<Chat>('/chats/private/create/', { participant_id: participantId });
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  // Chat details
  async getChat(chatId: number): Promise<Chat> {
    try {
      return await api.get<Chat>(`/chats/${chatId}/`);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async updateChat(chatId: number, data: Partial<Chat>): Promise<Chat> {
    try {
      return await api.patch<Chat>(`/chats/${chatId}/update/`, data);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  // Participants
  async addParticipant(chatId: number, userId: number): Promise<{ status: string }> {
    try {
      return await api.post<{ status: string }>(`/chats/${chatId}/add-participant/`, { user_id: userId });
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async removeParticipant(chatId: number, userId: number): Promise<{ status: string }> {
    try {
      return await api.post<{ status: string }>(`/chats/${chatId}/remove-participant/`, { user_id: userId });
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async leaveChat(chatId: number): Promise<{ status: string }> {
    try {
      return await api.post<{ status: string }>(`/chats/${chatId}/leave/`);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },
   async markAllAsRead(chatId: number): Promise<{ count: number }> {
    try {
      return await api.post<{ count: number }>(`/messages/mark-all-read/`, { chat_id: chatId });
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  // Messages
  async getMessages(chatId: number, page = 1, pageSize = 50): Promise<PaginatedResponse<Message>> {
    try {
      return await api.get<PaginatedResponse<Message>>(
        `/chats/${chatId}/messages/`,
        { params: { page, page_size: pageSize } }
      );
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async sendMessage(chatId: number, data: FormData | any): Promise<Message> {
    try {
      const isFormData = data instanceof FormData;
      const url = '/messages/create/';
      
      if (isFormData) {
        return await api.upload<Message>(url, data);
      } else {
        return await api.post<Message>(url, { ...data, chat: chatId });
      }
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  // Unread counts
  async getUnreadCounts(): Promise<Record<string, number>> {
    try {
      return await api.get<Record<string, number>>('/chats/unread-counts/');
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  // Search messages
  async searchMessages(query: string, chatId?: number, page = 1): Promise<PaginatedResponse<Message>> {
    try {
      const params: any = { q: query, page };
      if (chatId) params.chat_id = chatId;
      
      return await api.get<PaginatedResponse<Message>>('/messages/search/', { params });
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },
};