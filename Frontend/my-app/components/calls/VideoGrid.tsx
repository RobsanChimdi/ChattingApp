import { useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Mic, MicOff, Video, VideoOff, User } from 'lucide-react';
import { useCall } from '@/hooks/useCall';
import type { CallParticipant } from '@/types';

interface VideoGridProps {
  participants: CallParticipant[];
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  isMuted: boolean;
  hasVideo: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
}

export function VideoGrid({
  participants,
  localStream,
  remoteStreams,
  isMuted,
  hasVideo,
  onToggleMute,
  onToggleVideo
}: VideoGridProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Set local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Set remote video streams
  useEffect(() => {
    remoteStreams.forEach((stream, userId) => {
      const videoElement = remoteVideoRefs.current.get(userId);
      if (videoElement) {
        videoElement.srcObject = stream;
      }
    });
  }, [remoteStreams]);

  const getParticipantDisplay = (participant: CallParticipant) => {
    return {
      name: participant.user.username,
      avatar: participant.user.profile_image,
      isMuted: participant.is_muted,
      hasVideo: participant.has_video,
      isSpeaking: false // Would be calculated from audio levels
    };
  };

  const getGridClass = (count: number) => {
    switch (count) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-2';
      case 3:
        return 'grid-cols-2';
      case 4:
        return 'grid-cols-2';
      default:
        return 'grid-cols-3';
    }
  };

  const allParticipants = [
    {
      id: 'local',
      user: { id: 'local', username: 'You' },
      is_muted: isMuted,
      has_video: hasVideo,
      stream: localStream
    },
    ...participants.map(p => ({
      ...p,
      stream: remoteStreams.get(p.user.id.toString())
    }))
  ].filter(p => p.user.id !== 'local' || hasVideo);

  const gridClass = getGridClass(allParticipants.length);

  return (
    <div className="relative h-full bg-black">
      {/* Video grid */}
      <div className={cn(
        "grid gap-2 p-2 h-full",
        gridClass,
        allParticipants.length === 1 && "grid-cols-1",
        allParticipants.length === 2 && "grid-cols-2",
        allParticipants.length === 3 && "grid-cols-2",
        allParticipants.length >= 4 && "grid-cols-2 lg:grid-cols-3"
      )}>
        {allParticipants.map((participant) => {
          const display = getParticipantDisplay(participant as CallParticipant);
          const isLocal = participant.id === 'local';
          const hasStream = !!participant.stream;

          return (
            <Card
              key={participant.id}
              className={cn(
                "relative overflow-hidden bg-muted/20 border-2",
                display.isSpeaking && "border-primary"
              )}
            >
              {/* Video element */}
              {hasStream && (participant.has_video || isLocal ? hasVideo : participant.has_video) ? (
                <video
                  ref={el => {
                    if (isLocal && el) {
                      localVideoRef.current = el;
                    } else if (!isLocal && el) {
                      remoteVideoRefs.current.set(participant.user.id.toString(), el);
                    }
                  }}
                  autoPlay
                  playsInline
                  muted={isLocal}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                /* Avatar fallback */
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={display.avatar} />
                    <AvatarFallback>
                      <User className="h-12 w-12" />
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}

              {/* Participant info overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-medium">
                      {display.name} {isLocal && '(You)'}
                    </span>
                    {display.isMuted && (
                      <Badge variant="destructive" className="h-5">
                        <MicOff className="h-3 w-3" />
                      </Badge>
                    )}
                  </div>
                  {!participant.has_video && !isLocal && (
                    <Badge variant="secondary" className="h-5">
                      <VideoOff className="h-3 w-3" />
                    </Badge>
                  )}
                </div>
              </div>

              {/* Connection indicator */}
              {!isLocal && (
                <div className="absolute top-2 right-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Controls overlay */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <div className="flex items-center space-x-4 bg-black/50 backdrop-blur-sm rounded-full px-6 py-3">
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="icon"
            onClick={onToggleMute}
            className="rounded-full"
          >
            {isMuted ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </Button>

          <Button
            variant={hasVideo ? "secondary" : "destructive"}
            size="icon"
            onClick={onToggleVideo}
            className="rounded-full"
          >
            {hasVideo ? (
              <Video className="h-5 w-5" />
            ) : (
              <VideoOff className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}