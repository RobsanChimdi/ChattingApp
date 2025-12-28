import { socketService } from './socket';
import type { 
  Message, 
  MessageReaction, 
  Chat, 
  User,
  MessageStatus
} from '@/types';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';

export const setupChatEvents = () => {
  const chatStore = useChatStore.getState();
  const authStore = useAuthStore.getState();

  // 🔔 New message
  socketService.on('new_message', (data: { message: Message }) => {
    const { message } = data;
    const currentUserId = authStore.user?.id;

    // Add message to store
    chatStore.addMessage(message.chat_id, message);

    // Increment unread count if message is not from current user
    if (message.sender.id !== currentUserId) {
      chatStore.incrementUnreadCount(message.chat_id);
    }

    // Play notification if tab is hidden
    if (document.hidden && message.sender.id !== currentUserId) {
      playNotificationSound();
    }
  });

  // ✏️ Message edited
  socketService.on('message_edited', (data: { message: Message }) => {
    chatStore.updateMessage(data.message.chat_id, data.message);
  });

  // 🗑 Message deleted
  socketService.on('message_deleted', (data: { 
    message_id: string; 
    chat_id: string 
  }) => {
    chatStore.deleteMessageLocal(data.chat_id, data.message_id);
  });

  // ❤️ Message reaction added
  socketService.on('reaction_added', (data: {
    message_id: string;
    chat_id: string;
    reaction: MessageReaction;
  }) => {
    chatStore.addReaction(data.chat_id, data.message_id, data.reaction);
  });

  // ❌ Message reaction removed
  socketService.on('reaction_removed', (data: {
    message_id: string;
    chat_id: string;
    user_id: number;
  }) => {
    chatStore.removeReaction(data.chat_id, data.message_id, data.user_id);
  });

  // 📨 Message status (delivered/read)
  socketService.on('message_status_updated', (data: {
    message_id: string;
    chat_id: string;
    status: 'delivered' | 'read';
    user_id: number;
  }) => {
    // Only handle delivered and read statuses
    chatStore.updateMessageStatus(
      data.chat_id,
      data.message_id,
      data.status,
      data.user_id
    );
  });

  // Handle 'sent' status separately if needed
  socketService.on('message_sent', (data: {
    message_id: string;
    chat_id: string;
    user_id: number;
  }) => {
    // Handle sent status if your store supports it
    // Or update the message as sent in another way
    console.log('Message sent:', data.message_id);
  });

  // 💬 New chat created
  socketService.on('chat_created', (data: { chat: Chat }) => {
    chatStore.addChat(data.chat);
  });

  // 🔄 Chat updated
  socketService.on('chat_updated', (data: { chat: Chat }) => {
    chatStore.updateChat(data.chat);
  });

  // ➕ Participant added to chat
  socketService.on('participant_added', (data: {
    chat_id: string;
    user: User;
  }) => {
    chatStore.addParticipant(data.chat_id, data.user);
  });

  // ➖ Participant removed from chat
  socketService.on('participant_removed', (data: {
    chat_id: string;
    user_id: number;
  }) => {
    chatStore.removeParticipant(data.chat_id, data.user_id);
  });

  // 👥 User left chat
  socketService.on('user_left_chat', (data: {
    chat_id: string;
    user_id: number;
  }) => {
    chatStore.removeParticipant(data.chat_id, data.user_id);
  });

  // ✍️ Typing indicator
  socketService.on('user_typing', (data: {
    chat_id: string;
    user_id: number;
    is_typing: boolean;
  }) => {
    if (data.is_typing) {
      chatStore.setTypingUser(data.chat_id, data.user_id);
    } else {
      chatStore.clearTypingUser(data.chat_id, data.user_id);
    }
  });

  // 🟢 Online status updates
  socketService.on('user_online_status', (data: {
    user_id: number;
    is_online: boolean;
    last_seen?: string;
    status?: string;
  }) => {
    chatStore.updateUserStatus(
      data.user_id,
      data.is_online,
      data.last_seen
    );
  });

  // 🕐 Last seen update
  socketService.on('last_seen_updated', (data: {
    user_id: number;
    last_seen: string;
  }) => {
    chatStore.updateUserStatus(
      data.user_id,
      true, // Assume online when updating last seen
      data.last_seen
    );
  });

  // ---------- EMITTERS ----------

  const emitTyping = (chatId: string, isTyping: boolean) => {
    socketService.emit('typing', {
      chat_id: chatId,
      is_typing: isTyping,
    });
  };

  const sendMessage = (chatId: string, messageData: {
    text?: string;
    message_type?: string;
    reply_to?: string;
  }) => {
    socketService.emit('send_message', {
      chat_id: chatId,
      ...messageData,
    });
  };

  const editMessage = (messageId: string, text: string) => {
    socketService.emit('edit_message', {
      message_id: messageId,
      text: text,
    });
  };

  const deleteMessage = (messageId: string) => {
    socketService.emit('delete_message', {
      message_id: messageId,
    });
  };

  const reactToMessage = (messageId: string, emoji: string) => {
    socketService.emit('react_to_message', {
      message_id: messageId,
      emoji: emoji,
    });
  };

  const removeReaction = (messageId: string) => {
    socketService.emit('remove_reaction', {
      message_id: messageId,
    });
  };

  const forwardMessage = (messageId: string, chatId: string) => {
    socketService.emit('forward_message', {
      message_id: messageId,
      chat_id: chatId,
    });
  };

  const markAsRead = (messageId: string) => {
    socketService.emit('mark_as_read', {
      message_id: messageId,
    });
  };

  const markAllAsRead = (chatId: string) => {
    socketService.emit('mark_all_as_read', {
      chat_id: chatId,
    });
  };

  const createPrivateChat = (participantId: number) => {
    socketService.emit('create_private_chat', {
      participant_id: participantId,
    });
  };

  // Helper function to play notification sound
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Silent fail if audio can't play
      });
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  };

  return {
    // Typing
    emitTyping,
    
    // Messages
    sendMessage,
    editMessage,
    deleteMessage,
    reactToMessage,
    removeReaction,
    forwardMessage,
    markAsRead,
    markAllAsRead,
    
    // Chats
    createPrivateChat,
    
    // Room management
    joinChat: (chatId: string) => {
      socketService.emit('join_chat', { chat_id: chatId });
    },
    
    leaveChat: (chatId: string) => {
      socketService.emit('leave_chat', { chat_id: chatId });
    },
  };
};

// Singleton instance
let chatEventsInstance: ReturnType<typeof setupChatEvents> | null = null;

export const getChatEvents = () => {
  if (!chatEventsInstance) {
    chatEventsInstance = setupChatEvents();
  }
  return chatEventsInstance;
};