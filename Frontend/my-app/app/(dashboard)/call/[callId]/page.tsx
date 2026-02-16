'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { VideoGrid } from '@/components/calls/VideoGrid';
import { CallControls } from '@/components/calls/CallControls';
import { AudioIndicator } from '@/components/calls/AudioIndicator';
import { useCall } from '@/hooks/useCall';
import { useMedia } from '@/hooks/useMedia';
import { useWebRTC } from '@/hooks/useWebRTC';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  AlertCircle, 
  Users,
  Clock,
  Shield,
  Phone,
  Video as VideoIcon
} from 'lucide-react';
import { useCallStore } from '@/store/callStore';
import { CallLayout } from '@/components/layout/main-layout';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { ContactsList } from '@/components/sidebar/contacts-list';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

export default function CallPage() {
  const params = useParams();
  const router = useRouter();
  const callId = params.callId as string;
  
  const {
    activeCall,
    participants,
    localStream,
    remoteStreams,
    isCallActive,
    isMuted,
    hasVideo,
    isInitiator,
    isLoading,
    error,
    joinCall,
    leaveCall,
    endCall,
    toggleMute,
    toggleVideo,
    kickParticipant,
    muteParticipant,
    clearError,
  } = useCall(callId);

  const { stream: mediaStream, toggleAudio, toggleVideo: toggleMediaVideo } = useMedia();
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(true);
  const [showParticipants, setShowParticipants] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize media on mount
  useEffect(() => {
    if (!localStream && mediaStream) {
      useCallStore.getState().setLocalStream(mediaStream);
    }
  }, [localStream, mediaStream]);

  // Auto-join call on mount
  useEffect(() => {
    if (callId && !isCallActive && !isLoading) {
      joinCall(callId);
    }
  }, [callId, isCallActive, isLoading, joinCall]);

  // Start call timer
  useEffect(() => {
    if (isCallActive && activeCall?.started_at) {
      const startTime = new Date(activeCall.started_at).getTime();
      
      const updateTimer = () => {
        const now = new Date().getTime();
        const duration = Math.floor((now - startTime) / 1000);
        setCallDuration(duration);
      };

      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isCallActive, activeCall]);

  // Handle media toggles
  const handleToggleMute = useCallback(() => {
    toggleMute();
    toggleAudio();
  }, [toggleMute, toggleAudio]);

  const handleToggleVideo = useCallback(() => {
    toggleVideo();
    toggleMediaVideo();
  }, [toggleVideo, toggleMediaVideo]);

  const handleToggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        // Handle screen sharing stream
        setIsScreenSharing(true);
        
        screenStream.getVideoTracks()[0].addEventListener('ended', () => {
          setIsScreenSharing(false);
        });
      } else {
        // Stop screen sharing
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error('Screen sharing error:', error);
    }
  };

  const handleToggleSpeaker = () => {
    setIsSpeakerEnabled(!isSpeakerEnabled);
  };

  const handleLeaveCall = async () => {
    await leaveCall();
    router.push('/call');
  };

  const handleEndCall = async () => {
    await endCall();
    router.push('/call');
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto" />
          <p className="mt-4 text-lg">Joining call...</p>
          <p className="text-sm text-muted-foreground mt-2">
            Connecting to participants
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
          <div className="flex space-x-2 mt-4">
            <Button onClick={clearError} variant="outline">
              Try Again
            </Button>
            <Button onClick={() => router.push('/call')}>
              Back to Calls
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  if (!activeCall) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Call Not Available</h1>
          <p className="text-muted-foreground mb-6">
            The call has ended or you don't have permission to join.
          </p>
          <Button onClick={() => router.push('/call')}>
            Go Back to Calls
          </Button>
        </div>
      </div>
    );
  }

  // Sidebar content for call details
  const callSidebar = (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Call Details</h3>
      </div>
      
      <div className="p-4 space-y-4">
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Duration</span>
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDuration(callDuration)}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Type</span>
                <Badge variant={activeCall.call_type === 'video' ? 'default' : 'secondary'}>
                  {activeCall.call_type === 'video' ? (
                    <VideoIcon className="h-3 w-3 mr-1" />
                  ) : (
                    <Phone className="h-3 w-3 mr-1" />
                  )}
                  {activeCall.call_type}
                </Badge>
              </div>
              
              {activeCall.started_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Started</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activeCall.started_at), { addSuffix: true })}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Participants ({participants.length})</h4>
            <Badge variant="outline">{participants.length}</Badge>
          </div>
          
          <div className="space-y-2">
            {participants.map((participant) => (
              <div
                key={participant.user.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted"
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-xs font-medium">
                        {participant.user.username?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    {participant.is_muted && (
                      <div className="absolute -top-1 -right-1 h-4 w-4 bg-destructive rounded-full flex items-center justify-center">
                        <span className="text-[8px] text-white">M</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {participant.user.username}
                      {isInitiator && participant.user.id === 0 && ' (You)'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isInitiator ? 'Host' : 'Participant'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  {participant.has_video && (
                    <VideoIcon className="h-3 w-3 text-blue-500" />
                  )}
                  <Users className="h-3 w-3 text-green-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <CallLayout
      participants={
        <VideoGrid
          participants={participants}
          localStream={localStream}
          remoteStreams={remoteStreams}
          isMuted={isMuted}
          hasVideo={hasVideo}
          onToggleMute={handleToggleMute}
          onToggleVideo={handleToggleVideo}
        />
      }
      controls={
        <CallControls
          isInitiator={isInitiator}
          participants={participants.map(p => ({
            ...p,
            is_muted: p.is_muted || false,
            is_in_call: true,
            role: isInitiator ? 'Host' : 'Participant'
          }))}
          isMuted={isMuted}
          hasVideo={hasVideo}
          isScreenSharing={isScreenSharing}
          isSpeakerEnabled={isSpeakerEnabled}
          onToggleMute={handleToggleMute}
          onToggleVideo={handleToggleVideo}
          onToggleScreenShare={handleToggleScreenShare}
          onToggleSpeaker={handleToggleSpeaker}
          onEndCall={handleEndCall}
          onLeaveCall={handleLeaveCall}
          onKickParticipant={kickParticipant}
          onMuteParticipant={muteParticipant}
        />
      }
      sidebar={callSidebar}
      showSidebar={true}
      primaryView="grid"
    />
  );
}