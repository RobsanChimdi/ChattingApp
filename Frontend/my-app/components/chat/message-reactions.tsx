import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Smile,
  Heart,
  ThumbsUp,
  Laugh,
  Frown,
  Angry,
  X,
  Plus
} from 'lucide-react';

import { useMessages } from '@/hooks/useMessage';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import type { Message, MessageReaction as MessageReactionType } from '@/types';

interface MessageReactionsProps {
  message: Message;
  onReactionAdd?: (emoji: string) => void;
  onReactionRemove?: () => void;
  compact?: boolean;
}

const COMMON_REACTIONS = [
  { emoji: '👍', label: 'Like', icon: ThumbsUp },
  { emoji: '❤️', label: 'Love', icon: Heart },
  { emoji: '😂', label: 'Laugh', icon: Laugh },
  { emoji: '😢', label: 'Sad', icon: Frown },
  { emoji: '😠', label: 'Angry', icon: Angry },
];

const EMOJI_CATEGORIES = [
  { name: 'Frequently Used', emojis: ['👍', '❤️', '😂', '😮', '😢', '😠'] },
  { name: 'Smileys & People', emojis: ['😀', '😃', '😄', '😁', '😅', '🤣', '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'] },
  { name: 'Animals & Nature', emojis: ['🐵', '🐒', '🦍', '🦧', '🐶', '🐕', '🦮', '🐕‍🦺', '🐩', '🐺', '🦊', '🦝', '🐱', '🐈', '🐈‍⬛', '🦁', '🐯', '🐅', '🐆', '🐴', '🐎', '🦄', '🦓', '🦌', '🐮', '🐂', '🐃', '🐄', '🐷', '🐖', '🐗', '🐽', '🐏', '🐑', '🐐', '🐪', '🐫', '🦙', '🦒', '🐘', '🦏', '🦛', '🐭', '🐁', '🐀', '🐹', '🐰', '🐇', '🐿️', '🦔', '🦇', '🐻', '🐻‍❄️', '🐨', '🐼', '🦥', '🦦', '🦨', '🦘', '🦡', '🐾', '🦃', '🐔', '🐓', '🐣', '🐤', '🐥', '🐦', '🐧', '🕊️', '🦅', '🦆', '🦢', '🦉', '🦤', '🪶', '🦩', '🦚', '🦜', '🐸', '🐊', '🐢', '🦎', '🐍', '🐲', '🐉', '🦕', '🦖', '🐳', '🐋', '🐬', '🦭', '🐟', '🐠', '🐡', '🦈', '🐙', '🐚', '🐌', '🦋', '🐛', '🐜', '🐝', '🪲', '🐞', '🦗', '🪳', '🕷️', '🕸️', '🦂', '🦟', '🪰', '🪱', '🦠', '💐', '🌸', '💮', '🏵️', '🌹', '🥀', '🌺', '🌻', '🌼', '🌷', '🌱', '🪴', '🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃'] },
  { name: 'Food & Drink', emojis: ['🍇', '🍈', '🍉', '🍊', '🍋', '🍌', '🍍', '🥭', '🍎', '🍏', '🍐', '🍑', '🍒', '🍓', '🫐', '🥝', '🍅', '🫒', '🥥', '🥑', '🍆', '🥔', '🥕', '🌽', '🌶️', '🫑', '🥒', '🥬', '🥦', '🧄', '🧅', '🍄', '🥜', '🌰', '🍞', '🥐', '🥖', '🫓', '🥨', '🥯', '🥞', '🧇', '🧀', '🍖', '🍗', '🥩', '🥓', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🫔', '🥙', '🧆', '🥚', '🍳', '🥘', '🍲', '🫕', '🥣', '🥗', '🍿', '🧈', '🧂', '🥫', '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤', '🍥', '🥮', '🍡', '🥟', '🥠', '🥡', '🦀', '🦞', '🦐', '🦑', '🦪', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕', '🫖', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🥤', '🧃', '🧉', '🧊', '🥢', '🍽️', '🍴', '🥄'] },
];

export function MessageReactions({ 
  message, 
  onReactionAdd, 
  onReactionRemove,
  compact = false 
}: MessageReactionsProps) {
  const { user } = useAuth();
  const { addReaction, removeReaction } = useMessages();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Frequently Used');

  const userReaction = useMemo(() => {
    if (!message.reactions || !user) return null;
    return message.reactions.find((reaction) => reaction.user === user.id);
  }, [message.reactions, user]);

  const groupedReactions = useMemo(() => {
    if (!message.reactions) return {};
    
    return message.reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          users: []
        };
      }
      acc[reaction.emoji].count++;
      acc[reaction.emoji].users.push({
        id: reaction.user,
        username: reaction.user_info?.username || 'Unknown User',
        display_name: reaction.user_info?.display_name || 'Unknown User',
        profile_image: reaction.user_info?.profile_image,
      });
      return acc;
    }, {} as Record<string, { emoji: string; count: number; users: Array<{ id: number; username: string; display_name: string; profile_image?: string }> }>);
  }, [message.reactions]);

  const handleReactionClick = useCallback(async (emoji: string) => {
    if (userReaction?.emoji === emoji) {
      // Remove reaction if same emoji
      await removeReaction(emoji);
      onReactionRemove?.();
    } else {
      // Add or change reaction
      await addReaction(emoji);
      onReactionAdd?.(emoji);
    }
    setIsPickerOpen(false);
  }, [userReaction, addReaction, removeReaction, onReactionAdd, onReactionRemove]);

  const handleQuickReaction = useCallback(async (emoji: string) => {
    await handleReactionClick(emoji);
  }, [handleReactionClick]);

  const renderReactionBadge = useCallback((emoji: string, count: number, isUserReacted: boolean) => {
    return (
      <TooltipProvider key={emoji}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant={isUserReacted ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-all hover:scale-110",
                compact && "h-6 px-2 text-xs",
                isUserReacted && "bg-primary/10 text-primary border-primary"
              )}
              onClick={() => handleQuickReaction(emoji)}
            >
              <span className="mr-1">{emoji}</span>
              <span>{count}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">{emoji} Reactions</p>
              {groupedReactions[emoji]?.users.slice(0, 3).map(user => (
                <p key={user.id} className="text-xs">
                  {user.username}
                </p>
              ))}
              {groupedReactions[emoji]?.users.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  and {groupedReactions[emoji].users.length - 3} more
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }, [compact, groupedReactions, handleQuickReaction]);

  if (compact && (!message.reactions || message.reactions.length === 0)) {
    return null;
  }

  return (
    <div className={cn(
      "flex items-center gap-1 mt-2",
      compact && "flex-wrap"
    )}>
      {/* Quick reactions */}
      {compact ? (
        Object.entries(groupedReactions).map(([emoji, data]) => 
          renderReactionBadge(emoji, data.count, userReaction?.emoji === emoji)
        )
      ) : (
        <>
          {COMMON_REACTIONS.map(({ emoji, label, icon: Icon }) => {
            const reactionData = groupedReactions[emoji];
            const isUserReacted = userReaction?.emoji === emoji;
            
            return (
              <TooltipProvider key={emoji}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 relative transition-all hover:scale-110",
                        isUserReacted && "bg-primary/10 text-primary"
                      )}
                      onClick={() => handleQuickReaction(emoji)}
                    >
                      <span className="text-lg">{emoji}</span>
                      {reactionData && (
                        <span className="absolute -top-1 -right-1 text-xs bg-primary text-primary-foreground rounded-full h-4 w-4 flex items-center justify-center">
                          {reactionData.count}
                        </span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{label}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </>
      )}

      {/* Add reaction button */}
      <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 transition-all hover:scale-110",
              compact && "h-6 w-6"
            )}
          >
            {compact ? (
              <Plus className="h-3 w-3" />
            ) : (
              <Smile className="h-4 w-4" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-3">
            {/* Category tabs */}
            <div className="flex space-x-1 mb-3 overflow-x-auto">
              {EMOJI_CATEGORIES.map((category) => (
                <Button
                  key={category.name}
                  variant={selectedCategory === category.name ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs whitespace-nowrap"
                  onClick={() => setSelectedCategory(category.name)}
                >
                  {category.name}
                </Button>
              ))}
            </div>

            {/* Emoji grid */}
            <ScrollArea className="h-64">
              <div className="grid grid-cols-8 gap-1 p-1">
                {EMOJI_CATEGORIES
                  .find(cat => cat.name === selectedCategory)
                  ?.emojis.map((emoji) => (
                    <Button
                      key={emoji}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-lg hover:scale-110 transition-transform"
                      onClick={() => handleReactionClick(emoji)}
                    >
                      {emoji}
                    </Button>
                  ))}
              </div>
            </ScrollArea>

            {/* User's current reaction */}
            {userReaction && (
              <>
                <Separator className="my-3" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Your reaction: {userReaction.emoji}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReactionClick(userReaction.emoji)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              </>
            )}

            {/* All reactions summary */}
            {message.reactions && message.reactions.length > 0 && (
              <>
                <Separator className="my-3" />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">All Reactions</h4>
                  <div className="space-y-1">
                    {Object.entries(groupedReactions).map(([emoji, data]) => (
                      <div
                        key={emoji}
                        className="flex items-center justify-between p-2 hover:bg-muted rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-xl">{emoji}</span>
                          <Badge variant="secondary">{data.count}</Badge>
                        </div>
                        <div className="flex -space-x-2">
                          {data.users.slice(0, 3).map((user) => (
                            <Avatar key={user.id} className="h-6 w-6 border-2 border-background">
                              <AvatarImage src={user.profile_image} />
                              <AvatarFallback>
                                {user.username?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {data.users.length > 3 && (
                            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs">
                              +{data.users.length - 3}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}