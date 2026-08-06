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
    <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.12),_transparent_35%),linear-gradient(to_bottom,_rgba(255,255,255,0.02),_transparent)]">
      {currentChat ? (
        <ChatHeader chat={currentChat} onBack={onBack} />
      ) : (
        <div className="border-b border-border/70 bg-background/80 p-4 backdrop-blur-sm">
          <div className="flex h-10 w-10 animate-pulse items-center justify-center rounded-full bg-muted">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </div>
      )}

      <ScrollArea ref={scrollAreaRef} className="flex-1 px-4 pb-4 pt-3" onScroll={handleScroll} onScrollCapture={handleScrollToTop}>
        {isLoading && messages.length === 0 ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <div className="max-w-[70%]">
                  <div className="h-16 animate-pulse rounded-[22px] bg-muted/80" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {messages.length === 0 && !isLoading ? (
              <div className="flex h-full min-h-[280px] items-center justify-center">
                <div className="w-full max-w-md rounded-[28px] border border-border/70 bg-background/70 px-6 py-8 text-center shadow-sm backdrop-blur-sm">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold">Start the conversation</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Send the first message and make this chat feel alive.</p>
                </div>
              </div>
            ) : (
              <>
                {hasMoreMessages && messages.length > 0 && (
                  <div className="mb-4 flex justify-center">
                    <Button variant="outline" size="sm" onClick={loadMoreMessages} disabled={isLoading} className="rounded-full border-border/70 bg-background/80 backdrop-blur-sm">
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
                      chatId={chatId}
                      isSelected={selectedMessage?.id === message.id}
                    />
                  ))}
                </div>
              </>
            )}

            {typingUsers.size > 0 && (
              <div className="mt-4 flex items-center space-x-2">
                <div className="rounded-2xl border border-border/70 bg-background/80 px-3 py-2 shadow-sm backdrop-blur-sm">
                  <div className="flex space-x-1">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" />
                    <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div ref={messagesEndRef} />
      </ScrollArea>

      <div className="border-t border-border/70 bg-background/80 p-4 backdrop-blur-sm">
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