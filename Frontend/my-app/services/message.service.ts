import { api } from './api';
import type { Message, MessageCreateData } from '../types/message.types';

export const messageService = {
  // Create message
  async createMessage(data: MessageCreateData): Promise<Message> {
    const formData = new FormData();
    
    // Add text data
    if (data.text) formData.append('text', data.text);
    if (data.chat) formData.append('chat', data.chat.toString());
    if (data.reply_to) formData.append('reply_to', data.reply_to.toString());
    if (data.message_type) formData.append('message_type', data.message_type);
    
    // Add files
    if (data.files && data.files.length > 0) {
      data.files.forEach((file) => {
        formData.append('files', file);
      });
    }
    
    return api.upload<Message>('/messages/', formData);
  },

  // Edit message
  async editMessage(messageId: string, text: string): Promise<Message> {
    return api.put<Message>(`/messages/${messageId}/edit/`, { text });
  },

  // Delete message
  async deleteMessage(messageId: string): Promise<void> {
    await api.delete(`/messages/${messageId}/delete/`);
  },

  // Reactions
  async addReaction(messageId: string, emoji: string): Promise<void> {
    await api.post(`/messages/${messageId}/react/`, { emoji });
  },

  async removeReaction(messageId: string): Promise<void> {
    await api.delete(`/messages/${messageId}/remove-reaction/`);
  },

  // Forward message
  async forwardMessage(messageId: string, chatId: string): Promise<Message> {
    return api.post<Message>(`/messages/${messageId}/forward/`, { chat_id: chatId });
  },

  // Mark as read
  async markMessageAsRead(messageId: string): Promise<void> {
    await api.post(`/messages/${messageId}/mark-read/`);
  },

  async markAllAsRead(chatId: string): Promise<{ count: number }> {
    return api.post<{ count: number }>(`/messages/mark-all-read/`, { chat_id: chatId });
  },

  // Media upload
  async uploadMedia(chatId: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('file', file);
    
    return api.upload('/media/upload/', formData);
  },

  async getMediaDownloadUrl(mediaId: string) {
    return api.get(`/media/${mediaId}/download/`);
  },
};