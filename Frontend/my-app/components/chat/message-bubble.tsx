// components/chat/MessageBubble.tsx
'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMessages } from '@/hooks/useMessage'; // FIXED: changed from useMessage
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Check, CheckCheck, Clock, Download, File, MoreVertical, Reply, Copy, Forward, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AudioWaveform } from './audio-waveform';
import { getMediaUrl, isAudioMedia } from '@/utils/helpers';
import type { Message } from '@/types';
import type { ChatType } from '@/types/chat.types';

interface MessageBubbleProps {
  message: Message;
  chatType: ChatType;
  isSelected?: boolean;
}

export function MessageBubble({ message, chatType, isSelected }: MessageBubbleProps) {
  const { user } = useAuth();
  const { selectMessage, setReplyTo, canEditMessage, canDeleteMessage, editMessage, deleteMessage, forwardMessage } = useMessages();
  
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || '');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const isOwnMessage = message.sender === user?.id;
  const isDeleted = message.is_deleted;
  const hasMedia = message.media && message.media.length > 0;
  const isForwarded = message.is_forwarded;
  const hasReply = message.reply_to && message.reply_to_info;

  console.log('MessageBubble rendering:', { 
    message, 
    message_type: message.message_type, 
    hasMedia, 
    media: message.media,
    isOwnMessage 
  });

  const handleEdit = async () => {
    if (editText.trim() && editText !== message.text) {
      await editMessage(message.id, editText);
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await deleteMessage(message.id);
  };

  const handleCopy = () => {
    const textToCopy = message.text || '';
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
    }
  };

  const handleForward = async () => {
    const targetChatId = prompt('Enter target chat ID:');
    if (targetChatId) await forwardMessage(parseInt(targetChatId, 10));
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

  const getThumbnailUrl = (media: any) => {
    const rawUrl = media.thumbnail_url || media.thumbnail || '';
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
              onClick={() => window.open(mediaUrl, '_blank')}
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
            <Button size="icon" variant="ghost" onClick={() => window.open(mediaUrl, '_blank')}>
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

      <div className="max-w-[70%] space-y-1">
        {isForwarded && (
          <div className="flex items-center text-xs text-muted-foreground">
            <Forward className="h-3 w-3 mr-1" />
            Forwarded
          </div>
        )}
        
        {hasReply && message.reply_to_info && (
          <div className="px-3 py-2 rounded-lg text-sm border-l-4 bg-muted/50 border-primary">
            <p className="font-medium text-xs">{message.reply_to_info.sender_info?.username}</p>
            <p className="text-xs truncate">{message.reply_to_info.summary}</p>
          </div>
        )}

        <div className="relative">
          <div className={cn(
            "rounded-2xl",
            // Audio-only messages get minimal padding so the player fills the bubble
            message.message_type === 'audio' && hasMedia && !message.text
              ? 'p-0 overflow-hidden'
              : 'px-4 py-2',
            isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted", 
            isSelected && "ring-2 ring-primary"
          )}>
            {!isOwnMessage && chatType === 'group' && (
              <p className="font-medium text-xs mb-1">{message.sender_info?.username}</p>
            )}
            
            {hasMedia && renderMedia()}
            
            {message.text && !isEditing && (
              <p className="whitespace-pre-wrap break-words">{message.text}</p>
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
              <div className="flex flex-wrap gap-1 mt-2">
                {message.reactions.map((reaction) => (
                  <Badge key={reaction.id} variant="secondary" className="text-xs">
                    {reaction.emoji}
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
              "absolute flex items-center space-x-1 -top-2 z-50", 
              isOwnMessage ? "right-2" : "left-2"
            )}>
              <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="secondary" className="h-6 w-6 shadow-md">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isOwnMessage ? "end" : "start"} className="z-[100] w-48">
                  <DropdownMenuItem onClick={() => setReplyTo(message)}>
                    <Reply className="h-4 w-4 mr-2" />Reply
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopy}>
                    <Copy className="h-4 w-4 mr-2" />Copy
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleForward}>
                    <Forward className="h-4 w-4 mr-2" />Forward
                  </DropdownMenuItem>
                  {isOwnMessage && canEditMessage(message) && (
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Edit className="h-4 w-4 mr-2" />Edit
                    </DropdownMenuItem>
                  )}
                  {isOwnMessage && (
                    <>
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
    </div>
  );
}