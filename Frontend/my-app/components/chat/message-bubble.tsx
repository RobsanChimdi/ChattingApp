// components/chat/MessageBubble.tsx
'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useMessages } from '@/hooks/useMessage'; // FIXED: changed from useMessage
import { useAuth } from '@/hooks/useAuth';
import { useChatStore } from '@/store/chatStore';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Check, CheckCheck, Clock, Download, File, MoreVertical, Reply, Copy, Forward, Edit, Trash2, Smile } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AudioWaveform } from './audio-waveform';
import { getMediaUrl, isAudioMedia } from '@/utils/helpers';
import type { Message, MessageMedia } from '@/types';
import type { ChatType } from '@/types/chat.types';

interface MessageBubbleProps {
  message: Message;
  chatType: ChatType;
  chatId?: number;
  isSelected?: boolean;
}

export function MessageBubble({ message, chatType, chatId, isSelected }: MessageBubbleProps) {
  const { user } = useAuth();
  const { setReplyTo, canEditMessage, canDeleteMessage, editMessage, deleteMessage, forwardMessage, addReaction, removeReaction } = useMessages(chatId);

  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || '');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const chats = useChatStore(state => state.chats);

  const commonEmojis = [
    '👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🔥', '👏', '🙏',
    '😊', '😄', '😁', '😎', '🥳', '😜', '🤔', '😴', '😇', '💡',
    '💪', '🙌', '🎂', '🍕', '☕', '🌹', '🌈', '🚀', '🎵', '💯'
  ];

  const currentUserReaction = message.reactions?.find((reaction) => reaction.user === user?.id) ?? null;
  
  const isOwnMessage = message.sender_info?.id === user?.id || message.sender === user?.id;
  const isDeleted = message.is_deleted;
  const hasMedia = message.media && message.media.length > 0;
  const isForwarded = message.is_forwarded;
  const hasReply = message.reply_to && message.reply_to_info;

  console.log('MessageBubble rendering:', {
    message,
    message_type: message.message_type,
    hasMedia,
    media: message.media,
    isOwnMessage,
    userId: user?.id,
    messageSenderId: message.sender,
    canEdit: canEditMessage(message),
    canDelete: canDeleteMessage(message)
  });

  const handleEdit = async () => {
    console.log('handleEdit called for message:', message.id, 'text:', editText);
    if (editText.trim() && editText !== message.text) {
      try {
        await editMessage(message.id, editText);
        console.log('Edit successful');
      } catch (error) {
        console.error('Edit failed:', error);
      }
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    console.log('handleDelete called for message:', message.id);
    try {
      await deleteMessage(message.id);
      console.log('Delete successful');
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleCopy = () => {
    const textToCopy = message.text || '';
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      console.log('Text copied to clipboard');
    }
  };

  const handleForward = () => {
    console.log('handleForward called');
    setShowForwardDialog(true);
  };

  const handleForwardToChat = async (chatId: number) => {
    console.log('handleForwardToChat called for chat:', chatId);
    setShowForwardDialog(false);
    try {
      await forwardMessage(chatId);
      console.log('Forward successful');
    } catch (error) {
      console.error('Forward failed:', error);
    }
  };

  const handleDownload = (url: string, fileName: string) => {
    console.log('Download clicked for:', fileName);
    // Create a temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleToggleReaction = async (emoji: string) => {
    console.log('Toggling reaction:', emoji, 'on message:', message.id, 'currentUserReaction:', currentUserReaction?.emoji);
    try {
      if (currentUserReaction?.emoji === emoji) {
        await removeReaction(emoji, message.id);
      } else {
        await addReaction(emoji, message.id);
      }
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
    }
  };

  const renderStatusIcon = () => {
    if (!isOwnMessage) return null;
    const lastStatus = message.statuses?.slice(-1)[0]?.status;
    switch (lastStatus) {
      case 'sent': return <Check className="h-3 w-3 text-muted-foreground" />;
      case 'delivered': return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case 'read': return <CheckCheck className="h-3 w-3 text-blue-500" />;
      default: return <Clock className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getThumbnailUrl = (media: MessageMedia) => {
    const rawUrl = media.thumbnail || '';
    return getMediaUrl(rawUrl);
  };

  const renderMedia = () => {
    if (!hasMedia || !message.media) return null;
    return message.media.map((media) => {
      const mediaUrl = getMediaUrl(media);
      const thumbnailUrl = getThumbnailUrl(media);

      console.log('Rendering media:', { media, mediaUrl, message_type: message.message_type });

      // Detect audio by message_type OR mime_type OR file_type OR extension
      if (isAudioMedia(media, message.message_type)) {
        console.log('Rendering AudioWaveform for media:', media);
        return (
          <AudioWaveform
            key={media.id}
            media={media}
            messageType={message.message_type}
            isOwnMessage={isOwnMessage}
          />
        );
      } else if (media.mime_type?.startsWith('image/')) {
        return (
          <div key={media.id} className="relative group">
            <img 
              src={mediaUrl} 
              alt={media.file_name} 
              className="rounded-lg max-w-full max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity" 
              onClick={() => window.open(mediaUrl, '_blank')} 
            />
            <Button 
              size="icon" 
              variant="secondary" 
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" 
              onClick={() => window.open(mediaUrl, '_blank')}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        );
      } else if (media.mime_type?.startsWith('video/')) {
        return (
          <div key={media.id} className="relative group">
            <video
              src={mediaUrl}
              controls
              className="rounded-lg max-w-full max-h-64"
              poster={thumbnailUrl}
            />
            <Button
              size="icon"
              variant="secondary"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleDownload(mediaUrl, media.file_name || 'video')}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        );
      } else {
        return (
          <div key={media.id} className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
            <File className="h-6 w-6" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{media.file_name}</p>
              <p className="text-xs text-muted-foreground">{media.file_size ? `${(media.file_size / 1024 / 1024).toFixed(2)} MB` : 'Unknown size'}</p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => handleDownload(mediaUrl, media.file_name || 'file')}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        );
      }
    });
  };

  if (isDeleted) {
    return (
      <div className={cn("flex", isOwnMessage ? "justify-end" : "justify-start")}>
        <div className="max-w-[70%] px-4 py-2 rounded-lg text-sm italic text-muted-foreground bg-muted/50">
          Message deleted
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn("flex group", isOwnMessage ? "justify-end" : "justify-start")} 
      onMouseEnter={() => setIsHovered(true)} 
      onMouseLeave={() => setIsHovered(false)}
    >
      {!isOwnMessage && (
        <Avatar className="h-8 w-8 mt-1 mr-2">
          <AvatarImage src={message.sender_info?.profile_image} />
          <AvatarFallback>{message.sender_info?.username?.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
      )}

      <div className="max-w-[70%] space-y-1.5">
        {isForwarded && (
          <div className="flex items-center text-xs text-muted-foreground/90">
            <Forward className="h-3 w-3 mr-1" />
            Forwarded
          </div>
        )}
        
        {hasReply && message.reply_to_info && (
          <div className="px-3 py-2 rounded-xl text-sm border-l-4 bg-muted/60 border-primary shadow-sm">
            <p className="font-medium text-xs">{message.reply_to_info.sender_info?.username}</p>
            <p className="text-xs truncate text-muted-foreground">{message.reply_to_info.summary}</p>
          </div>
        )}

        <div className="relative">
          <div className={cn(
            "rounded-[22px] border border-border/60 shadow-[0_10px_30px_-16px_rgba(15,23,42,0.45)] backdrop-blur-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_16px_36px_-18px_rgba(15,23,42,0.55)]",
            // Audio-only messages get minimal padding so the player fills the bubble
            message.message_type === 'audio' && hasMedia && !message.text
              ? 'p-0 overflow-hidden'
              : 'px-4 py-2.5',
            isOwnMessage
              ? "bg-gradient-to-br from-primary to-primary/95 text-primary-foreground shadow-primary/10"
              : "bg-muted/90 text-foreground",
            isSelected && "ring-2 ring-primary/70 ring-offset-1 ring-offset-background"
          )}>
            {!isOwnMessage && chatType === 'group' && (
              <p className="font-medium text-xs mb-1">{message.sender_info?.username}</p>
            )}
            
            {hasMedia && renderMedia()}
            
            {message.text && !isEditing && (
              <p className="whitespace-pre-wrap break-words leading-6">{message.text}</p>
            )}
            
            {isEditing && (
              <div className="space-y-2">
                <textarea 
                  value={editText} 
                  onChange={(e) => setEditText(e.target.value)} 
                  className="w-full bg-background text-foreground rounded p-2" 
                  rows={3} 
                  autoFocus 
                />
                <div className="flex justify-end space-x-2">
                  <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleEdit}>Save</Button>
                </div>
              </div>
            )}
            
            {message.reactions && message.reactions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {message.reactions.map((reaction) => (
                  <Badge
                    key={reaction.id}
                    variant="secondary"
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full border cursor-pointer transition-all duration-150 hover:scale-105",
                      reaction.user === user?.id
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : isOwnMessage
                          ? "border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground"
                          : "border-border/70 bg-background/80 text-foreground"
                    )}
                    onClick={() => handleToggleReaction(reaction.emoji)}
                  >
                    <span className="mr-1">{reaction.emoji}</span>
                  </Badge>
                ))}
              </div>
            )}
            
            <div className={cn(
              "flex items-center justify-end space-x-2 mt-1 text-xs", 
              isOwnMessage ? "text-primary-foreground/80" : "text-muted-foreground"
            )}>
              <span>{format(new Date(message.created_at), 'HH:mm')}</span>
              {renderStatusIcon()}
            </div>
          </div>

          {(isHovered || isSelected || isMenuOpen) && !isEditing && (
            <div className={cn(
              "absolute flex items-center space-x-1 -top-3 z-50 transition-all duration-200",
              isOwnMessage ? "right-2" : "left-2"
            )}>
              <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                <PopoverTrigger asChild>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-7 w-7 rounded-full border border-border/60 bg-background/90 shadow-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    <Smile className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[260px] rounded-2xl border border-border/60 bg-popover/95 p-3 shadow-[0_18px_40px_-18px_rgba(15,23,42,0.55)] backdrop-blur-md"
                  align={isOwnMessage ? "end" : "start"}
                  side="top"
                  sideOffset={12}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Quick reactions</p>
                    <span className="text-[11px] text-muted-foreground">Tap to add</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {commonEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleToggleReaction(emoji)}
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-2xl transition-all duration-150 hover:scale-105 hover:bg-accent"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-7 w-7 rounded-full border border-border/60 bg-background/90 shadow-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isOwnMessage ? "end" : "start"} className="z-[100] w-48">
                  <DropdownMenuItem onClick={() => {
                    console.log('Reply clicked for message:', message.id);
                    setReplyTo(message);
                  }}>
                    <Reply className="h-4 w-4 mr-2" />Reply
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopy}>
                    <Copy className="h-4 w-4 mr-2" />Copy
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleForward}>
                    <Forward className="h-4 w-4 mr-2" />Forward
                  </DropdownMenuItem>
                  {isOwnMessage && (
                    <>
                      <DropdownMenuItem onClick={() => {
                        if (canEditMessage(message)) setIsEditing(true);
                      }}>
                        <Edit className="h-4 w-4 mr-2" />Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
                        <Trash2 className="h-4 w-4 mr-2" />Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
      {isOwnMessage && <div className="w-8" />}

      {/* Forward Dialog */}
      <Dialog open={showForwardDialog} onOpenChange={setShowForwardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Forward Message</DialogTitle>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {chats.filter(chat => chat.id !== message.chat).length === 0 ? (
              <p className="text-muted-foreground text-sm">No other chats available</p>
            ) : (
              chats.filter(chat => chat.id !== message.chat).map(chat => (
                <Button
                  key={chat.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleForwardToChat(chat.id)}
                >
                  <div className="flex items-center space-x-3">
                    {chat.display_image && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={chat.display_image} />
                        <AvatarFallback>{chat.name?.charAt(0) || 'C'}</AvatarFallback>
                      </Avatar>
                    )}
                    <div className="text-left">
                      <p className="font-medium">{chat.name || chat.display_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{chat.chat_type}</p>
                    </div>
                  </div>
                </Button>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForwardDialog(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}