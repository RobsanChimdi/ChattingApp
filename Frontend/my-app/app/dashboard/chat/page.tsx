'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  MessageSquare,
  Search,
  Plus,
  MoreVertical,
  Video,
  Phone,
  Clock,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ChatsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { chats, fetchChats, isLoading: chatsLoading } = useChat();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredChats, setFilteredChats] = useState(chats);

  useEffect(() => {
    if (isAuthenticated) {
      fetchChats();
    }
  }, [isAuthenticated, fetchChats]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = chats.filter((chat: any) =>
        chat.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredChats(filtered);
    } else {
      setFilteredChats(chats);
    }
  }, [searchQuery, chats]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (authLoading || chatsLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Chats</h1>
          <p className="text-muted-foreground mt-1">
            Your conversations
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/chat/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="space-y-2">
        {filteredChats.length > 0 ? (
          filteredChats.map((chat: any) => (
            <Link
              key={chat.id}
              href={`/dashboard/chat/${chat.id}`}
              className="block"
            >
              <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={chat.display_image || chat.image} />
                    <AvatarFallback>
                      {chat.display_name?.charAt(0).toUpperCase() || chat.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">
                        {chat.display_name || chat.name}
                      </p>
                      {chat.last_message?.created_at && (
                        <span className="text-xs text-muted-foreground">
                          {formatTime(chat.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {chat.last_message?.text || chat.last_message?.content}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {chat.unread_count > 0 && (
                      <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                        {chat.unread_count}
                      </Badge>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </Link>
          ))
        ) : (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground mb-2">
              {searchQuery ? 'No chats found' : 'No chats yet'}
            </p>
            {!searchQuery && (
              <Button onClick={() => router.push('/dashboard/chat/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Start a conversation
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
