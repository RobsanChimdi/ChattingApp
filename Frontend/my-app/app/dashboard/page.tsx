'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { useCall } from '@/hooks/useCall';
import { useSocket } from '@/hooks/useSocket';
import { callService } from '@/services/call.service';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Phone,
  Video,
  Users,
  Clock,
  ArrowRight,
  PhoneOff,
  PhoneIncoming,
  PhoneOutgoing,
  Radio,
  Wifi,
  WifiOff,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecentChat {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  type: 'direct' | 'group';
}

interface RecentCall {
  id: string;
  with: {
    id: string;
    name: string;
    avatar?: string;
  };
  type: 'audio' | 'video';
  direction: 'incoming' | 'outgoing' | 'missed';
  duration?: number;
  timestamp: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { isConnected } = useSocket();
  const { chats, fetchChats } = useChat();
  const { activeCall } = useCall();
  
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalChats: 0,
    totalCalls: 0,
    unreadMessages: 0,
    onlineContacts: 0
  });

  // Check authentication
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Load dashboard data
  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch chats
      const chatsData = await fetchChats();
      
      // Process recent chats
      const processedChats: RecentChat[] = chatsData.slice(0, 5).map((chat: any) => ({
        id: chat.id,
        name: chat.name || chat.participants?.[0]?.username || 'Unknown',
        avatar: chat.avatar || chat.participants?.[0]?.profile_image,
        lastMessage: chat.last_message?.text || chat.last_message?.content,
        lastMessageTime: chat.last_message?.created_at,
        unreadCount: chat.unread_count || 0,
        type: chat.chat_type === 'group' ? 'group' : 'direct'
      }));

      setRecentChats(processedChats);

      // Fetch real calls data
      const callsData = await callService.getUserCalls();
      const processedCalls: RecentCall[] = callsData.slice(0, 5).map((call: any) => {
        const otherParticipant = call.participants?.find((p: any) => p.user.id !== user?.id);
        const isInitiator = call.initiated_by === user?.id;
        const isMissed = call.status === 'missed' || call.status === 'rejected';
        
        return {
          id: call.id.toString(),
          with: {
            id: otherParticipant?.user.id?.toString() || 'unknown',
            name: otherParticipant?.user.username || 'Unknown',
            avatar: otherParticipant?.user.profile_image
          },
          type: call.call_type,
          direction: isMissed && !isInitiator ? 'missed' : (isInitiator ? 'outgoing' : 'incoming'),
          duration: call.call_duration,
          timestamp: call.started_at
        };
      });

      setRecentCalls(processedCalls);

      // Fetch real statistics
      const statsData = await api.get<any>('/users/statistics/');
      
      // Count online contacts from chat participants
      const onlineContactsCount = new Set<number>();
      chatsData.forEach((chat: any) => {
        chat.participants?.forEach((participant: any) => {
          if (participant.user.id !== user?.id && participant.user.is_online) {
            onlineContactsCount.add(participant.user.id);
          }
        });
      });
      
      setStats({
        totalChats: statsData.chats?.total || chatsData.length,
        totalCalls: statsData.calls?.total || callsData.length,
        unreadMessages: processedChats.reduce((acc, chat) => acc + chat.unreadCount, 0),
        onlineContacts: onlineContactsCount.size
      });

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Fallback to empty data on error
      setRecentChats([]);
      setRecentCalls([]);
      setStats({
        totalChats: 0,
        totalCalls: 0,
        unreadMessages: 0,
        onlineContacts: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Format timestamp
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

  // Format duration
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get call icon and color
  const getCallDisplay = (call: RecentCall) => {
    switch (call.direction) {
      case 'incoming':
        return { icon: PhoneIncoming, color: 'text-green-500' };
      case 'outgoing':
        return { icon: PhoneOutgoing, color: 'text-blue-500' };
      case 'missed':
        return { icon: PhoneOff, color: 'text-red-500' };
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // If there's an active call, show call banner
  if (activeCall) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <div className="max-w-md mx-auto space-y-6">
            <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <Phone className="h-10 w-10 text-primary" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">You're in an active call</h2>
              <p className="text-muted-foreground">
                Return to your current call or end it to start a new one.
              </p>
            </div>

            <div className="space-y-4">
              <Button
                size="lg"
                onClick={() => router.push(`/call/${activeCall.id}`)}
                className="w-full"
              >
                <Phone className="h-4 w-4 mr-2" />
                Return to Call
              </Button>

              <Button
                variant="outline"
                onClick={() => router.push('/chat')}
                className="w-full"
              >
                Go to Chats
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user?.username}!</h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your calls and messages.
          </p>
        </div>

        <Badge 
          variant="outline" 
          className={cn(
            "px-3 py-1",
            isConnected ? "text-green-500 border-green-500/20 bg-green-500/10" : "text-red-500 border-red-500/20 bg-red-500/10"
          )}
        >
          {isConnected ? (
            <>
              <Wifi className="h-3 w-3 mr-1" />
              Connected
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 mr-1" />
              Offline
            </>
          )}
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Chats</p>
              <p className="text-2xl font-bold mt-1">{stats.totalChats}</p>
            </div>
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Calls</p>
              <p className="text-2xl font-bold mt-1">{stats.totalCalls}</p>
            </div>
            <div className="h-12 w-12 bg-blue-500/10 rounded-full flex items-center justify-center">
              <Phone className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Unread Messages</p>
              <p className="text-2xl font-bold mt-1">{stats.unreadMessages}</p>
            </div>
            <div className="h-12 w-12 bg-yellow-500/10 rounded-full flex items-center justify-center">
              <Badge variant="destructive" className="h-6 w-6 rounded-full p-0 flex items-center justify-center">
                {stats.unreadMessages}
              </Badge>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Online Contacts</p>
              <p className="text-2xl font-bold mt-1">{stats.onlineContacts}</p>
            </div>
            <div className="h-12 w-12 bg-green-500/10 rounded-full flex items-center justify-center">
              <Radio className="h-6 w-6 text-green-500 animate-pulse" />
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Chats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Chats</h2>
            <Link href="/dashboard/chat">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>

          <div className="space-y-2">
            {recentChats.length > 0 ? (
              recentChats.map((chat) => (
                <Link
                  key={chat.id}
                  href={`/chat/${chat.id}`}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Avatar>
                    <AvatarImage src={chat.avatar} />
                    <AvatarFallback>
                      {chat.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{chat.name}</p>
                      {chat.lastMessageTime && (
                        <span className="text-xs text-muted-foreground">
                          {formatTime(chat.lastMessageTime)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {chat.lastMessage || 'No messages yet'}
                    </p>
                  </div>

                  {chat.unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-auto">
                      {chat.unreadCount}
                    </Badge>
                  )}
                </Link>
              ))
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No recent chats</p>
                <Link href="/chat">
                  <Button variant="link" className="mt-2">
                    Start a conversation
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </Card>

        {/* Recent Calls */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Calls</h2>
            <Link href="/dashboard/call">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>

          <div className="space-y-2">
            {recentCalls.length > 0 ? (
              recentCalls.map((call) => {
                const { icon: CallIcon, color } = getCallDisplay(call);
                
                return (
                  <Link
                    key={call.id}
                    href={`/call/${call.id}`}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Avatar>
                      <AvatarImage src={call.with.avatar} />
                      <AvatarFallback>
                        {call.with.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">{call.with.name}</p>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(call.timestamp)}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2 mt-1">
                        <CallIcon className={cn("h-3 w-3", color)} />
                        <span className="text-xs text-muted-foreground">
                          {call.type === 'video' ? '📹' : '🎤'} {call.type} call
                        </span>
                        {call.duration && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {formatDuration(call.duration)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="text-center py-8">
                <Phone className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No recent calls</p>
                <Link href="/chat">
                  <Button variant="link" className="mt-2">
                    Start a call
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center space-y-2"
            onClick={() => router.push('/dashboard/chat')}
          >
            <MessageSquare className="h-6 w-6" />
            <span>New Message</span>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center space-y-2"
            onClick={() => router.push('/dashboard/call/setup')}
          >
            <Phone className="h-6 w-6" />
            <span>Start Audio Call</span>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center space-y-2"
            onClick={() => router.push('/dashboard/call/setup')}
          >
            <Video className="h-6 w-6" />
            <span>Start Video Call</span>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center space-y-2"
            onClick={() => router.push('/dashboard/contacts')}
          >
            <Users className="h-6 w-6" />
            <span>Add Contact</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}