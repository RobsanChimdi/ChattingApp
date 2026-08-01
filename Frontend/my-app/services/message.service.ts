// services/message.service.ts
import { api } from './api';
import type { Message, MessageCreateData, MessageReaction } from '../types/message.types';
import { extractErrorMessage } from '@/utils/errorHandler';

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
    try {
      const formData = new FormData();
      
      // Add text data - always include text field, even if empty
      formData.append('text', data.text || '');
      if (data.chat) formData.append('chat', data.chat.toString());
      if (data.reply_to) formData.append('reply_to', data.reply_to.toString());
      // Always include message_type, default to 'text' if not provided
      formData.append('message_type', data.message_type || 'text');
      
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
      
      // Debug logging
      console.log('Sending message data:', {
        message_type: data.message_type,
        text: data.text,
        hasFiles: !!(data.files && data.files.length > 0),
        fileName: data.files?.[0]?.name,
        fileType: data.files?.[0]?.type
      });
      
      const response = await api.upload<Message>('/messages/create/', formData);
      console.log('Backend response:', response);
      return response;
    } catch (error) {
      console.error('Message send error:', error);
      throw new Error(extractErrorMessage(error));
    }
  },

  // Get message
  async getMessage(messageId: number): Promise<Message> {
    try {
      return await api.get<Message>(`/messages/${messageId}/`);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },
 async markAllAsRead(chatId: number): Promise<MarkAllReadResponse> {
    try {
      return await api.post<MarkAllReadResponse>(`/messages/mark-all-read/`, { chat_id: chatId });
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },
  // Edit message
  async editMessage(messageId: number, text: string): Promise<Message> {
    try {
      return await api.patch<Message>(`/messages/${messageId}/`, { text });
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  // Delete message (soft delete)
  async deleteMessage(messageId: number): Promise<void> {
    try {
      await api.delete(`/messages/${messageId}/`);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  // Reactions
  async addReaction(messageId: number, emoji: string): Promise<MessageReaction> {
    try {
      return await api.post<MessageReaction>(`/messages/${messageId}/reactions/`, { emoji });
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async removeReaction(messageId: number, emoji: string): Promise<void> {
    try {
      await api.delete(`/messages/${messageId}/reactions/${encodeURIComponent(emoji)}/`);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  // Forward message
  async forwardMessage(messageId: number, targetChatId: number): Promise<Message> {
    try {
      return await api.post<Message>(`/messages/${messageId}/forward/`, { target_chat_id: targetChatId });
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  // Mark as read
  async markMessageAsRead(messageId: number): Promise<void> {
    try {
      // Note: Messages are auto-marked as read when fetched
      // This is a manual endpoint if needed
      await api.post(`/messages/${messageId}/mark-read/`);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  // Media operations
  async uploadMedia(chatId: number, file: File): Promise<MediaInfo> {
    try {
      const formData = new FormData();
      formData.append('chat_id', chatId.toString());
      formData.append('file', file);
      
      return await api.upload<MediaInfo>('/media/upload/', formData);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async getMediaInfo(mediaId: number): Promise<MediaInfo> {
    try {
      return await api.get<MediaInfo>(`/media/${mediaId}/info/`);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async getChatMedia(chatId: number, page = 1): Promise<PaginatedResponse<MediaInfo>> {
    try {
      return await api.get<PaginatedResponse<MediaInfo>>(`/media/chat/${chatId}/`, {
        params: { page }
      });
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async getMediaDownloadUrl(mediaId: number): Promise<{ download_url: string }> {
    try {
      return await api.get<{ download_url: string }>(`/media/${mediaId}/download/`);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }
};
