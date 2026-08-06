import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  MoreVertical,
  Search,
  Phone,
  Video,
  Users,
  UserPlus,
  Settings,
  Trash2,
  Bell,
  BellOff,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import { useCall } from '@/hooks/useCall';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import type { ChatListItem } from '@/types';

interface ChatHeaderProps {
  chat: ChatListItem;
  onBack?: () => void;
}

export function ChatHeader({ chat, onBack }: ChatHeaderProps) {
  const { user } = useAuth();
  const { initiateCall } = useCall();
  const { leaveChat } = useChat();
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const participants = chat.participants_info ?? [];

  const getChatName = () => {
    if (chat.chat_type === 'private') {
      const otherUser = participants.find((p) => p.id !== user?.id);
      return otherUser?.username || otherUser?.display_name || 'Unknown User';
    }
    return chat.name || chat.display_name || 'Group Chat';
  };

  const getChatAvatar = () => {
    if (chat.chat_type === 'private') {
      const otherUser = participants.find((p) => p.id !== user?.id);
      return otherUser?.profile_image || chat.avatar || undefined;
    }
    return chat.avatar || undefined;
  };

  const getStatusText = () => {
    if (chat.chat_type === 'private') {
      const otherUser = participants.find((p) => p.id !== user?.id);
      return otherUser?.is_online ? 'Online' : 'Offline';
    }
    return `${participants.length} members`;
  };

  const handleAudioCall = async () => {
    console.log('Audio call button clicked for chat:', chat.id);
    try {
      const call = await initiateCall(chat.id, 'audio');
      console.log('Audio call initiated successfully:', call);
    } catch (error) {
      console.error('Failed to initiate audio call:', error);
    }
  };

  const handleVideoCall = async () => {
    console.log('Video call button clicked for chat:', chat.id);
    try {
      const call = await initiateCall(chat.id, 'video');
      console.log('Video call initiated successfully:', call);
    } catch (error) {
      console.error('Failed to initiate video call:', error);
    }
  };

  const handleLeaveChat = async () => {
    try {
      await leaveChat(chat.id);
      setIsLeaveDialogOpen(false);
      if (onBack) onBack();
    } catch (error) {
      console.error('Failed to leave chat:', error);
    }
  };

  return (
    <>
      <div className="border-b border-border/70 bg-gradient-to-r from-background via-background to-muted/35 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4 p-4">
          {/* Left section */}
          <div className="flex min-w-0 items-center gap-4">
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="h-9 w-9 rounded-full md:hidden"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}

            <div className="flex min-w-0 items-center gap-3">
              <div className="relative">
                <Avatar className="h-11 w-11 border-2 border-background shadow-sm ring-2 ring-border/60">
                  <AvatarImage src={getChatAvatar()} />
                  <AvatarFallback>
                    {getChatName().charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {chat.chat_type === 'private' && participants.find((p) => p.id !== user?.id)?.is_online && (
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-base font-semibold text-foreground">{getChatName()}</h2>
                  {chat.chat_type === 'group' && (
                    <Badge variant="secondary" className="h-5 rounded-full px-2 text-[11px]">
                      <Users className="h-3 w-3 mr-1" />
                      Group
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {getStatusText()}
                </p>
              </div>
            </div>
          </div>

          {/* Right section */}
          <div className="flex shrink-0 items-center gap-1.5">
            {isSearching ? (
              <div className="flex items-center gap-2 rounded-full border border-border/70 bg-background/90 px-2 shadow-sm">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search in chat..."
                  className="h-9 w-48 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSearching(false)}
                  className="h-8 w-8 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSearching(true)}
                  className="h-9 w-9 rounded-full hover:bg-accent/80"
                >
                  <Search className="h-4 w-4" />
                </Button>

                {chat.chat_type !== 'private' && (
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-accent/80">
                    <UserPlus className="h-4 w-4" />
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleAudioCall}
                  className="h-9 w-9 rounded-full hover:bg-accent/80"
                >
                  <Phone className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleVideoCall}
                  className="h-9 w-9 rounded-full hover:bg-accent/80"
                >
                  <Video className="h-4 w-4" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-accent/80">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => setIsSettingsDialogOpen(true)}>
                      <Settings className="h-4 w-4 mr-2" />
                      Chat Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Bell className="h-4 w-4 mr-2" />
                      Mute Notifications
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Media, Files & Links
                    </DropdownMenuItem>

                    {chat.chat_type === 'group' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Users className="h-4 w-4 mr-2" />
                          View Members
                        </DropdownMenuItem>
                      </>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setIsLeaveDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {chat.chat_type === 'private' ? 'Delete Chat' : 'Leave Group'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Leave/Delete Dialog */}
      <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {chat.chat_type === 'private' ? 'Delete Chat' : 'Leave Group'}
            </DialogTitle>
            <DialogDescription>
              {chat.chat_type === 'private'
                ? 'Are you sure you want to delete this chat? This action cannot be undone.'
                : 'Are you sure you want to leave this group? You will no longer receive messages.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsLeaveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleLeaveChat}
            >
              {chat.chat_type === 'private' ? 'Delete Chat' : 'Leave Group'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat Settings Dialog */}
      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chat Settings</DialogTitle>
            <DialogDescription>
              Manage your chat preferences and settings
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Chat info */}
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={getChatAvatar()} />
                <AvatarFallback>
                  {getChatName().charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{getChatName()}</h3>
                <p className="text-sm text-muted-foreground">
                  {chat.chat_type === 'private' ? 'Private Chat' : 'Group Chat'}
                </p>
              </div>
            </div>

            <Separator />

            {/* Notification settings */}
            <div className="space-y-4">
              <h4 className="font-medium">Notifications</h4>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Mute Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Stop receiving notifications from this chat
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  <BellOff className="h-4 w-4 mr-2" />
                  Mute
                </Button>
              </div>
            </div>

            <Separator />

            {/* Media section */}
            <div className="space-y-4">
              <h4 className="font-medium">Media & Files</h4>
              <Button variant="outline" className="w-full justify-start">
                <ImageIcon className="h-4 w-4 mr-2" />
                View All Media
              </Button>
            </div>

            {chat.chat_type === 'group' && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h4 className="font-medium">Group Settings</h4>
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    Manage Members
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Group Info
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}