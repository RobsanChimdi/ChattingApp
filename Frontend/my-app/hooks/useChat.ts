// hooks/useChat.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation'; 
import { useChatStore } from '@/store/chatStore'; 
import { useAuth } from './useAuth';
import { useSocket } from './useSocket';
import { messageService } from '@/services/message.service';
import type { Chat, Message, MessageCreateData, ChatListItem } from '@/types';

interface UseChatReturn {
  chats: ChatListItem[];
  currentChat: ChatListItem | null;
  messages: Message[];
  unreadCount: number;
  typingUsers: Set<number>;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  hasMoreMessages: boolean;
  fetchChats: () => Promise<ChatListItem[]>;
  setCurrentChat: (chat: ChatListItem | null) => void;
  createPrivateChat: (participantId: number) => Promise<Chat>;
  leaveChat: (chatId: number) => Promise<void>;
  searchChats: (query: string) => ChatListItem[];
  sendMessage: (data: MessageCreateData) => Promise<Message | null>;
  editMessage: (messageId: number, text: string) => Promise<void>;
  deleteMessage: (messageId: number) => Promise<void>;
  forwardMessage: (messageId: number, targetChatId: number) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  addReaction: (messageId: number, emoji: string) => Promise<void>;
  removeReaction: (messageId: number) => Promise<void>;
  startTyping: () => void;
  stopTyping: () => void;
  markAsRead: (messageId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  searchMessages: (query: string) => Promise<Message[]>;
  clearError: () => void;
}

export const useChat = (chatId?: number): UseChatReturn => {
  const params = useParams();
  const { user } = useAuth();
  const { emit, on } = useSocket();

  const activeChatId = chatId || (params.chatId ? Number(params.chatId) : undefined);

  const {
    chats,
    currentChat,
    messages: storeMessages,
    unreadCounts,
    typingUsers: storeTypingUsers,
    isLoading,
    isSending,
    error,
    fetchChats: fetchChatsAction,
    setCurrentChat: setCurrentChatAction,
    createPrivateChat: createPrivateChatAction,
    leaveChat: leaveChatAction,
    fetchMessages: fetchMessagesAction,
    sendMessage: sendMessageAction,
    editMessage: editMessageAction,
    deleteMessage: deleteMessageAction,
    forwardMessage: forwardMessageAction,
    addReaction: addReactionAction,
    removeReaction: removeReactionAction,
    markAllAsRead: markAllAsReadAction,
    searchMessages: searchMessagesAction,
    setError,
    clearError: clearErrorAction,
  } = useChatStore();

  const [page, setPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const messages = activeChatId ? storeMessages.get(activeChatId) || [] : [];
  const unreadCount = activeChatId ? unreadCounts.get(activeChatId) || 0 : 0;
  const typingUsers: Set<number> = activeChatId 
    ? (storeTypingUsers.get(activeChatId) || new Set<number>()) 
    : new Set<number>();

  useEffect(() => {
    if (user) fetchChatsAction().catch(console.error);
  }, [user, fetchChatsAction]);

  useEffect(() => {
    if (activeChatId) {
      const chat = chats.find(c => c.id === activeChatId);
      setCurrentChatAction(chat || null);
      if (chat && !storeMessages.get(activeChatId)) {
        fetchMessagesAction(activeChatId).catch(console.error);
      }
    } else {
      setCurrentChatAction(null);
    }
  }, [activeChatId, chats, setCurrentChatAction, fetchMessagesAction, storeMessages]);

  useEffect(() => {
    if (!activeChatId) return;

    const unsubscribeNewMessage = on('new_message', (data: { message: Message }) => {
      if (data.message.chat === activeChatId && data.message.sender !== user?.id) {
        messageService.markMessageAsRead(data.message.id).catch(console.error);
      }
    });

    const unsubscribeTyping = on('user_typing', (data: { chat_id: number; user_id: number }) => {
      if (data.chat_id === activeChatId && data.user_id !== user?.id) {
        useChatStore.getState().setTypingUser(activeChatId, data.user_id);
        setTimeout(() => {
          useChatStore.getState().clearTypingUser(activeChatId, data.user_id);
        }, 3000);
      }
    });

    const unsubscribeStoppedTyping = on('user_stopped_typing', (data: { chat_id: number; user_id: number }) => {
      if (data.chat_id === activeChatId) {
        useChatStore.getState().clearTypingUser(activeChatId, data.user_id);
      }
    });

    emit('join_chat', { chat_id: activeChatId });

    return () => {
      emit('leave_chat', { chat_id: activeChatId });
      unsubscribeNewMessage();
      unsubscribeTyping();
      unsubscribeStoppedTyping();
    };
  }, [activeChatId, user?.id, emit, on]);

  const stopTyping = useCallback(() => {
    if (!activeChatId || !isTyping) return;
    setIsTyping(false);
    emit('typing_end', { chat_id: activeChatId });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  }, [activeChatId, isTyping, emit]);

  const startTyping = useCallback(() => {
    if (!activeChatId || isTyping) return;
    setIsTyping(true);
    emit('typing_start', { chat_id: activeChatId });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => stopTyping(), 3000);
  }, [activeChatId, isTyping, emit, stopTyping]);

  const fetchChats = useCallback(async (): Promise<ChatListItem[]> => {
    try {
      await fetchChatsAction();
      return useChatStore.getState().chats;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch chats');
      throw err;
    }
  }, [fetchChatsAction, setError]);

  const setCurrentChat = useCallback((chat: ChatListItem | null) => {
    setCurrentChatAction(chat);
    setPage(1);
    setHasMoreMessages(true);
  }, [setCurrentChatAction]);

  const sendMessage = useCallback(async (data: MessageCreateData) => {
    if (!activeChatId) {
      setError('No active chat selected');
      return null;
    }
    try {
      stopTyping();
      return await sendMessageAction(activeChatId, data);
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      return null;
    }
  }, [activeChatId, sendMessageAction, setError, stopTyping]);

  const editMessage = useCallback(async (messageId: number, text: string) => {
    if (!activeChatId) {
      setError('No active chat selected');
      return;
    }
    try {
      await editMessageAction(activeChatId, messageId, text);
    } catch (err: any) {
      setError(err.message || 'Failed to edit message');
    }
  }, [activeChatId, editMessageAction, setError]);

  const deleteMessage = useCallback(async (messageId: number) => {
    if (!activeChatId) {
      setError('No active chat selected');
      return;
    }
    try {
      await deleteMessageAction(activeChatId, messageId);
    } catch (err: any) {
      setError(err.message || 'Failed to delete message');
    }
  }, [activeChatId, deleteMessageAction, setError]);

  const forwardMessage = useCallback(async (messageId: number, targetChatId: number) => {
    try {
      await forwardMessageAction(messageId, targetChatId);
    } catch (err: any) {
      setError(err.message || 'Failed to forward message');
    }
  }, [forwardMessageAction, setError]);

  const loadMoreMessages = useCallback(async () => {
    if (!activeChatId || !hasMoreMessages || isLoading) return;
    const nextPage = page + 1;
    try {
      const currentCount = messages.length;
      await fetchMessagesAction(activeChatId, nextPage);
      const newMessages = storeMessages.get(activeChatId) || [];
      if (newMessages.length === currentCount) setHasMoreMessages(false);
      else setPage(nextPage);
    } catch {
      setError('Failed to load more messages');
    }
  }, [activeChatId, page, hasMoreMessages, isLoading, messages.length, fetchMessagesAction, storeMessages, setError]);

  const markAsRead = useCallback(async (messageId: number) => {
    try {
      await messageService.markMessageAsRead(messageId);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!activeChatId) return;
    try {
      await markAllAsReadAction(activeChatId);
    } catch (err: any) {
      setError(err.message || 'Failed to mark all as read');
    }
  }, [activeChatId, markAllAsReadAction, setError]);

  const addReaction = useCallback(async (messageId: number, emoji: string) => {
    if (!activeChatId) return;
    try { 
      await messageService.addReaction(messageId, emoji); 
    } catch (err: any) { 
      setError(err.message || 'Failed to add reaction'); 
    }
  }, [activeChatId, setError]);

  const removeReaction = useCallback(async (messageId: number) => {
    if (!activeChatId) return;
    try { 
      await messageService.removeReaction(messageId, ''); 
    } catch (err: any) { 
      setError(err.message || 'Failed to remove reaction'); 
    }
  }, [activeChatId, setError]);

  const searchChats = useCallback((query: string): ChatListItem[] => {
    if (!query.trim()) return chats;
    const searchTerm = query.toLowerCase();
    return chats.filter(chat => {
      if (chat.chat_type === 'private') {
        const participants = (chat as any).participants_info || [];
        const other = participants.find((p: any) => p.id !== user?.id);
        return other?.username?.toLowerCase().includes(searchTerm) ||
               other?.first_name?.toLowerCase().includes(searchTerm) ||
               other?.last_name?.toLowerCase().includes(searchTerm);
      }
      return chat.name?.toLowerCase().includes(searchTerm);
    });
  }, [chats, user?.id]);

  const clearError = useCallback(() => clearErrorAction(), [clearErrorAction]);

  return {
    chats,
    currentChat,
    messages,
    unreadCount,
    typingUsers,
    isLoading,
    isSending,
    error,
    hasMoreMessages,
    fetchChats,
    setCurrentChat,
    createPrivateChat: createPrivateChatAction,
    leaveChat: leaveChatAction,
    searchChats,
    sendMessage,
    editMessage,
    deleteMessage,
    forwardMessage,
    loadMoreMessages,
    addReaction,
    removeReaction,
    startTyping,
    stopTyping,
    markAsRead,
    markAllAsRead,
    searchMessages: searchMessagesAction,
    clearError,
  };
};