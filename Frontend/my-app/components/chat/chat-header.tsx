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
import type { Chat } from '@/types';

interface ChatHeaderProps {
  chat: Chat;
  onBack?: () => void;
}

export function ChatHeader({ chat, onBack }: ChatHeaderProps) {
  const { user } = useAuth();
  const { initiateCall } = useCall();
  const { leaveChat } = useChat();
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const getChatName = () => {
    if (chat.chat_type === 'private') {
      const otherUser = chat.participants.find(p => p.id !== user?.id);
      return otherUser?.username || 'Unknown User';
    }
    return chat.name || 'Group Chat';
  };

  const getChatAvatar = () => {
    if (chat.chat_type === 'private') {
      const otherUser = chat.participants.find(p => p.id !== user?.id);
      return otherUser?.profile_image;
    }
    return chat.icon;
  };

  const getStatusText = () => {
    if (chat.chat_type === 'private') {
      const otherUser = chat.participants.find(p => p.id !== user?.id);
      return otherUser?.is_online ? 'Online' : 'Offline';
    }
    return `${chat.participants.length} members`;
  };

  const handleAudioCall = async () => {
    try {
      await initiateCall(chat.id, 'audio');
    } catch (error) {
      console.error('Failed to initiate call:', error);
    }
  };

  const handleVideoCall = async () => {
    try {
      await initiateCall(chat.id, 'video');
    } catch (error) {
      console.error('Failed to initiate call:', error);
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
      <div className="border-b">
        <div className="flex items-center justify-between p-4">
          {/* Left section */}
          <div className="flex items-center space-x-4">
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="md:hidden"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={getChatAvatar()} />
                <AvatarFallback>
                  {getChatName().charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="font-semibold">{getChatName()}</h2>
                  {chat.chat_type === 'group' && (
                    <Badge variant="secondary" className="h-5">
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
          <div className="flex items-center space-x-1">
            {isSearching ? (
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Search in chat..."
                  className="h-9 w-48"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSearching(false)}
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
                >
                  <Search className="h-5 w-5" />
                </Button>
                
                {chat.chat_type !== 'private' && (
                  <Button variant="ghost" size="icon">
                    <UserPlus className="h-5 w-5" />
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleAudioCall}
                >
                  <Phone className="h-5 w-5" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleVideoCall}
                >
                  <Video className="h-5 w-5" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-5 w-5" />
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