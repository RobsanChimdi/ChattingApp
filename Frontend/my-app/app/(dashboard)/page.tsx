'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { useCall } from '@/hooks/useCall';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MessageSquare,
  Phone,
  Video,
  Users,
  Clock,
  CheckCheck,
  ChevronRight,
  Loader2,
  Calendar,
  TrendingUp,
  UserPlus,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Mic,
  MicOff,
  VideoOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';

export default function DashboardPage() {
  const { user } = useAuth();
  const { chats, fetchChats, isLoading: chatsLoading } = useChat();
  const { activeCall } = useCall();
  
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalChats: 0,
    unreadMessages: 0,
    totalCalls: 0,
    missedCalls: 0,
    onlineFriends: 0,
    activeCalls: 0,
  });

  // Fetch chats and calculate stats
  useEffect(() => {
    fetchChats().then((fetchedChats) => {
      // Calculate stats
      const totalUnread = fetchedChats.reduce(
        (sum: number, chat: any) => sum + (chat.unread_count || 0), 
        0
      );
      
      const onlineCount = fetchedChats.filter((chat: any) => 
        chat.chat_type === 'private' && 
        chat.participants?.some((p: any) => p.is_online && p.id !== user?.id)
      ).length;

      setStats({
        totalChats: fetchedChats.length,
        unreadMessages: totalUnread,
        totalCalls: 0, // This would come from call store
        missedCalls: 0, // This would come from call store
        onlineFriends: onlineCount,
        activeCalls: activeCall ? 1 : 0,
      });

      // Get recent chats (last 5)
      setRecentChats(
        fetchedChats
          .sort((a: any, b: any) => 
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          )
          .slice(0, 5)
      );
    });

    // Fetch recent calls
    // This would come from your call store/service
    setRecentCalls([
      {
        id: '1',
        with: { id: '2', username: 'John Doe', profile_image: '' },
        type: 'video',
        direction: 'outgoing',
        status: 'completed',
        duration: 125,
        started_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: '2',
        with: { id: '3', username: 'Jane Smith', profile_image: '' },
        type: 'audio',
        direction: 'incoming',
        status: 'missed',
        duration: 0,
        started_at: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: '3',
        with: { id: '4', username: 'Mike Johnson', profile_image: '' },
        type: 'video',
        direction: 'incoming',
        status: 'completed',
        duration: 320,
        started_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ]);
  }, [fetchChats, user?.id, activeCall]);

  const getChatName = (chat: any) => {
    if (chat.chat_type === 'private') {
      const otherUser = chat.participants?.find((p: any) => p.id !== user?.id);
      return otherUser?.username || 'Unknown User';
    }
    return chat.name || 'Group Chat';
  };

  const getChatAvatar = (chat: any) => {
    if (chat.chat_type === 'private') {
      const otherUser = chat.participants?.find((p: any) => p.id !== user?.id);
      return otherUser?.profile_image;
    }
    return chat.avatar;
  };

  const getLastMessagePreview = (chat: any) => {
    if (!chat.last_message) return 'No messages yet';
    
    const sender = chat.last_message.sender?.id === user?.id ? 'You: ' : '';
    const text = chat.last_message.text || 
      (chat.last_message.message_type === 'image' ? '📷 Photo' : 
       chat.last_message.message_type === 'video' ? '🎥 Video' : 
       chat.last_message.message_type === 'file' ? '📄 File' : 
       chat.last_message.message_type === 'audio' ? '🎵 Audio' : '');
    
    return sender + text;
  };

  const getCallIcon = (call: any) => {
    switch (call.type) {
      case 'video':
        return Video;
      case 'audio':
        return Phone;
      default:
        return Phone;
    }
  };

  const getCallStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-500';
      case 'missed':
        return 'text-destructive';
      case 'rejected':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const getCallDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'incoming':
        return PhoneIncoming;
      case 'outgoing':
        return PhoneOutgoing;
      default:
        return Phone;
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {user?.first_name || user?.username}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        
        {activeCall && (
          <Link href={`/call/${activeCall.id}`}>
            <Button className="bg-green-600 hover:bg-green-700">
              <Phone className="h-4 w-4 mr-2 animate-pulse" />
              Return to Active Call
            </Button>
          </Link>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Chats</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalChats}</div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <p className="text-xs text-muted-foreground">
                {stats.onlineFriends} friends online
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
            <CheckCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unreadMessages}</div>
            <p className="text-xs text-muted-foreground">
              {stats.unreadMessages > 0 
                ? `Waiting in ${stats.unreadMessages} chats` 
                : 'All caught up!'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCalls}</div>
            <div className="flex items-center space-x-2">
              <Badge variant="destructive" className="text-xs">
                {stats.missedCalls} missed
              </Badge>
              {stats.activeCalls > 0 && (
                <Badge variant="default" className="bg-green-500 text-xs animate-pulse">
                  {stats.activeCalls} active
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <Button size="sm" variant="outline" asChild>
                <Link href="/chat?new=true">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  New Chat
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href="/call/setup?type=video">
                  <Video className="h-3 w-3 mr-1" />
                  Call
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="recent" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
          <TabsTrigger value="chats">Chats</TabsTrigger>
          <TabsTrigger value="calls">Calls</TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent Chats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Recent Chats</span>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/chat">
                      View all
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </CardTitle>
                <CardDescription>
                  Your most recent conversations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {chatsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : recentChats.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No chats yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Start a new conversation to get started!
                    </p>
                    <Button asChild>
                      <Link href="/chat?new=true">Start Chatting</Link>
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-2">
                      {recentChats.map((chat) => (
                        <Link
                          key={chat.id}
                          href={`/chat/${chat.id}`}
                          className="block"
                        >
                          <div className="flex items-center space-x-4 p-3 rounded-lg transition-colors hover:bg-muted/50">
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
                              {chat.chat_type === 'private' && (
                                <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-background bg-green-500" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold truncate">
                                  {getChatName(chat)}
                                </h4>
                                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                  {formatDistanceToNow(new Date(chat.updated_at), { addSuffix: true })}
                                </span>
                              </div>

                              <p className="text-sm text-muted-foreground truncate">
                                {getLastMessagePreview(chat)}
                              </p>

                              <div className="flex items-center space-x-2 mt-1">
                                {chat.unread_count > 0 && (
                                  <Badge variant="default" className="text-xs">
                                    {chat.unread_count} new
                                  </Badge>
                                )}
                                {chat.last_message?.sender?.id === user?.id && (
                                  <span className="text-xs text-muted-foreground">
                                    {chat.last_message?.statuses?.some((s: any) => s.status === 'read') ? (
                                      <CheckCheck className="h-3 w-3 inline" />
                                    ) : (
                                      <CheckCheck className="h-3 w-3 inline opacity-50" />
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Recent Calls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Recent Calls</span>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/calls">
                      View all
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </CardTitle>
                <CardDescription>
                  Your call history
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentCalls.length === 0 ? (
                  <div className="text-center py-8">
                    <Phone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No calls yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Start a call with your contacts
                    </p>
                    <Button asChild>
                      <Link href="/call/setup?type=audio">Start a Call</Link>
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-2">
                      {recentCalls.map((call) => {
                        const CallIcon = getCallIcon(call);
                        const DirectionIcon = getCallDirectionIcon(call.direction);
                        
                        return (
                          <Link
                            key={call.id}
                            href={`/call/${call.id}`}
                            className="block"
                          >
                            <div className="flex items-center space-x-4 p-3 rounded-lg transition-colors hover:bg-muted/50">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={call.with.profile_image} />
                                <AvatarFallback>
                                  {call.with.username.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium truncate">
                                    {call.with.username}
                                  </h4>
                                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                    {formatDistanceToNow(new Date(call.started_at), { addSuffix: true })}
                                  </span>
                                </div>

                                <div className="flex items-center space-x-2 mt-1">
                                  <DirectionIcon className={cn(
                                    "h-3 w-3",
                                    getCallStatusColor(call.status)
                                  )} />
                                  <CallIcon className="h-3 w-3" />
                                  <span className="text-xs text-muted-foreground">
                                    {call.status === 'completed' 
                                      ? formatDuration(call.duration)
                                      : call.status.charAt(0).toUpperCase() + call.status.slice(1)
                                    }
                                  </span>
                                  {call.type === 'video' && (
                                    <Badge variant="outline" className="text-[10px] h-4">
                                      Video
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="chats">
          <Card>
            <CardHeader>
              <CardTitle>All Chats</CardTitle>
              <CardDescription>
                View and manage all your conversations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chatsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : chats.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No chats yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start a new conversation to get started!
                  </p>
                  <Button asChild>
                    <Link href="/chat?new=true">Start Chatting</Link>
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {chats.map((chat: any) => (
                      <Link
                        key={chat.id}
                        href={`/chat/${chat.id}`}
                        className="block"
                      >
                        <div className="flex items-center space-x-4 p-3 rounded-lg transition-colors hover:bg-muted/50">
                          <div className="relative">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={getChatAvatar(chat)} />
                              <AvatarFallback>
                                {getChatName(chat).charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {chat.chat_type === 'private' && (
                              <span className={cn(
                                "absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-background",
                                chat.participants?.some((p: any) => p.is_online) 
                                  ? "bg-green-500" 
                                  : "bg-gray-400"
                              )} />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold truncate">
                                {getChatName(chat)}
                              </h4>
                              <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                {formatDistanceToNow(new Date(chat.updated_at), { addSuffix: true })}
                              </span>
                            </div>

                            <div className="flex items-center justify-between mt-1">
                              <p className={cn(
                                "text-sm truncate flex-1",
                                chat.unread_count > 0 ? "font-medium" : "text-muted-foreground"
                              )}>
                                {getLastMessagePreview(chat)}
                              </p>
                              {chat.unread_count > 0 && (
                                <Badge className="ml-2 shrink-0">
                                  {chat.unread_count}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calls">
          <Card>
            <CardHeader>
              <CardTitle>Call History</CardTitle>
              <CardDescription>
                View all your past calls
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentCalls.length === 0 ? (
                <div className="text-center py-8">
                  <Phone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No calls yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start a call with your contacts
                  </p>
                  <Button asChild>
                    <Link href="/call/setup?type=audio">Start a Call</Link>
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {recentCalls.map((call) => {
                      const CallIcon = getCallIcon(call);
                      const DirectionIcon = getCallDirectionIcon(call.direction);
                      
                      return (
                        <div
                          key={call.id}
                          className="flex items-center space-x-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={call.with.profile_image} />
                            <AvatarFallback>
                              {call.with.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">
                                {call.with.username}
                              </h4>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(call.started_at), 'MMM d, h:mm a')}
                              </span>
                            </div>

                            <div className="flex items-center space-x-3 mt-1">
                              <div className="flex items-center space-x-1">
                                <DirectionIcon className={cn(
                                  "h-3 w-3",
                                  getCallStatusColor(call.status)
                                )} />
                                <CallIcon className="h-3 w-3" />
                              </div>
                              
                              <span className="text-xs text-muted-foreground">
                                {call.status === 'completed' 
                                  ? formatDuration(call.duration)
                                  : call.status.charAt(0).toUpperCase() + call.status.slice(1)
                                }
                              </span>

                              {call.type === 'video' && (
                                <Badge variant="outline" className="text-[10px] h-4">
                                  Video
                                </Badge>
                              )}
                            </div>
                          </div>

                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/call/setup?type=${call.type}&user=${call.with.id}`}>
                              <Phone className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <UserPlus className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Add Contacts</h3>
                <p className="text-sm text-muted-foreground">
                  Find and connect with friends
                </p>
              </div>
              <Button variant="ghost" size="icon" asChild>
                <Link href="/contacts">
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Video className="h-6 w-6 text-green-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Start Video Call</h3>
                <p className="text-sm text-muted-foreground">
                  Face-to-face conversation
                </p>
              </div>
              <Button variant="ghost" size="icon" asChild>
                <Link href="/call/setup?type=video">
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Schedule Call</h3>
                <p className="text-sm text-muted-foreground">
                  Plan a call for later
                </p>
              </div>
              <Button variant="ghost" size="icon">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}