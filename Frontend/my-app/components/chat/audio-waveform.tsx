'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Download, Volume2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getMediaUrl } from '@/utils/helpers';

interface AudioWaveformProps {
  media: any;
  messageType?: string;
  isOwnMessage?: boolean;
}

// Global reference to currently playing audio element to stop other audios
let activeAudioElement: HTMLAudioElement | null = null;
let activeAudioPauseCallback: (() => void) | null = null;

const BAR_COUNT = 36;

export function AudioWaveform({ media, messageType, isOwnMessage }: AudioWaveformProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(media?.duration || 0);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [hasError, setHasError] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);

  const rawUrl = media?.url || media?.file_url || media?.file || '';
  const audioUrl = getMediaUrl(rawUrl);
  
  console.log('AudioWaveform props:', { media, messageType, isOwnMessage, rawUrl, audioUrl });

  // Generate deterministic pseudo peaks based on file ID / URL for fast fallback
  const generateFallbackPeaks = useCallback((count: number, seed: string) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const result: number[] = [];
    for (let i = 0; i < count; i++) {
      const pseudoRandom = Math.abs(Math.sin(hash + i * 1.5));
      const value = Math.max(0.18, Math.min(1.0, pseudoRandom * 0.85 + 0.15));
      result.push(value);
    }
    return result;
  }, []);

  // Fetch audio file & extract peak amplitudes using Web Audio API
  useEffect(() => {
    if (!audioUrl) {
      console.warn('No audio URL provided');
      return;
    }

    console.log('Loading audio from:', audioUrl);
    let isMounted = true;
    const fallback = generateFallbackPeaks(BAR_COUNT, String(media?.id || audioUrl));
    setPeaks(fallback);

    async function extractAudioPeaks() {
      try {
        const response = await fetch(audioUrl);
        if (!response.ok) {
          console.error('Failed to fetch audio:', response.status, response.statusText);
          return;
        }

        const arrayBuffer = await response.arrayBuffer();
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) {
          console.warn('AudioContext not supported');
          return;
        }

        const audioCtx = new AudioContextClass();
        const decodedData = await audioCtx.decodeAudioData(arrayBuffer);
        const channelData = decodedData.getChannelData(0);

        if (!isMounted) {
          audioCtx.close();
          return;
        }

        if (decodedData.duration && !duration) {
          setDuration(decodedData.duration);
          console.log('Audio duration:', decodedData.duration);
        }

        const samplesPerBar = Math.floor(channelData.length / BAR_COUNT);
        const extractedPeaks: number[] = [];

        for (let i = 0; i < BAR_COUNT; i++) {
          const start = i * samplesPerBar;
          let max = 0;
          for (let j = 0; j < samplesPerBar; j += 10) {
            const val = Math.abs(channelData[start + j] || 0);
            if (val > max) max = val;
          }
          extractedPeaks.push(Math.max(0.15, Math.min(1.0, max * 1.4)));
        }

        if (isMounted && extractedPeaks.length === BAR_COUNT) {
          setPeaks(extractedPeaks);
          console.log('Audio peaks extracted successfully');
        }
        audioCtx.close();
      } catch (err) {
        console.error('Error extracting audio peaks:', err);
        // Fallback peaks already set, ignore CORS or decode errors silently
      }
    }

    extractAudioPeaks();
    return () => { isMounted = false; };
  }, [audioUrl, media?.id, generateFallbackPeaks, duration]);

  // Handle Play/Pause
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      if (activeAudioElement === audio) {
        activeAudioElement = null;
        activeAudioPauseCallback = null;
      }
    } else {
      // Pause currently playing audio if another voice message was active
      if (activeAudioElement && activeAudioElement !== audio) {
        activeAudioElement.pause();
        if (activeAudioPauseCallback) {
          activeAudioPauseCallback();
        }
      }

      activeAudioElement = audio;
      activeAudioPauseCallback = () => setIsPlaying(false);

      setIsLoading(true);
      audio.playbackRate = playbackRate;
      audio.play()
        .then(() => {
          setIsPlaying(true);
          setIsLoading(false);
          setHasError(false);
        })
        .catch((err) => {
          console.error("Audio playback error:", err);
          setIsPlaying(false);
          setIsLoading(false);
          setHasError(true);
        });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) audioRef.current.currentTime = 0;
    if (activeAudioElement === audioRef.current) {
      activeAudioElement = null;
      activeAudioPauseCallback = null;
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration && !isNaN(audioRef.current.duration)) {
      setDuration(audioRef.current.duration);
    }
  };

  // Seek when clicking on waveform
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const container = waveformRef.current;
    if (!audio || !container || !duration) return;

    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = fraction * duration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Toggle playback speed (1x -> 1.5x -> 2x -> 1x)
  const cyclePlaybackRate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rates = [1, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || isNaN(bytes)) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const progressFraction = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const currentBarIndex = Math.floor(progressFraction * BAR_COUNT);

  return (
    <div className={cn(
      "flex flex-col gap-1.5 p-3 rounded-xl min-w-[240px] max-w-[320px] select-none transition-all",
      isOwnMessage
        ? "bg-primary-foreground/10 text-primary-foreground"
        : "bg-muted text-foreground border border-border/40 shadow-sm"
    )}>
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={hasError}
          onClick={togglePlay}
          className={cn(
            "h-10 w-10 rounded-full shrink-0 shadow-sm transition-transform active:scale-95",
            isOwnMessage
              ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {isLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : isPlaying ? (
            <Pause className="h-5 w-5 fill-current" />
          ) : (
            <Play className="h-5 w-5 fill-current ml-0.5" />
          )}
        </Button>

        {/* Waveform Visualizer */}
        <div
          ref={waveformRef}
          onClick={handleSeek}
          className="flex-1 flex items-center gap-[2.5px] h-9 cursor-pointer py-1 group relative"
        >
          {peaks.map((heightFraction, index) => {
            const isPlayed = index <= currentBarIndex;
            const barHeight = Math.max(4, Math.round(heightFraction * 32));

            return (
              <span
                key={index}
                style={{ height: `${barHeight}px` }}
                className={cn(
                  "w-[3px] rounded-full transition-all duration-150 group-hover:opacity-100",
                  isPlayed
                    ? (isOwnMessage ? "bg-primary-foreground" : "bg-primary")
                    : (isOwnMessage ? "bg-primary-foreground/35" : "bg-muted-foreground/30")
                )}
              />
            );
          })}
        </div>

        {/* Speed Selector */}
        <button
          type="button"
          onClick={cyclePlaybackRate}
          className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 transition-colors",
            isOwnMessage
              ? "bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground"
              : "bg-background/80 hover:bg-background text-muted-foreground border border-border/50"
          )}
        >
          {playbackRate}x
        </button>
      </div>

      {/* Footer Info: Current Time / Duration & File Size */}
      <div className="flex items-center justify-between text-[11px] font-mono px-0.5 opacity-80">
        <div className="flex items-center gap-1">
          {hasError ? (
            <span className="text-destructive flex items-center gap-1 text-[11px] font-sans">
              <AlertCircle className="h-3 w-3" /> Audio unplayable
            </span>
          ) : (
            <span>
              {isPlaying ? formatTime(currentTime) : (duration ? formatTime(duration) : '0:00')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {media?.file_size && (
            <span className="text-[11px] opacity-70">
              {formatFileSize(media.file_size)}
            </span>
          )}
          {audioUrl && (
            <a
              href={audioUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="hover:opacity-100 transition-opacity p-0.5"
              title="Download Audio"
            >
              <Download className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Hidden Native Audio Element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={handleLoadedMetadata}
        onError={() => setHasError(true)}
        preload="metadata"
        className="hidden"
      />
    </div>
  );
}
