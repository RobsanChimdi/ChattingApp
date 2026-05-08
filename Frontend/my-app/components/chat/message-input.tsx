// components/chat/MessageInput.tsx
'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useMessages } from '@/hooks/useMessage';
import { useChat } from '@/hooks/useChat';
import { Smile, Paperclip, Mic, Send, X } from 'lucide-react';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  disabled?: boolean;
  chatId?: number;
}

export function MessageInput({ value, onChange, onSend, onKeyPress, disabled, chatId }: MessageInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { uploadMedia, replyToMessage, setReplyTo } = useMessages(chatId);
  const { startTyping, stopTyping } = useChat(chatId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTyping = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    if (e.target.value.length === 1) startTyping();
    else if (e.target.value.length === 0) stopTyping();
  }, [onChange, startTyping, stopTyping]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyPress(e);
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      stopTyping();
      onSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) await uploadMedia(files[i]);
    } catch (error) { console.error('Failed to upload files:', error);
    } finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleStartRecording = () => setIsRecording(true);
  const handleStopRecording = () => setIsRecording(false);

  return (
    <div className="space-y-2">
      {replyToMessage && (
        <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium">Replying to {replyToMessage.sender_info?.username}</p>
            <p className="text-xs text-muted-foreground truncate">{replyToMessage.reply_to_info?.summary || 'Message'}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setReplyTo(null)}><X className="h-4 w-4" /></Button>
        </div>
      )}

      <div className="flex items-end space-x-2">
        <Button variant="ghost" size="icon" disabled={disabled || isUploading} onClick={() => fileInputRef.current?.click()}>
          {isUploading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /> : <Paperclip className="h-5 w-5" />}
        </Button>
        <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*,video/*,.pdf,.doc,.docx,.txt" onChange={handleFileSelect} />
        <Button variant="ghost" size="icon" disabled={disabled}><Smile className="h-5 w-5" /></Button>
        <div className="flex-1 relative"><Textarea value={value} onChange={handleTyping} onKeyDown={handleKeyDown} placeholder="Type a message..." className="min-h-[40px] max-h-[120px] resize-none" disabled={disabled} rows={1} /></div>
        {value.trim() || isRecording ? (
          <Button size="icon" onClick={onSend} disabled={disabled || !value.trim()}><Send className="h-5 w-5" /></Button>
        ) : (
          <Button variant="ghost" size="icon" onClick={isRecording ? handleStopRecording : handleStartRecording} disabled={disabled} className={isRecording ? "text-destructive animate-pulse" : ""}><Mic className="h-5 w-5" /></Button>
        )}
      </div>
    </div>
  );
}