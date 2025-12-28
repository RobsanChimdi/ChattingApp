import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Message, MessageReaction, MessageStatus } from '../types/message.types';
import type { Chat } from '../types/chat.types';
import type { User } from '../types/user.types';
import { chatService} from '../services/chat.service';
import { messageService } from '../services/message.service';

interface ChatStore {
  // State
  chats: Chat[];
  currentChat: Chat | null;
  messages: Map<string, Message[]>; // chatId -> messages
  unreadCounts: Map<string, number>;
  typingUsers: Map<string, Set<number>>; // chatId -> userIds
  onlineUsers: Map<number, { is_online: boolean; last_seen?: string }>;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  
  // Actions
  // Chats
  fetchChats: () => Promise<void>;
  setChats: (chats: Chat[]) => void;
  setCurrentChat: (chat: Chat | null) => void;
  addChat: (chat: Chat) => void;
  updateChat: (chat: Chat) => void;
  createPrivateChat: (participantId: number) => Promise<Chat>;
  leaveChat: (chatId: string) => Promise<void>;
  
  // Messages
  fetchMessages: (chatId: string, page?: number) => Promise<void>;
  sendMessage: (chatId: string, data: {
    text?: string;
    files?: File[];
    reply_to?: string;
  }) => Promise<Message | null>;
  editMessage: (chatId: string, messageId: string, text: string) => Promise<void>;
  deleteMessage: (chatId: string, messageId: string) => Promise<void>;
  forwardMessage: (messageId: string, targetChatId: string) => Promise<void>;
  addMessage: (chatId: string, message: Message) => void;
  updateMessage: (chatId: string, message: Message) => void;
  deleteMessageLocal: (chatId: string, messageId: string) => void;
  
  // Reactions
  addReaction: (
    chatId: string, 
    messageId: string, 
    reaction: MessageReaction
  ) => void;
  removeReaction: (chatId: string, messageId: string, userId: number) => void;
  
  // Message status
  updateMessageStatus: (
    chatId: string,
    messageId: string,
    status: 'delivered' | 'read',
    userId: number
  ) => void;
  markAllAsRead: (chatId: string) => Promise<void>;
  
  // Unread counts
  fetchUnreadCounts: () => Promise<void>;
  setUnreadCount: (chatId: string, count: number) => void;
  incrementUnreadCount: (chatId: string) => void;
  resetUnreadCount: (chatId: string) => void;
  
  // Participants
  addParticipant: (chatId: string, user: User) => void;
  removeParticipant: (chatId: string, userId: number) => void;
  
  // Typing indicators
  setTypingUser: (chatId: string, userId: number) => void;
  clearTypingUser: (chatId: string, userId: number) => void;
  
  // User status
  updateUserStatus: (
    userId: number,
    is_online: boolean,
    last_seen?: string
  ) => void;
  
  // Search
  searchMessages: (query: string, chatId?: string) => Promise<Message[]>;
  
  // UI State
  setLoading: (loading: boolean) => void;
  setSending: (sending: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useChatStore = create<ChatStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      chats: [],
      currentChat: null,
      messages: new Map(),
      unreadCounts: new Map(),
      typingUsers: new Map(),
      onlineUsers: new Map(),
      isLoading: false,
      isSending: false,
      error: null,
      
      // Chat actions
      fetchChats: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await chatService.getChats();
          set({ chats: response.results, isLoading: false });
          
          // Also fetch unread counts
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
        
        // Reset unread count for this chat
        if (chat) {
          get().resetUnreadCount(chat.id);
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
          
          // Add to chats list if not already present
          set((state) => {
            const exists = state.chats.some((c) => c.id === chat.id);
            return {
              chats: exists ? state.chats : [chat, ...state.chats],
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
          
          // Clear messages for this chat
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
      
      // Message actions
      fetchMessages: async (chatId, page = 1) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await chatService.getMessages(chatId, page);
          const currentMessages = get().messages.get(chatId) || [];
          
          set((state) => ({
            messages: new Map(state.messages).set(
              chatId,
              [...currentMessages, ...response.results]
            ),
            isLoading: false,
          }));
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
          const message = await messageService.createMessage({
            chat: chatId,
            ...data,
          });
          
          // Optimistically add to store
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
          return {
            messages: new Map(state.messages).set(
              chatId,
              [message, ...chatMessages]
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
      
      // Reaction actions
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
                  return {
                    ...msg,
                    reactions: [...existingReactions, reaction],
                  };
                }
                return msg;
              }),
            ),
          };
        });
      },
      
      removeReaction: (chatId, messageId, userId) => {
        set((state) => {
          const chatMessages = state.messages.get(chatId);
          if (!chatMessages) return state;
          
          return {
            messages: new Map(state.messages).set(
              chatId,
              chatMessages.map((msg) => {
                if (msg.id === messageId) {
                  const reactions = msg.reactions || [];
                  return {
                    ...msg,
                    reactions: reactions.filter((r) => r.user.id !== userId),
                  };
                }
                return msg;
              }),
            ),
          };
        });
      },
      
      // Message status
      updateMessageStatus: (chatId, messageId, status, userId) => {
        set((state) => {
          const chatMessages = state.messages.get(chatId);
          if (!chatMessages) return state;
          
          return {
            messages: new Map(state.messages).set(
              chatId,
              chatMessages.map((msg) => {
                if (msg.id === messageId) {
                  return {
                    ...msg,
                    statuses: (msg.statuses || []).map((s) =>
                      s.user.id === userId ? { ...s, status } : s
                    ),
                  };
                }
                return msg;
              }),
            ),
          };
        });
      },
      
      markAllAsRead: async (chatId) => {
        try {
          await messageService.markAllAsRead(chatId);
          
          // Update local state
          get().resetUnreadCount(chatId);
        } catch (error) {
          console.error('Failed to mark all as read:', error);
        }
      },
      
      // Unread counts
      fetchUnreadCounts: async () => {
        try {
          const counts = await chatService.getUnreadCounts();
          
          set((state) => {
            const newCounts = new Map(state.unreadCounts);
            Object.entries(counts).forEach(([chatId, count]) => {
              newCounts.set(chatId, count);
            });
            return { unreadCounts: newCounts };
          });
        } catch (error) {
          console.error('Failed to fetch unread counts:', error);
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
            unreadCounts: new Map(state.unreadCounts).set(
              chatId,
              currentCount + 1
            ),
          };
        });
      },
      
      resetUnreadCount: (chatId) => {
        set((state) => ({
          unreadCounts: new Map(state.unreadCounts).set(chatId, 0),
        }));
      },
      
      // Participants
      addParticipant: (chatId, user) => {
        set((state) => ({
          chats: state.chats.map((chat) => {
            if (chat.id === chatId) {
              const participants = chat.participants || [];
              return {
                ...chat,
                participants: [...participants, user],
              };
            }
            return chat;
          }),
        }));
      },
      
      removeParticipant: (chatId, userId) => {
        set((state) => ({
          chats: state.chats.map((chat) => {
            if (chat.id === chatId) {
              const participants = chat.participants || [];
              return {
                ...chat,
                participants: participants.filter((p) => p.id !== userId),
              };
            }
            return chat;
          }),
        }));
      },
      
      // Typing indicators
      setTypingUser: (chatId, userId) => {
        set((state) => {
          const typingSet = state.typingUsers.get(chatId) || new Set();
          typingSet.add(userId);
          
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
      
      // User status
      updateUserStatus: (userId, is_online, last_seen) => {
        set((state) => ({
          onlineUsers: new Map(state.onlineUsers).set(userId, {
            is_online,
            last_seen,
          }),
        }));
      },
      
      // Search
      searchMessages: async (query, chatId) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await chatService.searchMessages(query, chatId);
          set({ isLoading: false });
          if (response && typeof response === 'object' && 'results' in response) {
            return (response as { results?: Message[] }).results || [];
          }
          return [];
        } catch (error: any) {
          set({
            error: error.response?.data?.error || 'Search failed',
            isLoading: false,
          });
          return [];
        }
      },
      
      // UI State
      setLoading: (loading) => set({ isLoading: loading }),
      setSending: (sending) => set({ isSending: sending }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    { name: 'chat-store' }
  )
);

// Selectors for better performance
export const useChats = () => useChatStore((state) => state.chats);
export const useCurrentChat = () => useChatStore((state) => state.currentChat);
export const useChatMessages = (chatId: string) =>
  useChatStore((state) => state.messages.get(chatId) || []);
export const useUnreadCount = (chatId: string) =>
  useChatStore((state) => state.unreadCounts.get(chatId) || 0);
export const useTypingUsers = (chatId: string) =>
  useChatStore((state) => state.typingUsers.get(chatId) || new Set());
export const useUserStatus = (userId: number) =>
  useChatStore((state) => state.onlineUsers.get(userId) || { is_online: false });
export const useChatLoading = () => useChatStore((state) => state.isLoading);
export const useChatError = () => useChatStore((state) => state.error);