// app/call/[callId]/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCall } from '@/hooks/useCall';
import { useSocket } from '@/hooks/useSocket';
import { VideoGrid } from '@/components/calls/VideoGrid';
import { CallControls } from '@/components/calls/CallControls';
import { AudioIndicator } from '@/components/calls/AudioIndicator';
import { IncomingCallModal } from '@/components/calls/IncomingCallModal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, 
  Wifi, 
  WifiOff, 
  Network,
  Radio,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CallPage() {
  const params = useParams();
  const router = useRouter();
  const callId = params.callId as string;
  const callIdNumber = parseInt(callId, 10);
  
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { isConnected } = useSocket();
  const {
    activeCall,
    participants,
    localStream,
    remoteStreams,
    isCallActive,
    isJoining,
    isMuted,
    hasVideo,
    isLoading,
    error,
    callStats,
    joinCall,
    leaveCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera,
    toggleSpeaker,
    kickParticipant,
    muteParticipant,
    isInitiator,
    clearError
  } = useCall(callIdNumber);
  
  const [callDuration, setCallDuration] = useState(0);
  const [showParticipants, setShowParticipants] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'fair' | 'poor'>('good');
  const [showIncomingModal, setShowIncomingModal] = useState(false);
  const hasJoinedRef = useRef(false);

  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check authentication
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Join call automatically - only attempt once
  useEffect(() => {
    if (isAuthenticated && callIdNumber && !activeCall && !isLoading && !isJoining && !hasJoinedRef.current) {
      console.log('Auto-joining call:', callIdNumber);
      hasJoinedRef.current = true;
      joinCall(callIdNumber).catch((error) => {
        // If call is not active (completed, rejected, etc.), redirect back to chat immediately without logging error
        if (error.message?.includes('not active') || error.message?.includes('completed')) {
          router.push('/dashboard/chat');
        } else {
          console.error('Failed to join call:', error);
        }
      });
    }
  }, [isAuthenticated, callIdNumber, activeCall, isLoading, isJoining, joinCall, router]);

  // Start call duration timer
  useEffect(() => {
    if (isCallActive && activeCall) {
      const startTime = new Date(activeCall.started_at || Date.now()).getTime();
      
      durationIntervalRef.current = setInterval(() => {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        setCallDuration(duration);
      }, 1000);
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [isCallActive, activeCall]);

  // Monitor connection quality
  useEffect(() => {
    if (!callStats) return;

    const { packetLoss, jitter, roundTripTime } = callStats;
    
    if (packetLoss > 0.1 || jitter > 100 || roundTripTime > 300) {
      setConnectionQuality('poor');
    } else if (packetLoss > 0.05 || jitter > 50 || roundTripTime > 150) {
      setConnectionQuality('fair');
    } else {
      setConnectionQuality('good');
    }
  }, [callStats]);

  // Handle call end
  useEffect(() => {
    if (!activeCall && !isLoading && !isJoining && isAuthenticated) {
      router.push('/dashboard/chat');
    }
  }, [activeCall, isLoading, isJoining, isAuthenticated, router]);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getQualityDisplay = () => {
    switch (connectionQuality) {
      case 'good':
        return { icon: Wifi, color: 'text-green-500', bg: 'bg-green-500/10' };
      case 'fair':
        return { icon: Network, color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
      case 'poor':
        return { icon: WifiOff, color: 'text-red-500', bg: 'bg-red-500/10' };
    }
  };

  const QualityIcon = getQualityDisplay().icon;

  if (authLoading || (isLoading && !activeCall)) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="text-center space-y-4">
          <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
          <p className="text-white text-lg">Joining call...</p>
          <p className="text-white/60 text-sm">Setting up audio and video</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <Card className="max-w-md p-8 text-center">
          <div className="h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <WifiOff className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Call Error</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="space-x-4">
            <Button onClick={() => router.push('/dashboard/chat')}>Back to Chats</Button>
            <Button variant="outline" onClick={clearError}>Try Again</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!activeCall) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <Card className="max-w-md p-8 text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Waiting for call...</h2>
          <p className="text-muted-foreground">Connecting to call {callId}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-black text-white">
      {/* Connection status bar */}
      <div className="bg-black/50 backdrop-blur-sm border-b border-white/10 px-4 py-2">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Badge 
              variant="outline" 
              className={cn(
                "border-white/20",
                isConnected ? "text-green-500" : "text-red-500"
              )}
            >
              {isConnected ? (
                <>
                  <Radio className="h-3 w-3 mr-1 animate-pulse" />
                  Connected
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 mr-1" />
                  Reconnecting...
                </>
              )}
            </Badge>

            <div className={cn(
              "flex items-center space-x-2 px-2 py-1 rounded-full",
              getQualityDisplay().bg
            )}>
              <QualityIcon className={cn("h-3 w-3", getQualityDisplay().color)} />
              <span className={cn("text-xs", getQualityDisplay().color)}>
                {connectionQuality.charAt(0).toUpperCase() + connectionQuality.slice(1)} connection
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Clock className="h-4 w-4 text-white/60" />
            <span className="font-mono">{formatDuration(callDuration)}</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <VideoGrid
            participants={participants}
            localStream={localStream}
            remoteStreams={remoteStreams}
            isMuted={isMuted}
            hasVideo={hasVideo}
            onToggleMute={toggleMute}
            onToggleVideo={toggleVideo}
          />

          <div className="absolute top-4 left-4 flex space-x-2">
            {participants.map((participant) => (
              <AudioIndicator
                key={participant.user.id}
                stream={remoteStreams.get(participant.user.id) || null}
                isSpeaking={participant.is_speaking || false}
                size="sm"
                className="bg-black/50 backdrop-blur-sm"
              />
            ))}
          </div>
        </div>

        {/* Participants panel */}
        {showParticipants && (
          <div className="w-80 border-l border-white/10 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="p-4">
              <h3 className="font-semibold mb-4 flex items-center justify-between">
                Participants ({participants.length + 1})
                <Button variant="ghost" size="sm" onClick={() => setShowParticipants(false)}>
                  Close
                </Button>
              </h3>

              <div className="space-y-2">
                {/* Local participant */}
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <AudioIndicator stream={localStream} isSpeaking={false} size="sm" />
                    <div>
                      <p className="font-medium">You</p>
                      <div className="flex items-center space-x-2 mt-1">
                        {isMuted && <Badge variant="destructive">Muted</Badge>}
                        {!hasVideo && <Badge variant="secondary">Video Off</Badge>}
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="bg-white/10" />

                {participants.map((participant) => (
                  <div key={participant.user.id} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <AudioIndicator
                        stream={remoteStreams.get(participant.user.id) || null}
                        isSpeaking={participant.is_speaking || false}
                        size="sm"
                      />
                      <div>
                        <p className="font-medium">{participant.user.username}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          {participant.is_muted && <Badge variant="destructive">Muted</Badge>}
                          {!participant.has_video && <Badge variant="secondary">Video Off</Badge>}
                          {participant.is_speaking && <Badge variant="default" className="bg-green-500">Speaking</Badge>}
                        </div>
                      </div>
                    </div>

                    {isInitiator && participant.user.id !== user?.id && (
                      <Button variant="ghost" size="sm" onClick={() => muteParticipant(participant.user.id)}>
                        Mute
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {callStats && (
                <div className="mt-6 p-3 bg-white/5 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Call Statistics</h4>
                  <div className="space-y-1 text-xs text-white/60">
                    <div className="flex justify-between"><span>Audio Level</span><span>{Math.round(callStats.audioLevel * 100)}%</span></div>
                    <div className="flex justify-between"><span>Video Bitrate</span><span>{callStats.videoBitrate} kbps</span></div>
                    <div className="flex justify-between"><span>Audio Bitrate</span><span>{callStats.audioBitrate} kbps</span></div>
                    <div className="flex justify-between"><span>Packet Loss</span><span>{(callStats.packetLoss * 100).toFixed(1)}%</span></div>
                    <div className="flex justify-between"><span>Jitter</span><span>{callStats.jitter} ms</span></div>
                    <div className="flex justify-between"><span>RTT</span><span>{callStats.roundTripTime} ms</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <CallControls
        isInitiator={isInitiator}
        participants={participants}
        isMuted={isMuted}
        hasVideo={hasVideo}
        isScreenSharing={false}
        isSpeakerEnabled={true}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={() => {}}
        onToggleSpeaker={toggleSpeaker}
        onEndCall={endCall}
        onLeaveCall={leaveCall}
        onKickParticipant={kickParticipant}
        onMuteParticipant={muteParticipant}
      />

      <IncomingCallModal open={showIncomingModal} onOpenChange={setShowIncomingModal} />
    </div>
  );
}