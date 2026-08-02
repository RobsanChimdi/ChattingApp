import { useState, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMessages } from '@/hooks/useMessage';
import { useChat } from '@/hooks/useChat';
import { Smile, Paperclip, Mic, Send, X, Trash2, Search } from 'lucide-react';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  disabled?: boolean;
  chatId?: number;
}

const emojiCategories = [
  {
    name: 'Popular',
    emojis: ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👏', '🙏', '😊', '😄', '😁', '😎', '🥳', '😜', '🤔', '😴', '😇', '💡', '💪', '🙌', '🎂', '🍕', '☕', '🌈', '🚀', '🎵', '💯'],
  },
  {
    name: 'Smileys',
    emojis: ['😀', '😃', '😄', '😁', '😅', '🤣', '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🥺'],
  },
  {
    name: 'Animals',
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🦄', '🐲', '🐉', '🦋', '🐾', '🦌', '🦘', '🦔'],
  },
  {
    name: 'Food',
    emojis: ['🍕', '🍔', '🌮', '🍟', '🍦', '🍩', '🍰', '☕', '🍵', '🥤', '🍉', '🍓', '🍇', '🍎', '🍌', '🥝', '🥑', '🥐', '🍣', '🍜', '🍔', '🍞', '🧁'],
  },
  {
    name: 'Objects',
    emojis: ['🎁', '🎂', '🎈', '🎉', '🎵', '📱', '💻', '🎧', '🚀', '🌈', '💡', '⚽', '🏀', '🎯', '🧠', '🎮', '🏆', '🔔', '🔥', '💯', '📚', '💼', '🧰', '🪄'],
  },
  {
    name: 'Party',
    emojis: ['🎉', '🎊', '🎈', '🎂', '🎁', '🥳', '🎆', '🎇', '✨', '🎯', '🏆', '🎭'],
  },
  {
    name: 'Travel',
    emojis: ['🚗', '✈️', '🚀', '🚆', '🚄', '🛫', '🛬', '⛴️', '🚢', '🏖️', '🏕️', '🏔️', '🌋', '🏜️'],
  },
];

export function MessageInput({ value, onChange, onSend, onKeyPress, disabled, chatId }: MessageInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState('Popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentEmojis, setRecentEmojis] = useState<string[]>(['👍', '❤️', '😂', '🎉', '🔥', '😄', '🥳', '🚀']);
  const [audioLevels, setAudioLevels] = useState<number[]>([30, 50, 80, 40, 70, 90, 60, 40, 75, 55, 85, 45, 65, 95, 50, 30]);

  const visibleEmojiCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return emojiCategories;
    }

    return emojiCategories
      .map((category) => ({
        ...category,
        emojis: category.emojis.filter((emoji) => emoji.toLowerCase().includes(query) || category.name.toLowerCase().includes(query)),
      }))
      .filter((category) => category.emojis.length > 0);
  }, [searchQuery]);

  const activeEmojiCategory = visibleEmojiCategories.find((category) => category.name === selectedEmojiCategory) ?? visibleEmojiCategories[0] ?? emojiCategories[0];

  const { uploadMedia, replyToMessage, setReplyTo, sendMessage } = useMessages(chatId);
  const { startTyping, stopTyping } = useChat(chatId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const shouldSendRef = useRef<boolean>(true);

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
      // Don't call onSend() here - onKeyPress already handles it
    }
  };

  const insertEmoji = useCallback((emoji: string) => {
    const textarea = textareaRef.current;
    const cursorStart = textarea?.selectionStart ?? value.length;
    const cursorEnd = textarea?.selectionEnd ?? value.length;
    const nextValue = `${value.slice(0, cursorStart)}${emoji}${value.slice(cursorEnd)}`;

    setRecentEmojis((prev) => [emoji, ...prev.filter((item) => item !== emoji)].slice(0, 8));
    onChange(nextValue);
    setShowEmojiPicker(false);

    requestAnimationFrame(() => {
      textarea?.focus();
      const nextCursor = cursorStart + emoji.length;
      textarea?.setSelectionRange(nextCursor, nextCursor);
    });
  }, [onChange, value]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) await uploadMedia(files[i]);
    } catch (error) { 
      console.error('Failed to upload files:', error);
    } finally { 
      setIsUploading(false); 
      if (fileInputRef.current) fileInputRef.current.value = ''; 
    }
  };

  const startLiveAudioAnalysis = (stream: MediaStream) => {
    try {
      const AudioContextConstructor = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextConstructor) {
        return;
      }

      const audioCtx = new AudioContextConstructor();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevels = () => {
        analyser.getByteFrequencyData(dataArray);
        const levels: number[] = [];
        const barCount = 16;
        const step = Math.max(1, Math.floor(bufferLength / barCount));

        for (let i = 0; i < barCount; i++) {
          const val = dataArray[i * step] || 0;
          const heightPercent = Math.max(15, Math.min(100, (val / 255) * 100));
          levels.push(heightPercent);
        }
        setAudioLevels(levels);
        animFrameRef.current = requestAnimationFrame(updateLevels);
      };

      updateLevels();
    } catch (err) {
      console.warn('Audio analysis setup failed:', err);
    }
  };

  const stopLiveAudioAnalysis = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      shouldSendRef.current = true;
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        stopLiveAudioAnalysis();
        if (shouldSendRef.current && audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const audioFile = new File([audioBlob], `voice-message-${Date.now()}.webm`, { type: 'audio/webm' });
          
          setIsUploading(true);
          try {
            await sendMessage('', [audioFile]);
          } catch (error) {
            console.error('Failed to send voice message:', error);
          } finally {
            setIsUploading(false);
          }
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      startLiveAudioAnalysis(stream);
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const handleCancelRecording = () => {
    shouldSendRef.current = false;
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setRecordingTime(0);
    }
  };

  const handleSendRecording = () => {
    shouldSendRef.current = true;
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setRecordingTime(0);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
        <Button variant="ghost" size="icon" disabled={disabled || isUploading || isRecording} onClick={() => fileInputRef.current?.click()}>
          {isUploading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /> : <Paperclip className="h-5 w-5" />}
        </Button>
        <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*,video/*,.pdf,.doc,.docx,.txt,audio/*" onChange={handleFileSelect} />
        <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" disabled={disabled || isRecording}>
              <Smile className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[360px] rounded-3xl border border-border/60 bg-popover/95 p-3 shadow-[0_22px_50px_-20px_rgba(15,23,42,0.5)] backdrop-blur-md" align="start" side="top" sideOffset={12}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.18em]">Insert emoji</p>
              <span className="text-[11px] text-muted-foreground">Tap to add</span>
            </div>

            <div className="mb-3 flex items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-2.5 py-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search emoji..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>

            <div className="mb-3 rounded-xl border border-border/60 bg-muted/40 p-2">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[11px] font-medium text-muted-foreground">Recent</p>
                <span className="text-[10px] text-muted-foreground">Quick pick</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recentEmojis.map((emoji) => (
                  <button
                    key={`recent-${emoji}`}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-xl transition-all duration-150 hover:-translate-y-0.5 hover:scale-110 hover:bg-accent/80 active:scale-95"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-3 flex flex-wrap gap-1">
              {visibleEmojiCategories.map((category) => (
                <Button
                  key={category.name}
                  variant={selectedEmojiCategory === category.name ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => setSelectedEmojiCategory(category.name)}
                >
                  {category.name}
                </Button>
              ))}
            </div>
            <ScrollArea className="h-[240px]">
              {activeEmojiCategory.emojis.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground">
                  <p>No emoji found for “{searchQuery}”.</p>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {['smile', 'love', 'party', 'food', 'travel'].map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => setSearchQuery(term)}
                        className="rounded-full bg-accent/70 px-2.5 py-1 text-[11px] text-accent-foreground transition-all duration-150 hover:scale-105"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-6 gap-1.5">
                  {activeEmojiCategory.emojis.map((emoji, index) => (
                    <button
                      key={`${activeEmojiCategory.name}-${emoji}-${index}`}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-2xl transition-all duration-150 hover:-translate-y-0.5 hover:scale-110 hover:bg-accent/80 active:scale-95"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>
        
        <div className="flex-1 relative">
          {isRecording ? (
            <div className="flex items-center justify-between p-2 px-3 bg-destructive/10 border border-destructive/20 rounded-xl space-x-3">
              <div className="flex items-center space-x-2">
                <div className="h-2.5 w-2.5 bg-destructive rounded-full animate-ping" />
                <span className="text-xs font-mono font-medium text-destructive">{formatRecordingTime(recordingTime)}</span>
              </div>
              
              {/* Real-time mic waveform visualization */}
              <div className="flex items-center space-x-1 h-6 flex-1 justify-center max-w-[180px]">
                {audioLevels.map((lvl, idx) => (
                  <div
                    key={idx}
                    className="w-1 bg-destructive/70 rounded-full transition-all duration-75"
                    style={{ height: `${lvl}%` }}
                  />
                ))}
              </div>

              <span className="text-xs text-muted-foreground hidden sm:inline">Recording...</span>
            </div>
          ) : (
            <Textarea 
              ref={textareaRef}
              value={value} 
              onChange={handleTyping} 
              onKeyDown={handleKeyDown} 
              placeholder="Type a message..." 
              className="min-h-[40px] max-h-[120px] resize-none rounded-xl" 
              disabled={disabled} 
              rows={1} 
            />
          )}
        </div>

        {isRecording ? (
          <div className="flex items-center space-x-1">
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={handleCancelRecording} 
              className="text-destructive hover:bg-destructive/10"
              title="Cancel recording"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
            <Button 
              size="icon" 
              onClick={handleSendRecording} 
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              title="Send voice message"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        ) : value.trim() ? (
          <Button size="icon" onClick={onSend} disabled={disabled || !value.trim()}>
            <Send className="h-5 w-5" />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" onClick={handleStartRecording} disabled={disabled || isUploading} title="Record voice message">
            <Mic className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}