// store/chat.store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Message, MessageReaction, MessageStatus } from '../types/message.types';
import type { Chat, ChatListItem } from '../types/chat.types';
import type { User } from '../types/user.types';
import { chatService } from '../services/chat.service';
import { messageService } from '../services/message.service';
import { useAuthStore } from './authStore'; 
interface ChatStore {
  // State
  chats: ChatListItem[];
  currentChat: ChatListItem | null; 
  messages: Map<number, Message[]>; 
  unreadCounts: Map<number, number>;
  typingUsers: Map<number, Set<number>>; // chatId -> userIds
  onlineUsers: Map<number, { is_online: boolean; last_seen?: string }>;
  selectedMessage: Message | null;
  replyToMessage: Message | null;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  
  // Actions
  // Chats
  fetchChats: () => Promise<void>;
  setChats: (chats: ChatListItem[]) => void;
  setCurrentChat: (chat: ChatListItem | null) => void; // FIXED: changed to ChatListItem
  addChat: (chat: ChatListItem) => void;
  updateChat: (chat: ChatListItem) => void;
  createPrivateChat: (participantId: number) => Promise<Chat>;
  leaveChat: (chatId: number) => Promise<void>;
  
  // Messages
  fetchMessages: (chatId: number, page?: number) => Promise<void>;
  sendMessage: (chatId: number, data: {
    text?: string;
    files?: File[];
    reply_to?: number;
  }) => Promise<Message | null>;
  editMessage: (chatId: number, messageId: number, text: string) => Promise<void>;
  deleteMessage: (chatId: number, messageId: number) => Promise<void>;
  forwardMessage: (messageId: number, targetChatId: number) => Promise<void>;
  addMessage: (chatId: number, message: Message) => void;
  updateMessage: (chatId: number, message: Message) => void;
  deleteMessageLocal: (chatId: number, messageId: number) => void;
  
  // Reactions
  addReaction: (chatId: number, messageId: number, reaction: MessageReaction) => void;
  removeReaction: (chatId: number, messageId: number, userId: number, emoji?: string) => void;
  
  // Message status
  updateMessageStatus: (
    chatId: number,
    messageId: number,
    status: 'delivered' | 'read',
    userId: number
  ) => void;
  markAllAsRead: (chatId: number) => Promise<void>;
  
  // Unread counts
  fetchUnreadCounts: () => Promise<void>;
  setUnreadCount: (chatId: number, count: number) => void;
  incrementUnreadCount: (chatId: number) => void;
  resetUnreadCount: (chatId: number) => void;
  
  // Participants
  addParticipant: (chatId: number, user: User) => void;
  removeParticipant: (chatId: number, userId: number) => void;
  
  // Typing indicators
  setTypingUser: (chatId: number, userId: number) => void;
  clearTypingUser: (chatId: number, userId: number) => void;
  
  // User status
  updateUserStatus: (userId: number, is_online: boolean, last_seen?: string) => void;
  
  // Search
  searchMessages: (query: string, chatId?: number) => Promise<Message[]>;
  
  // UI State
  setLoading: (loading: boolean) => void;
  setSending: (sending: boolean) => void;
  setSelectedMessage: (message: Message | null) => void;
  setReplyToMessage: (message: Message | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Helper getters
  getChatById: (chatId: number) => ChatListItem | undefined;
  getUnreadTotal: () => number;
  hasUnreadMessages: (chatId: number) => boolean;
}

export const useChatStore = create<ChatStore>()(
  devtools(
    (set, get) => ({
      // ========== INITIAL STATE ==========
      chats: [],
      currentChat: null,
      messages: new Map(),
      unreadCounts: new Map(),
      typingUsers: new Map(),
      onlineUsers: new Map(),
      selectedMessage: null,
      replyToMessage: null,
      isLoading: false,
      isSending: false,
      error: null,
      
      // ========== CHAT ACTIONS ==========
      fetchChats: async () => {
        const state = get();
        if (state.isLoading) return;
        
        set({ isLoading: true, error: null });
        
        try {
          const response = await chatService.getChats();
          set({ chats: response.results, isLoading: false });
          await get().fetchUnreadCounts();
        } catch (error: any) {
          set({
            error: error.response?.data?.error || 'Failed to fetch chats',
            isLoading: false,
          });
          throw error;
        }
      },
      
      setChats: (chats) => set({ chats }),
      
      setCurrentChat: (chat) => {
        set({ currentChat: chat });
        if (chat) {
          get().resetUnreadCount(Number(chat.id));
        }
      },
      
      addChat: (chat) => {
        set((state) => ({
          chats: [chat, ...state.chats],
        }));
      },
      
      updateChat: (chat) => {
        set((state) => ({
          chats: state.chats.map((c) =>
            c.id === chat.id ? { ...c, ...chat } : c
          ),
        }));
      },
      
      createPrivateChat: async (participantId) => {
        set({ isLoading: true, error: null });
        
        try {
          const chat = await chatService.createPrivateChat(participantId);
          
          const chatListItem: ChatListItem = {
            id: chat.id,
            name: chat.display_name,
            display_name: chat.display_name,
            image: chat.image,
            display_image: chat.display_image,
            chat_type: chat.chat_type,
            description: chat.description,
            unread_count: 0,
            updated_at: chat.updated_at,
          };
          
          set((state) => {
            const exists = state.chats.some((c) => c.id === chat.id);
            return {
              chats: exists ? state.chats : [chatListItem, ...state.chats],
              isLoading: false,
            };
          });
          
          return chat;
        } catch (error: any) {
          set({
            error: error.response?.data?.error || 'Failed to create chat',
            isLoading: false,
          });
          throw error;
        }
      },
      
      leaveChat: async (chatId) => {
        set({ isLoading: true, error: null });
        
        try {
          await chatService.leaveChat(chatId);
          
          set((state) => ({
            chats: state.chats.filter((c) => c.id !== chatId),
            isLoading: false,
          }));
          
          const messages = new Map(get().messages);
          messages.delete(chatId);
          set({ messages });
        } catch (error: any) {
          set({
            error: error.response?.data?.error || 'Failed to leave chat',
            isLoading: false,
          });
          throw error;
        }
      },
      
      // ========== MESSAGE ACTIONS ==========
      fetchMessages: async (chatId, page = 1) => {
        const startTime = performance.now();
        set({ isLoading: true, error: null });

        try {
          const response = await chatService.getMessages(chatId, page);
          const currentMessages = get().messages.get(chatId) || [];

          // Deduplicate messages by ID
          const messageMap = new Map<number, Message>();
          [...currentMessages, ...response.results].forEach(msg => {
            messageMap.set(msg.id, msg);
          });
          const uniqueMessages = Array.from(messageMap.values());

          // Sort messages by created_at in ascending order (oldest first)
          uniqueMessages.sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );

          set((state) => ({
            messages: new Map(state.messages).set(
              chatId,
              uniqueMessages
            ),
            isLoading: false,
          }));

          const elapsed = performance.now() - startTime;
          console.log(`DEBUG: fetchMessages for chat ${chatId} took ${elapsed.toFixed(2)}ms`);
        } catch (error: any) {
          set({
            error: error.response?.data?.error || 'Failed to fetch messages',
            isLoading: false,
          });
          throw error;
        }
      },
      
      sendMessage: async (chatId, data) => {
        set({ isSending: true, error: null });
        
        try {
          const message = await messageService.sendMessage({
            chat: chatId,
            ...data,
          });
          
          // Add message immediately for current user
          get().addMessage(chatId, message);
          set({ isSending: false });
          return message;
        } catch (error: any) {
          set({
            error: error.response?.data?.error || 'Failed to send message',
            isSending: false,
          });
          return null;
        }
      },
      
      editMessage: async (chatId, messageId, text) => {
        set({ isLoading: true, error: null });
        
        try {
          const message = await messageService.editMessage(messageId, text);
          get().updateMessage(chatId, message);
          set({ isLoading: false });
        } catch (error: any) {
          set({
            error: error.response?.data?.error || 'Failed to edit message',
            isLoading: false,
          });
          throw error;
        }
      },
      
      deleteMessage: async (chatId, messageId) => {
        set({ isLoading: true, error: null });
        
        try {
          await messageService.deleteMessage(messageId);
          get().deleteMessageLocal(chatId, messageId);
          set({ isLoading: false });
        } catch (error: any) {
          set({
            error: error.response?.data?.error || 'Failed to delete message',
            isLoading: false,
          });
          throw error;
        }
      },
      
      forwardMessage: async (messageId, targetChatId) => {
        set({ isLoading: true, error: null });
        
        try {
          const message = await messageService.forwardMessage(messageId, targetChatId);
          get().addMessage(targetChatId, message);
          set({ isLoading: false });
        } catch (error: any) {
          set({
            error: error.response?.data?.error || 'Failed to forward message',
            isLoading: false,
          });
          throw error;
        }
      },
      
      addMessage: (chatId, message) => {
        set((state) => {
          const chatMessages = state.messages.get(chatId) || [];
          // Check if message already exists to prevent duplicates
          if (chatMessages.some(msg => msg.id === message.id)) {
            console.log('Duplicate message prevented:', message.id);
            return state;
          }
          console.log('Adding message to chat:', chatId, message.id);
          // Add message and sort by created_at
          const updatedMessages = [...chatMessages, message].sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          return {
            messages: new Map(state.messages).set(
              chatId,
              updatedMessages
            ),
          };
        });
      },
      
      updateMessage: (chatId, message) => {
        set((state) => {
          const chatMessages = state.messages.get(chatId);
          if (!chatMessages) return state;
          
          return {
            messages: new Map(state.messages).set(
              chatId,
              chatMessages.map((msg) =>
                msg.id === message.id ? { ...msg, ...message } : msg
              ),
            ),
          };
        });
      },
      
      deleteMessageLocal: (chatId, messageId) => {
        set((state) => {
          const chatMessages = state.messages.get(chatId);
          if (!chatMessages) return state;
          
          return {
            messages: new Map(state.messages).set(
              chatId,
              chatMessages.map((msg) =>
                msg.id === messageId ? { ...msg, is_deleted: true } : msg
              ),
            ),
          };
        });
      },
      
      // ========== REACTION ACTIONS ==========
      addReaction: (chatId, messageId, reaction) => {
        set((state) => {
          const chatMessages = state.messages.get(chatId);
          if (!chatMessages) return state;
          
          return {
            messages: new Map(state.messages).set(
              chatId,
              chatMessages.map((msg) => {
                if (msg.id === messageId) {
                  const existingReactions = msg.reactions || [];
                  const existingUserReactionIndex = existingReactions.findIndex(
                    (r) => r.user === reaction.user
                  );
                  
                  if (existingUserReactionIndex >= 0) {
                    const updatedReactions = [...existingReactions];
                    updatedReactions[existingUserReactionIndex] = reaction;
                    return { ...msg, reactions: updatedReactions };
                  }
                  return { ...msg, reactions: [...existingReactions, reaction] };
                }
                return msg;
              }),
            ),
          };
        });
      },
      
      removeReaction: (chatId, messageId, userId, emoji?: string) => {
        set((state) => {
          const chatMessages = state.messages.get(chatId);
          if (!chatMessages) return state;
          
          return {
            messages: new Map(state.messages).set(
              chatId,
              chatMessages.map((msg) => {
                if (msg.id === messageId) {
                  const reactions = msg.reactions || [];
                  const nextReactions = reactions.filter((r) => {
                    if (r.user !== userId) return true;
                    if (!emoji) return false;
                    return r.emoji !== emoji;
                  });
                  return { ...msg, reactions: nextReactions };
                }
                return msg;
              }),
            ),
          };
        });
      },
      
      // ========== MESSAGE STATUS ACTIONS ==========
      updateMessageStatus: (chatId, messageId, status, userId) => {
        set((state) => {
          const chatMessages = state.messages.get(chatId);
          if (!chatMessages) return state;
          
          return {
            messages: new Map(state.messages).set(
              chatId,
              chatMessages.map((msg) => {
                if (msg.id === messageId) {
                  const existingStatuses = msg.statuses || [];
                  const existingIndex = existingStatuses.findIndex((s) => s.user === userId);
                  
                  let updatedStatuses;
                  if (existingIndex >= 0) {
                    updatedStatuses = [...existingStatuses];
                    updatedStatuses[existingIndex] = {
                      ...updatedStatuses[existingIndex],
                      status,
                      ...(status === 'delivered' ? { delivered_at: new Date().toISOString() } : {}),
                      ...(status === 'read' ? { read_at: new Date().toISOString() } : {}),
                      updated_at: new Date().toISOString(),
                    };
                  } else {
                    const newStatus: MessageStatus = {
                      id: Date.now(),
                      message: messageId,
                      user: userId,
                      status,
                      updated_at: new Date().toISOString(),
                    };
                    updatedStatuses = [...existingStatuses, newStatus];
                  }
                  
                  return { ...msg, statuses: updatedStatuses };
                }
                return msg;
              }),
            ),
          };
        });
      },
      
      markAllAsRead: async (chatId) => {
        try {
          await chatService.markAllAsRead(chatId);
          get().resetUnreadCount(chatId);
          
          const currentUser = useAuthStore.getState().user;
          if (currentUser) {
            const chatMessages = get().messages.get(chatId) || [];
            chatMessages.forEach((message) => {
              if (message.sender !== currentUser.id) {
                get().updateMessageStatus(chatId, message.id, 'read', currentUser.id);
              }
            });
          }
        } catch (error) {
          console.error('Failed to mark all as read:', error);
        }
      },
      
      // ========== UNREAD COUNTS ==========
      fetchUnreadCounts: async () => {
        try {
          const counts = await chatService.getUnreadCounts();
          
          set((state) => {
            const newCounts = new Map(state.unreadCounts);
            Object.entries(counts).forEach(([chatId, count]) => {
              newCounts.set(parseInt(chatId), count);
            });
            return { unreadCounts: newCounts };
          });
        } catch (error) {
          // Silently fail on unread counts to avoid spamming errors
        }
      },
      
      setUnreadCount: (chatId, count) => {
        set((state) => ({
          unreadCounts: new Map(state.unreadCounts).set(chatId, count),
        }));
      },
      
      incrementUnreadCount: (chatId) => {
        set((state) => {
          const currentCount = state.unreadCounts.get(chatId) || 0;
          return {
            unreadCounts: new Map(state.unreadCounts).set(chatId, currentCount + 1),
          };
        });
      },
      
      resetUnreadCount: (chatId) => {
        set((state) => ({
          unreadCounts: new Map(state.unreadCounts).set(chatId, 0),
        }));
      },
      
      // ========== PARTICIPANT ACTIONS ==========
      addParticipant: (chatId, user) => {
        set((state) => ({
          chats: state.chats.map((chat) => {
            if (chat.id === chatId) {
              const participants = (chat as any).participants_info || [];
              return { ...chat, participants_info: [...participants, user] };
            }
            return chat;
          }),
        }));
      },
      
      removeParticipant: (chatId, userId) => {
        set((state) => ({
          chats: state.chats.map((chat) => {
            if (chat.id === chatId) {
              const participants = (chat as any).participants_info || [];
              return {
                ...chat,
                participants_info: participants.filter((p: any) => p.id !== userId),
              };
            }
            return chat;
          }),
        }));
      },
      
      // ========== TYPING INDICATORS ==========
      setTypingUser: (chatId, userId) => {
        set((state) => {
          const typingSet = state.typingUsers.get(chatId) || new Set();
          typingSet.add(userId);
          
          setTimeout(() => {
            get().clearTypingUser(chatId, userId);
          }, 3000);
          
          return {
            typingUsers: new Map(state.typingUsers).set(chatId, typingSet),
          };
        });
      },
      
      clearTypingUser: (chatId, userId) => {
        set((state) => {
          const typingSet = state.typingUsers.get(chatId);
          if (!typingSet) return state;
          
          typingSet.delete(userId);
          return {
            typingUsers: new Map(state.typingUsers).set(chatId, typingSet),
          };
        });
      },
      
      // ========== USER STATUS ==========
      updateUserStatus: (userId, is_online, last_seen) => {
        set((state) => ({
          onlineUsers: new Map(state.onlineUsers).set(userId, { is_online, last_seen }),
        }));
      },
      
      // ========== SEARCH ==========
      searchMessages: async (query, chatId) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await chatService.searchMessages(query, chatId);
          set({ isLoading: false });
          return response.results || [];
        } catch (error: any) {
          set({
            error: error.response?.data?.error || 'Search failed',
            isLoading: false,
          });
          return [];
        }
      },
      
      // ========== UI STATE ==========
      setLoading: (loading) => set({ isLoading: loading }),
      setSending: (sending) => set({ isSending: sending }),
      setSelectedMessage: (message) => set({ selectedMessage: message }),
      setReplyToMessage: (message) => set({ replyToMessage: message }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
      
      // ========== HELPER GETTERS ==========
      getChatById: (chatId) => {
        return get().chats.find(chat => chat.id === chatId);
      },
      
      getUnreadTotal: () => {
        let total = 0;
        get().unreadCounts.forEach((count) => {
          total += count;
        });
        return total;
      },
      
      hasUnreadMessages: (chatId) => {
        return (get().unreadCounts.get(chatId) || 0) > 0;
      },
    }),
    { name: 'chat-store' }
  )
);

// ========== SELECTORS ==========
export const useChats = () => useChatStore((state) => state.chats);
export const useCurrentChat = () => useChatStore((state) => state.currentChat);
export const useChatMessages = (chatId: number) =>
  useChatStore((state) => state.messages.get(chatId) || []);
export const useUnreadCount = (chatId: number) =>
  useChatStore((state) => state.unreadCounts.get(chatId) || 0);
export const useTypingUsers = (chatId: number) =>
  useChatStore((state) => state.typingUsers.get(chatId) || new Set());
export const useUserStatus = (userId: number) =>
  useChatStore((state) => state.onlineUsers.get(userId) || { is_online: false });
export const useChatLoading = () => useChatStore((state) => state.isLoading);
export const useChatError = () => useChatStore((state) => state.error);
export const useUnreadTotal = () => useChatStore((state) => state.getUnreadTotal());