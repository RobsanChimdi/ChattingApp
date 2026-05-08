// hooks/useMessages.ts
import { useState, useCallback, useEffect } from 'react';
import { useChatStore } from '@/store/chatStore'; // FIXED: changed from chatStore
import { useAuthStore } from '@/store/authStore'; // FIXED: changed from authStore
import { messageService } from '@/services/message.service';
import type { Message, MessageReaction, MessageCreateData } from '@/types';

interface UseMessagesReturn {
  messages: Message[];
  selectedMessage: Message | null;
  replyToMessage: Message | null;
  isLoading: boolean;
  error: string | null;
  sendMessage: (text: string, files?: File[]) => Promise<Message | null>;
  editMessage: (messageId: number, text: string) => Promise<void>;
  deleteMessage: (messageId: number) => Promise<void>;
  forwardMessage: (targetChatId: number) => Promise<void>;
  selectMessage: (message: Message | null) => void;
  setReplyTo: (message: Message | null) => void;
  clearSelection: () => void;
  addReaction: (emoji: string) => Promise<void>;
  removeReaction: (emoji: string) => Promise<void>;
  uploadMedia: (file: File) => Promise<any>;
  markAsRead: (messageId: number) => Promise<void>;
  searchInMessages: (query: string) => Message[];
  canEditMessage: (message: Message) => boolean;
  canDeleteMessage: (message: Message) => boolean;
  clearError: () => void;
}

export const useMessages = (chatId?: number): UseMessagesReturn => {
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const {
    messages: storeMessages,
    isLoading: storeLoading,
    error: storeError,
    sendMessage: sendMessageAction,
    editMessage: editMessageAction,
    deleteMessage: deleteMessageAction,
    forwardMessage: forwardMessageAction,
    addReaction: addReactionAction,
    removeReaction: removeReactionAction,
    clearError: clearStoreError,
  } = useChatStore();

  const { user } = useAuthStore();

  const messages = chatId ? storeMessages.get(chatId) || [] : [];
  const error = localError || storeError;

  useEffect(() => {
    setLocalError(null);
    clearStoreError();
  }, [chatId, clearStoreError]);

  const sendMessage = useCallback(async (text: string, files?: File[]) => {
    if (!chatId) {
      setLocalError('No active chat selected');
      return null;
    }
    try {
      const messageData: MessageCreateData = {
        chat: chatId,
        text: text.trim(),
        files,
        reply_to: replyToMessage?.id,
      };
      const msg = await sendMessageAction(chatId, messageData);
      setReplyToMessage(null);
      return msg;
    } catch (err: any) {
      setLocalError(err.message || 'Failed to send message');
      return null;
    }
  }, [chatId, replyToMessage, sendMessageAction]);

  const editMessage = useCallback(async (messageId: number, text: string) => {
    if (!chatId) return setLocalError('No active chat selected');
    try {
      await editMessageAction(chatId, messageId, text);
      setSelectedMessage(null);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to edit message');
    }
  }, [chatId, editMessageAction]);

  const deleteMessage = useCallback(async (messageId: number) => {
    if (!chatId) return setLocalError('No active chat selected');
    try {
      await deleteMessageAction(chatId, messageId);
      setSelectedMessage(null);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to delete message');
    }
  }, [chatId, deleteMessageAction]);

  const forwardMessage = useCallback(async (targetChatId: number) => {
    if (!selectedMessage) return setLocalError('No message selected');
    try {
      await forwardMessageAction(selectedMessage.id, targetChatId);
      setSelectedMessage(null);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to forward message');
    }
  }, [selectedMessage, forwardMessageAction]);

  const addReaction = useCallback(async (emoji: string) => {
    if (!selectedMessage || !chatId || !user) return;
    try {
      await messageService.addReaction(selectedMessage.id, emoji);
      setSelectedMessage(null);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to add reaction');
    }
  }, [selectedMessage, chatId, user]);

  const removeReaction = useCallback(async (emoji: string) => {
    if (!selectedMessage || !chatId || !user) return;
    try {
      await messageService.removeReaction(selectedMessage.id, emoji);
      setSelectedMessage(null);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to remove reaction');
    }
  }, [selectedMessage, chatId, user]);

  const uploadMedia = useCallback(async (file: File) => {
    if (!chatId) {
      setLocalError('No active chat selected');
      return null;
    }
    setIsUploading(true);
    try {
      return await messageService.uploadMedia(chatId, file);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to upload media');
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [chatId]);

  const markAsRead = useCallback(async (messageId: number) => {
    try {
      await messageService.markMessageAsRead(messageId);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const searchInMessages = useCallback((query: string): Message[] => {
    if (!query.trim()) return [];
    const searchTerm = query.toLowerCase();
    return messages.filter(m => !m.is_deleted && m.text?.toLowerCase().includes(searchTerm));
  }, [messages]);

  const canEditMessage = useCallback((message: Message) => {
    if (!user || message.is_deleted || message.sender !== user.id) return false;
    const fifteenMinutes = 15 * 60 * 1000;
    return Date.now() - new Date(message.created_at).getTime() <= fifteenMinutes;
  }, [user]);

  const canDeleteMessage = useCallback((message: Message) => {
    const currentChat = useChatStore.getState().currentChat;
    if (!user || message.is_deleted) return false;
    if (message.sender === user.id) return true;
    if (currentChat?.chat_type === 'group' && currentChat.admin?.id === user.id) return true;
    return false;
  }, [user]);

  const selectMessage = useCallback((message: Message | null) => {
    setSelectedMessage(message);
    if (message) setReplyToMessage(null);
  }, []);

  const setReplyTo = useCallback((message: Message | null) => {
    setReplyToMessage(message);
    if (message) setSelectedMessage(null);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedMessage(null);
    setReplyToMessage(null);
  }, []);

  const clearError = useCallback(() => {
    setLocalError(null);
    clearStoreError();
  }, [clearStoreError]);

  return {
    messages,
    selectedMessage,
    replyToMessage,
    isLoading: storeLoading || isUploading,
    error,
    sendMessage,
    editMessage,
    deleteMessage,
    forwardMessage,
    selectMessage,
    setReplyTo,
    clearSelection,
    addReaction,
    removeReaction,
    uploadMedia,
    markAsRead,
    searchInMessages,
    canEditMessage,
    canDeleteMessage,
    clearError,
  };
};