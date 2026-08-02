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
  addReaction: (emoji: string, messageId?: number) => Promise<void>;
  removeReaction: (emoji: string, messageId?: number) => Promise<void>;
  uploadMedia: (file: File) => Promise<unknown>;
  markAsRead: (messageId: number) => Promise<void>;
  searchInMessages: (query: string) => Message[];
  canEditMessage: (message: Message) => boolean;
  canDeleteMessage: (message: Message) => boolean;
  clearError: () => void;
}

export const useMessages = (chatId?: number): UseMessagesReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const {
    messages: storeMessages,
    selectedMessage,
    replyToMessage,
    isLoading: storeLoading,
    error: storeError,
    sendMessage: sendMessageAction,
    editMessage: editMessageAction,
    deleteMessage: deleteMessageAction,
    forwardMessage: forwardMessageAction,
    addReaction: addReactionAction,
    removeReaction: removeReactionAction,
    clearError: clearStoreError,
    setSelectedMessage,
    setReplyToMessage,
  } = useChatStore();

  const { user } = useAuthStore();

  const messages = chatId ? storeMessages.get(chatId) || [] : [];
  const error = localError || storeError;

  useEffect(() => {
    setLocalError(null);
    clearStoreError();
    setSelectedMessage(null);
    setReplyToMessage(null);
  }, [chatId, clearStoreError, setSelectedMessage, setReplyToMessage]);

  const sendMessage = useCallback(async (text: string, files?: File[]) => {
    if (!chatId) {
      setLocalError('No active chat selected');
      return null;
    }
    try {
      // Determine message type based on files
      let messageType: 'text' | 'image' | 'video' | 'audio' | 'file' = 'text';
      if (files && files.length > 0) {
        const firstFile = files[0];
        if (firstFile.type.startsWith('audio/')) {
          messageType = 'audio';
        } else if (firstFile.type.startsWith('image/')) {
          messageType = 'image';
        } else if (firstFile.type.startsWith('video/')) {
          messageType = 'video';
        } else {
          messageType = 'file';
        }
      }
      
      const messageData: MessageCreateData = {
        chat: chatId,
        text: text.trim(),
        files,
        reply_to: replyToMessage?.id,
        message_type: messageType,
      };
      const msg = await sendMessageAction(chatId, messageData);
      setReplyToMessage(null);
      return msg;
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Failed to send message');
      return null;
    }
  }, [chatId, replyToMessage, sendMessageAction, setReplyToMessage]);

  const editMessage = useCallback(async (messageId: number, text: string) => {
    if (!chatId) return setLocalError('No active chat selected');
    try {
      await editMessageAction(chatId, messageId, text);
      setSelectedMessage(null);
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Failed to edit message');
    }
  }, [chatId, editMessageAction, setSelectedMessage]);

  const deleteMessage = useCallback(async (messageId: number) => {
    if (!chatId) return setLocalError('No active chat selected');
    try {
      await deleteMessageAction(chatId, messageId);
      setSelectedMessage(null);
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Failed to delete message');
    }
  }, [chatId, deleteMessageAction]);

  const forwardMessage = useCallback(async (targetChatId: number) => {
    if (!selectedMessage) return setLocalError('No message selected');
    try {
      await forwardMessageAction(selectedMessage.id, targetChatId);
      setSelectedMessage(null);
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Failed to forward message');
    }
  }, [selectedMessage, forwardMessageAction]);

  const addReaction = useCallback(async (emoji: string, messageId?: number) => {
    const targetMessageId = messageId ?? selectedMessage?.id;
    if (!targetMessageId || !chatId || !user) return;
    try {
      const reaction = await messageService.addReaction(targetMessageId, emoji);
      addReactionAction(chatId, targetMessageId, reaction);
      setSelectedMessage(null);
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Failed to add reaction');
    }
  }, [selectedMessage, chatId, user, addReactionAction, setSelectedMessage]);

  const removeReaction = useCallback(async (emoji: string, messageId?: number) => {
    const targetMessageId = messageId ?? selectedMessage?.id;
    if (!targetMessageId || !chatId || !user) return;
    try {
      await messageService.removeReaction(targetMessageId, emoji);
      removeReactionAction(chatId, targetMessageId, user.id, emoji);
      setSelectedMessage(null);
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Failed to remove reaction');
    }
  }, [selectedMessage, chatId, user, removeReactionAction, setSelectedMessage]);

  const uploadMedia = useCallback(async (file: File) => {
    if (!chatId) {
      setLocalError('No active chat selected');
      return null;
    }
    setIsUploading(true);
    try {
      return await messageService.uploadMedia(chatId, file);
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Failed to upload media');
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
    if (currentChat?.chat_type === 'group' && currentChat.participants_info?.some((participant) => participant.id === user.id && participant.username === user.username)) return true;
    return false;
  }, [user]);

  const selectMessage = useCallback((message: Message | null) => {
    setSelectedMessage(message);
    if (message) setReplyToMessage(null);
  }, [setReplyToMessage, setSelectedMessage]);

  const setReplyTo = useCallback((message: Message | null) => {
    setReplyToMessage(message);
    if (message) setSelectedMessage(null);
  }, [setReplyToMessage, setSelectedMessage]);

  const clearSelection = useCallback(() => {
    setSelectedMessage(null);
    setReplyToMessage(null);
  }, [setReplyToMessage, setSelectedMessage]);

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