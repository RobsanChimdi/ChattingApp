// components/chat/ChatWindow.tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useChat } from '@/hooks/useChat';
import { useMessages } from '@/hooks/useMessage';
import { MessageBubble } from './message-bubble';
import { MessageInput } from './message-input';
import { ChatHeader } from './chat-header';
import { MessageSquare, Loader2 } from 'lucide-react';

interface ChatWindowProps {
  chatId?: number;
  onBack?: () => void;
}

export function ChatWindow({ chatId, onBack }: ChatWindowProps) {
  const { currentChat, messages, isLoading, typingUsers, loadMoreMessages, hasMoreMessages } = useChat(chatId);
  const { sendMessage, selectedMessage } = useMessages(chatId);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    if (isAtBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAtBottom]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const atBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsAtBottom(atBottom);
  }, []);

  const handleScrollToTop = useCallback(async () => {
    if (!hasMoreMessages || isLoading) return;
    const scrollArea = scrollAreaRef.current;
    if (scrollArea && scrollArea.scrollTop < 100) {
      await loadMoreMessages();
    }
  }, [hasMoreMessages, isLoading, loadMoreMessages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return;
    setIsSending(true);
    try {
      await sendMessage(newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!chatId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <MessageSquare className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No Chat Selected</h3>
        <p className="text-muted-foreground">Select a chat from the list to start messaging</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {currentChat ? (
        <ChatHeader chat={currentChat} onBack={onBack} />
      ) : (
        <div className="p-4 border-b">
          <div className="h-10 w-10 bg-muted animate-pulse rounded-full flex items-center justify-center">
            <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
          </div>
        </div>
      )}

      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4" onScroll={handleScroll} onScrollCapture={handleScrollToTop}>
        {isLoading && messages.length === 0 ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <div className="max-w-[70%]"><div className="h-16 bg-muted animate-pulse rounded-lg" /></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {hasMoreMessages && (
              <div className="flex justify-center mb-4">
                <Button variant="outline" size="sm" onClick={loadMoreMessages} disabled={isLoading}>
                  {isLoading ? 'Loading...' : 'Load older messages'}
                </Button>
              </div>
            )}

            <div className="space-y-4">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  chatType={currentChat?.chat_type || 'private'}
                  isSelected={selectedMessage?.id === message.id}
                />
              ))}
            </div>

            {typingUsers.size > 0 && (
              <div className="flex items-center space-x-2 mt-4">
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex space-x-1">
                    <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" />
                    <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div ref={messagesEndRef} />
      </ScrollArea>

      <div className="border-t p-4">
        <MessageInput
          value={newMessage}
          onChange={setNewMessage}
          onSend={handleSendMessage}
          onKeyPress={handleKeyPress}
          disabled={isSending}
          chatId={chatId}
        />
      </div>
    </div>
  );
}