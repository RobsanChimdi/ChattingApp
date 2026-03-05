import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface AudioIndicatorProps {
  stream: MediaStream | null;
  isSpeaking: boolean;
  level?: number;
  size?: 'sm' | 'md' | 'lg';
  showLevel?: boolean;
  className?: string;
}

export function AudioIndicator({ 
  stream, 
  isSpeaking, 
  level = 0,
  size = 'md',
  showLevel = false,
  className 
}: AudioIndicatorProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationRef = useRef<number|undefined>(undefined);
  const [audioLevel, setAudioLevel] = useState(0);
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(new Uint8Array(0));

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-14 w-14'
  };

  const barCount = {
    sm: 4,
    md: 8,
    lg: 12
  };

  // Initialize audio analysis
  useEffect(() => {
    if (!stream || !stream.getAudioTracks().length) return;

    const setupAudioAnalysis = async () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);

        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        sourceRef.current = source;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        setFrequencyData(dataArray);

        const analyzeAudio = () => {
          if (!analyserRef.current) return;

          const analyser = analyserRef.current;
          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          
          analyser.getByteFrequencyData(dataArray);

          // Calculate average volume
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          const normalizedLevel = Math.min(average / 255, 1);
          
          setAudioLevel(normalizedLevel);
          setFrequencyData(dataArray);

          animationRef.current = requestAnimationFrame(analyzeAudio);
        };

        animationRef.current = requestAnimationFrame(analyzeAudio);
      } catch (error) {
        console.error('Failed to set up audio analysis:', error);
      }
    };

    setupAudioAnalysis();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (sourceRef.current && audioContextRef.current) {
        sourceRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stream]);

  // Calculate visual bars based on frequency data
  const getBarHeights = useCallback(() => {
    if (frequencyData.length === 0) {
      return Array(barCount[size]).fill(0);
    }

    const bars = [];
    const chunkSize = Math.floor(frequencyData.length / barCount[size]);
    
    for (let i = 0; i < barCount[size]; i++) {
      let sum = 0;
      const start = i * chunkSize;
      const end = start + chunkSize;
      
      for (let j = start; j < end; j++) {
        sum += frequencyData[j] || 0;
      }
      
      const average = sum / chunkSize;
      const normalizedHeight = Math.min(average / 255, 1);
      bars.push(normalizedHeight);
    }
    
    return bars;
  }, [frequencyData, size, barCount]);

  const barHeights = getBarHeights();
  const displayLevel = level > 0 ? level : audioLevel;
  const isActive = isSpeaking || displayLevel > 0.1;

  // Calculate color based on audio level
  const getColor = useCallback((level: number) => {
    if (level > 0.7) return 'bg-red-500';
    if (level > 0.4) return 'bg-yellow-500';
    return 'bg-green-500';
  }, []);

  // Calculate pulse intensity
  const getPulseIntensity = useCallback((level: number) => {
    return Math.min(level * 1.5, 1);
  }, []);

  if (!stream) {
    return (
      <div className={cn(
        "rounded-full bg-muted flex items-center justify-center",
        sizeClasses[size],
        className
      )}>
        <div className="h-2 w-2 rounded-full bg-muted-foreground/50" />
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Visualizer bars */}
      <div className={cn(
        "flex items-end justify-center space-x-0.5",
        size === 'sm' && "space-x-0.5",
        size === 'md' && "space-x-1",
        size === 'lg' && "space-x-1.5"
      )}>
        {barHeights.map((height, index) => (
          <div
            key={index}
            className={cn(
              "rounded-t transition-all duration-100",
              getColor(height),
              size === 'sm' && "w-0.5",
              size === 'md' && "w-1",
              size === 'lg' && "w-1.5"
            )}
            style={{
              height: `${Math.max(height * (size === 'sm' ? 12 : size === 'md' ? 24 : 36), 2)}px`
            }}
          />
        ))}
      </div>

      {/* Central indicator */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={cn(
          "rounded-full transition-all duration-300",
          isActive ? "bg-primary/20" : "bg-muted",
          isActive && "animate-pulse",
          size === 'sm' && "h-4 w-4",
          size === 'md' && "h-6 w-6",
          size === 'lg' && "h-8 w-8"
        )}>
          <div
            className={cn(
              "absolute inset-0 rounded-full transition-all duration-300",
              getColor(displayLevel),
              isActive && "animate-ping"
            )}
            style={{
              opacity: getPulseIntensity(displayLevel) * 0.5,
              transform: `scale(${1 + getPulseIntensity(displayLevel) * 0.5})`
            }}
          />
          <div
            className={cn(
              "absolute inset-0 rounded-full transition-all duration-300",
              getColor(displayLevel)
            )}
            style={{
              opacity: isActive ? 0.8 : 0,
              transform: `scale(${isActive ? 1 : 0})`
            }}
          />
        </div>
      </div>

      {/* Level display */}
      {showLevel && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <div className="flex items-center space-x-1">
            <div className="text-xs font-medium">
              {Math.round(displayLevel * 100)}%
            </div>
            <div className="h-1 w-12 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-300",
                  getColor(displayLevel)
                )}
                style={{ width: `${displayLevel * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Speaking indicator */}
      {isSpeaking && (
        <div className="absolute -top-2 -right-2">
          <div className="relative">
            <div className="absolute inset-0 bg-green-500 rounded-full animate-ping" />
            <div className="relative h-3 w-3 bg-green-500 rounded-full" />
          </div>
        </div>
      )}
    </div>
  );
}

// Hook for audio level monitoring
export function useAudioLevel(stream: MediaStream | null, updateInterval = 100) {
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (!stream || !stream.getAudioTracks().length) return;

    const setupAudioMonitoring = async () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);

        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.3;
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const monitorAudio = (timestamp: number) => {
          if (!analyserRef.current) return;

          // Throttle updates
          if (timestamp - lastUpdateRef.current < updateInterval) {
            animationRef.current = requestAnimationFrame(monitorAudio);
            return;
          }

          lastUpdateRef.current = timestamp;
          const analyser = analyserRef.current;
          analyser.getByteFrequencyData(dataArray);

          // Calculate RMS (root mean square) for better level detection
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sum / dataArray.length);
          const normalizedLevel = Math.min(rms / 255, 1);

          setAudioLevel(normalizedLevel);
          
          // Detect speaking (threshold can be adjusted)
          const isCurrentlySpeaking = normalizedLevel > 0.05;
          setIsSpeaking(isCurrentlySpeaking);

          animationRef.current = requestAnimationFrame(monitorAudio);
        };

        animationRef.current = requestAnimationFrame(monitorAudio);
      } catch (error) {
        console.error('Failed to set up audio monitoring:', error);
      }
    };

    setupAudioMonitoring();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stream, updateInterval]);

  return { audioLevel, isSpeaking };
}