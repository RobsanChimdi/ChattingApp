import { useState, useEffect, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search,
  UserPlus,
  MessageSquare,
  Users,
  Clock,
  CheckCheck,
  Check
} from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import type { Chat } from '@/types';

interface ChatListProps {
  onChatSelect: (chat: Chat) => void;
  selectedChatId?: string;
}

export function ChatList({ onChatSelect, selectedChatId }: ChatListProps) {
  const { chats, fetchChats, searchChats, isLoading } = useChat();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  useEffect(() => {
    if (searchQuery) {
      setFilteredChats(searchChats(searchQuery));
    } else {
      setFilteredChats(chats);
    }
  }, [chats, searchQuery, searchChats]);

  const getChatName = useCallback((chat: Chat) => {
    if (chat.chat_type === 'private') {
      const otherUser = chat.participants.find(p => p.id !== user?.id);
      return otherUser?.username || 'Unknown User';
    }
    return chat.name || 'Group Chat';
  }, [user]);

  const getChatAvatar = useCallback((chat: Chat) => {
    if (chat.chat_type === 'private') {
      const otherUser = chat.participants.find(p => p.id !== user?.id);
      return otherUser?.profile_image || undefined;
    }
    return chat.avatar || undefined;
  }, [user]);

  const getLastMessagePreview = useCallback((chat: Chat) => {
    if (!chat.last_message) return 'No messages yet';
    
    const sender = chat.last_message.sender.id === user?.id ? 'You: ' : '';
    const text = chat.last_message.text || 
      (chat.last_message.message_type === 'image' ? '📷 Photo' : 
       chat.last_message.message_type === 'video' ? '🎥 Video' : 
       chat.last_message.message_type === 'file' ? '📄 File' : '');
    
    return sender + text;
  }, [user]);

  const getUnreadCount = useCallback((chat: Chat) => {
    return chat.unread_count || 0;
  }, []);

  const formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b">
          <div className="h-10 bg-muted animate-pulse rounded-md" />
        </div>
        <ScrollArea className="flex-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 border-b">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-muted animate-pulse rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                  <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Chats</h2>
          <Button size="icon" variant="ghost">
            <UserPlus className="h-5 w-5" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {searchQuery ? 'No matching chats' : 'No chats yet'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'Try a different search term' : 'Start a new conversation'}
            </p>
          </div>
        ) : (
          filteredChats.map((chat) => {
              const isRead = chat.last_message?.statuses?.some(
                (s) => s.status === 'read'
              );
              return (
                    <Card
                      key={chat.id}
                      className={cn(
                        "border-0 border-b rounded-none cursor-pointer transition-colors hover:bg-muted/50",
                        selectedChatId === chat.id && "bg-muted"
                      )}
                      onClick={() => onChatSelect(chat)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          {/* Avatar */}
                          <div className="relative">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={getChatAvatar(chat)} />
                              <AvatarFallback>
                                {getChatName(chat).charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {chat.chat_type === 'group' && (
                              <Badge 
                                variant="secondary" 
                                className="absolute -bottom-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
                              >
                                <Users className="h-3 w-3" />
                              </Badge>
                            )}
                          </div>

                          {/* Chat Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold truncate">
                                {getChatName(chat)}
                              </h3>
                              <span className="text-xs text-muted-foreground">
                                {formatTime(chat.updated_at)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between mt-1">
                              <p className="text-sm text-muted-foreground truncate flex-1">
                                {getLastMessagePreview(chat)}
                              </p>
                              {getUnreadCount(chat) > 0 && (
                                <Badge className="ml-2">
                                  {getUnreadCount(chat)}
                                </Badge>
                              )}
                            </div>

                            {/* Status indicators */}
                            <div className="flex items-center space-x-2 mt-1">
                              {chat.last_message?.sender.id === user?.id && (
                                
                                    <span className="text-xs text-muted-foreground">
                                      {isRead ? (
                                        <CheckCheck className="h-3 w-3 inline" />
                                      ) : (
                                        <Check className="h-3 w-3 inline" />
                                      )}
                                    </span>
                                  )}

                              {chat.participants?.some(u => u.id !== user?.id) && (
                                <span className="text-xs text-primary animate-pulse">
                                  typing...
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) })
        )}
      </ScrollArea>
    </div>
  );
}