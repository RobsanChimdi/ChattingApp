// app/chat/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { useSocket } from '@/hooks/useSocket';
import { ChatWindow } from '@/components/chat/chat-window';
import { ChatList } from '@/components/chat/chat-list';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { isConnected } = useSocket();
  const chatIdParam = params.chatId as string;
  const chatIdNumber = chatIdParam ? parseInt(chatIdParam, 10) : undefined;
  
  const { chats, currentChat, setCurrentChat, fetchChats } = useChat(chatIdNumber);
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated && !isInitialized) {
      fetchChats().then(() => setIsInitialized(true));
    }
  }, [isAuthenticated, fetchChats, isInitialized]);

  const handleChatSelect = (chat: any) => {
    setCurrentChat(chat);
    router.push(`/chat/${chat.id}`);
    setIsMobileMenuOpen(false);
  };

  const handleBack = () => {
    setCurrentChat(null);
    router.push('/chat');
    setIsMobileMenuOpen(false);
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-background">
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-80 transform border-r bg-background transition-transform duration-200 ease-in-out md:relative md:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <ChatList onChatSelect={handleChatSelect} selectedChatId={chatIdParam} />
      </div>

      <div className="flex-1">
        {!isConnected && chatIdParam && (
          <div className="bg-yellow-100 dark:bg-yellow-900/20 p-2 text-center text-sm">
            <p className="text-yellow-800 dark:text-yellow-200">Reconnecting to chat server...</p>
          </div>
        )}
        <ChatWindow chatId={chatIdNumber} onBack={handleBack} />
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}
    </div>
  );
}