// services/message.service.ts
import { api } from './api';
import type { Message, MessageCreateData, MessageReaction } from '../types/message.types';

export interface MarkAllReadResponse {
  count: number;
}

export interface MediaInfo {
  id: number;
  file: string;
  file_name: string;
  file_size: number;
  formatted_size: string;
  mime_type: string;
  duration?: number;
  width?: number;
  height?: number;
  url: string;
  thumbnail_url?: string;
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

export const messageService = {
  // Create message
  async sendMessage(data: MessageCreateData): Promise<Message> {
    const formData = new FormData();
    
    // Add text data
    if (data.text) formData.append('text', data.text);
    if (data.chat) formData.append('chat', data.chat.toString());
    if (data.reply_to) formData.append('reply_to', data.reply_to.toString());
    if (data.message_type) formData.append('message_type', data.message_type);
    
    // Add location data
    if (data.latitude) formData.append('latitude', data.latitude.toString());
    if (data.longitude) formData.append('longitude', data.longitude.toString());
    if (data.location_name) formData.append('location_name', data.location_name);
    
    // Add files
    if (data.files && data.files.length > 0) {
      data.files.forEach((file) => {
        formData.append('files', file);
      });
    }
    
    return await api.upload<Message>('/messages/create/', formData);
  },

  // Get message
  async getMessage(messageId: number): Promise<Message> {
    return await api.get<Message>(`/messages/${messageId}/`);
  },
 async markAllAsRead(chatId: number): Promise<MarkAllReadResponse> {
    return await api.post<MarkAllReadResponse>(`/messages/mark-all-read/`, { chat_id: chatId });
  },
  // Edit message
  async editMessage(messageId: number, text: string): Promise<Message> {
    return await api.patch<Message>(`/messages/${messageId}/`, { text });
  },

  // Delete message (soft delete)
  async deleteMessage(messageId: number): Promise<void> {
    await api.delete(`/messages/${messageId}/`);
  },

  // Reactions
  async addReaction(messageId: number, emoji: string): Promise<MessageReaction> {
    return await api.post<MessageReaction>(`/messages/${messageId}/reactions/`, { emoji });
  },

  async removeReaction(messageId: number, emoji: string): Promise<void> {
    await api.delete(`/messages/${messageId}/reactions/${encodeURIComponent(emoji)}/`);
  },

  // Forward message
  async forwardMessage(messageId: number, targetChatId: number): Promise<Message> {
    return await api.post<Message>(`/messages/${messageId}/forward/`, { target_chat_id: targetChatId });
  },

  // Mark as read
  async markMessageAsRead(messageId: number): Promise<void> {
    // Note: Messages are auto-marked as read when fetched
    // This is a manual endpoint if needed
    await api.post(`/messages/${messageId}/mark-read/`);
  },

  // Media operations
  async uploadMedia(chatId: number, file: File): Promise<MediaInfo> {
    const formData = new FormData();
    formData.append('chat_id', chatId.toString());
    formData.append('file', file);
    
    return await api.upload<MediaInfo>('/media/upload/', formData);
  },

  async getMediaInfo(mediaId: number): Promise<MediaInfo> {
    return await api.get<MediaInfo>(`/media/${mediaId}/info/`);
  },

  async getChatMedia(chatId: number, page = 1): Promise<PaginatedResponse<MediaInfo>> {
    return await api.get<PaginatedResponse<MediaInfo>>(`/media/chat/${chatId}/`, {
      params: { page }
    });
  },

  async getMediaDownloadUrl(mediaId: number): Promise<{ download_url: string }> {
    return await api.get<{ download_url: string }>(`/media/${mediaId}/download/`);
  }
};
