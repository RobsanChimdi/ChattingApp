// services/chat.service.ts
import { api } from './api';
import type { Chat, ChatCreateData } from '@/types/chat.types';
import type { Message } from '@/types/message.types';

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

export const chatService = {
  // Chat list
  async getChats(page = 1, pageSize = 20): Promise<PaginatedResponse<Chat>> {
    return await api.get<PaginatedResponse<Chat>>('/chats/', {
      params: { page, page_size: pageSize }
    });
  },

  // Create chat
  async createChat(data: ChatCreateData): Promise<Chat> {
    return await api.post<Chat>('/chats/', data);
  },

  // Create private chat
  async createPrivateChat(participantId: number): Promise<Chat> {
    return await api.post<Chat>('/chats/private/create/', { participant_id: participantId });
  },

  // Chat details
  async getChat(chatId: number): Promise<Chat> {
    return await api.get<Chat>(`/chats/${chatId}/`);
  },

  async updateChat(chatId: number, data: Partial<Chat>): Promise<Chat> {
    return await api.patch<Chat>(`/chats/${chatId}/update/`, data);
  },

  // Participants
  async addParticipant(chatId: number, userId: number): Promise<{ status: string }> {
    return await api.post<{ status: string }>(`/chats/${chatId}/add-participant/`, { user_id: userId });
  },

  async removeParticipant(chatId: number, userId: number): Promise<{ status: string }> {
    return await api.post<{ status: string }>(`/chats/${chatId}/remove-participant/`, { user_id: userId });
  },

  async leaveChat(chatId: number): Promise<{ status: string }> {
    return await api.post<{ status: string }>(`/chats/${chatId}/leave/`);
  },
   async markAllAsRead(chatId: number): Promise<{ count: number }> {
    return await api.post<{ count: number }>(`/messages/mark-all-read/`, { chat_id: chatId });
  },

  // Messages
  async getMessages(chatId: number, page = 1, pageSize = 50): Promise<PaginatedResponse<Message>> {
    return await api.get<PaginatedResponse<Message>>(
      `/chats/${chatId}/messages/`,
      { params: { page, page_size: pageSize } }
    );
  },

  async sendMessage(chatId: number, data: FormData | any): Promise<Message> {
    const isFormData = data instanceof FormData;
    const url = '/messages/create/';
    
    if (isFormData) {
      return await api.upload<Message>(url, data);
    } else {
      return await api.post<Message>(url, { ...data, chat: chatId });
    }
  },

  // Unread counts
  async getUnreadCounts(): Promise<Record<string, number>> {
    return await api.get<Record<string, number>>('/chats/unread-counts/');
  },

  // Search messages
  async searchMessages(query: string, chatId?: number, page = 1): Promise<PaginatedResponse<Message>> {
    const params: any = { q: query, page };
    if (chatId) params.chat_id = chatId;
    
    return await api.get<PaginatedResponse<Message>>('/messages/search/', { params });
  },
};