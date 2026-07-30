// components/chat/voice-message-player.tsx
'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceMessagePlayerProps {
  audioUrl: string;
  isOwnMessage?: boolean;
  initialDuration?: number;
  fileName?: string;
  mediaId: string | number;
}

// ─── Global singleton to stop other audio when a new one plays ───────────────
type StopFn = () => void;
const globalPlayers = new Set<StopFn>();
function registerPlayer(stopFn: StopFn): () => void {
  globalPlayers.add(stopFn);
  return () => globalPlayers.delete(stopFn);
}
function stopAllExcept(except: StopFn) {
  globalPlayers.forEach(fn => { if (fn !== except) fn(); });
}
// ─────────────────────────────────────────────────────────────────────────────

const BAR_COUNT = 40;

function generateFallbackPeaks(seed: number): number[] {
  const peaks: number[] = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    const v = Math.abs(Math.sin(i * 0.63 + seed) * 0.45 + Math.cos(i * 1.1 + seed * 0.5) * 0.3 + 0.35);
    peaks.push(Math.max(0.12, Math.min(0.95, v)));
  }
  return peaks;
}

export function VoiceMessagePlayer({
  audioUrl,
  isOwnMessage = false,
  initialDuration = 0,
  mediaId,
}: VoiceMessagePlayerProps) {
  const [isPlaying, setIsPlaying]       = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [currentTime, setCurrentTime]   = useState(0);
  const [duration, setDuration]         = useState(initialDuration);
  const [speed, setSpeed]               = useState<1 | 1.5 | 2>(1);
  const [peaks, setPeaks]               = useState<number[]>([]);
  const [hasError, setHasError]         = useState(false);

  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const isDragging  = useRef(false);

  const numericSeed = useMemo(() =>
    typeof mediaId === 'number' ? mediaId : (mediaId ? String(mediaId).split('').reduce((a, c) => a + c.charCodeAt(0), 0) : 42),
    [mediaId]
  );

  // ── Initialise with fallback peaks immediately ──────────────────────────
  useEffect(() => {
    setPeaks(generateFallbackPeaks(numericSeed));
  }, [numericSeed]);

  // ── Try to extract real peaks via Web Audio API ─────────────────────────
  useEffect(() => {
    if (!audioUrl) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(audioUrl, { mode: 'cors' });
        if (!res.ok || cancelled) return;
        const buf = await res.arrayBuffer();
        if (cancelled) return;
        const AudioCtx: typeof AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        ctx.decodeAudioData(buf, decoded => {
          if (cancelled) { ctx.close(); return; }
          const raw = decoded.getChannelData(0);
          const step = Math.floor(raw.length / BAR_COUNT);
          const realPeaks: number[] = [];
          for (let i = 0; i < BAR_COUNT; i++) {
            let mx = 0;
            for (let j = 0; j < step; j += 4) {
              const v = Math.abs(raw[i * step + j] ?? 0);
              if (v > mx) mx = v;
            }
            realPeaks.push(Math.max(0.08, Math.min(1, mx * 2)));
          }
          if (!cancelled) setPeaks(realPeaks);
          if (!cancelled && decoded.duration && !duration) setDuration(decoded.duration);
          ctx.close();
        }, () => ctx.close());
      } catch { /* keep fallback */ }
    })();

    return () => { cancelled = true; };
  }, [audioUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Register with global player manager ────────────────────────────────
  useEffect(() => {
    const myStop: StopFn = () => {
      audioRef.current?.pause();
      setIsPlaying(false);
    };
    return registerPlayer(myStop);
  }, []);

  // ── Derived progress ────────────────────────────────────────────────────
  const progress = duration > 0 ? currentTime / duration : 0;

  // ── Play / Pause ────────────────────────────────────────────────────────
  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || hasError) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      const myStop: StopFn = () => { audio.pause(); setIsPlaying(false); };
      stopAllExcept(myStop); // pause every other player
      setIsLoading(true);
      try {
        audio.playbackRate = speed;
        await audio.play();
        setIsPlaying(true);
      } catch (e) {
        console.error('Audio play error:', e);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    }
  }, [isPlaying, speed, hasError]);

  // ── Speed cycle ─────────────────────────────────────────────────────────
  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  // ── Waveform seek ───────────────────────────────────────────────────────
  const seek = useCallback((clientX: number) => {
    const el = waveformRef.current;
    const audio = audioRef.current;
    if (!el || !audio || !duration) return;
    const rect = el.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    audio.currentTime = frac * duration;
    setCurrentTime(frac * duration);
  }, [duration]);

  const onMouseDown = (e: React.MouseEvent) => { isDragging.current = true; seek(e.clientX); };
  const onMouseMove = (e: React.MouseEvent) => { if (isDragging.current) seek(e.clientX); };
  const onMouseUp   = () => { isDragging.current = false; };

  // Touch support
  const onTouchStart = (e: React.TouchEvent) => { isDragging.current = true; seek(e.touches[0].clientX); };
  const onTouchMove  = (e: React.TouchEvent) => { if (isDragging.current) seek(e.touches[0].clientX); };
  const onTouchEnd   = () => { isDragging.current = false; };

  const fmt = (s: number) => {
    if (!s || isNaN(s) || !isFinite(s)) return '0:00';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  const timeLabel = isPlaying || currentTime > 0 ? fmt(currentTime) : fmt(duration);

  return (
    <div className={cn(
      'flex items-center gap-2.5 px-3 py-2.5 rounded-2xl select-none w-full max-w-[320px]',
      isOwnMessage
        ? 'bg-primary text-primary-foreground'
        : 'bg-muted text-foreground border border-border/30',
    )}>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        crossOrigin="anonymous"
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => {
          const d = audioRef.current?.duration;
          if (d && isFinite(d)) setDuration(d);
        }}
        onEnded={() => { setIsPlaying(false); setCurrentTime(0); if (audioRef.current) audioRef.current.currentTime = 0; }}
        onError={() => setHasError(true)}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
      />

      {/* ── Play / Pause button ── */}
      <button
        type="button"
        onClick={togglePlay}
        disabled={hasError}
        className={cn(
          'flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-transform active:scale-90 shadow',
          isOwnMessage
            ? 'bg-white/90 text-primary hover:bg-white'
            : 'bg-primary text-primary-foreground hover:bg-primary/90',
          hasError && 'opacity-40 cursor-not-allowed',
        )}
      >
        {isLoading
          ? <Loader2 className="h-5 w-5 animate-spin" />
          : isPlaying
            ? <Pause className="h-5 w-5 fill-current" />
            : <Play  className="h-5 w-5 fill-current ml-0.5" />
        }
      </button>

      {/* ── Waveform + time ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">

        {/* Waveform bars */}
        <div
          ref={waveformRef}
          className="relative h-8 flex items-center gap-[2px] cursor-pointer"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {peaks.map((peak, i) => {
            const played = i / BAR_COUNT <= progress;
            const barH = Math.max(3, Math.round(peak * 28)); // px, max 28px

            return (
              <div
                key={i}
                style={{ height: `${barH}px`, width: '3px' }}
                className={cn(
                  'rounded-full flex-shrink-0 transition-colors duration-100',
                  played
                    ? isOwnMessage ? 'bg-white' : 'bg-primary'
                    : isOwnMessage ? 'bg-white/35' : 'bg-muted-foreground/30'
                )}
              />
            );
          })}
        </div>

        {/* Time + speed */}
        <div className="flex items-center justify-between">
          <span className={cn(
            'text-[11px] font-mono tabular-nums',
            isOwnMessage ? 'text-white/80' : 'text-muted-foreground'
          )}>
            {hasError ? 'Error' : timeLabel}
          </span>

          <button
            type="button"
            onClick={cycleSpeed}
            className={cn(
              'text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors',
              isOwnMessage
                ? 'text-white/80 hover:bg-white/20'
                : 'text-muted-foreground hover:bg-muted-foreground/15'
            )}
          >
            {speed}×
          </button>
        </div>
      </div>
    </div>
  );
}
