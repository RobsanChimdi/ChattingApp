import { api } from './api';
import type { Chat, ChatCreateData } from '@/types/chat.types';
import type { Message } from '@/types/message.types';

export const chatService = {
  // Chat list
  async getChats(page = 1, pageSize = 20) {
    return api.get<{ results: Chat[]; count: number; next: string | null; previous: string | null }>(
      '/chats/',
      { params: { page, page_size: pageSize } }
    );
  },

  // Create chat
  async createChat(data: ChatCreateData): Promise<Chat> {
    return api.post<Chat>('/chats/', data);
  },

  // Create private chat
  async createPrivateChat(participantId: number): Promise<Chat> {
    return api.post<Chat>('/chats/create-private/', { participant_id: participantId });
  },

  // Chat details
  async getChat(chatId: string): Promise<Chat> {
    return api.get<Chat>(`/chats/${chatId}/`);
  },

  async updateChat(chatId: string, data: Partial<Chat>): Promise<Chat> {
    return api.put<Chat>(`/chats/${chatId}/update/`, data);
  },

  // Participants
  async addParticipant(chatId: string, userId: number): Promise<void> {
    await api.post(`/chats/${chatId}/add-participant/`, { user_id: userId });
  },

  async removeParticipant(chatId: string, userId: number): Promise<void> {
    await api.post(`/chats/${chatId}/remove-participant/`, { user_id: userId });
  },

  async leaveChat(chatId: string): Promise<void> {
    await api.post(`/chats/${chatId}/leave/`);
  },

  // Messages
  async getMessages(chatId: string, page = 1, pageSize = 50) {
    return api.get<{ results: Message[]; count: number }>(
      `/chats/${chatId}/messages/`,
      { params: { page, page_size: pageSize } }
    );
  },

  // Unread counts
  async getUnreadCounts(): Promise<Record<string, number>> {
    return api.get<Record<string, number>>('/unread-counts/');
  },

  // Search messages
  async searchMessages(query: string, chatId?: string, page = 1) {
    const params: any = { q: query, page };
    if (chatId) params.chat_id = chatId;
    
    return api.get('/messages/search/', { params });
  },

  // Media
  async getChatMedia(chatId: string, page = 1) {
    return api.get(`/media/chat-media/`, {
      params: { chat_id: chatId, page },
    });
  },
};