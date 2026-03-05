import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  ScreenShare,
  ScreenShareOff,
  Users,
  Settings,
  Volume2,
  VolumeX,
  MessageSquare,
  Monitor,
  MonitorOff,
  MoreVertical,
  UserX
} from 'lucide-react';
import { useCall } from '@/hooks/useCall';
import { cn } from '@/lib/utils';

interface CallControlsProps {
  isInitiator: boolean;
  participants: any[];
  isMuted: boolean;
  hasVideo: boolean;
  isScreenSharing: boolean;
  isSpeakerEnabled: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleSpeaker: () => void;
  onEndCall: () => void;
  onLeaveCall: () => void;
  onKickParticipant: (userId: number) => void;
  onMuteParticipant: (userId: number) => void;
}

export function CallControls({
  isInitiator,
  participants,
  isMuted,
  hasVideo,
  isScreenSharing,
  isSpeakerEnabled,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleSpeaker,
  onEndCall,
  onLeaveCall,
  onKickParticipant,
  onMuteParticipant
}: CallControlsProps) {
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<any>(null);

  const handleEndCall = () => {
    if (isInitiator) {
      onEndCall();
    } else {
      onLeaveCall();
    }
  };

  return (
    <>
      <div className="bg-background/80 backdrop-blur-sm border-t">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left controls */}
            <div className="flex items-center space-x-2">
              <Button
                variant={isMuted ? "destructive" : "outline"}
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
                variant={hasVideo ? "outline" : "destructive"}
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

              <Button
                variant={isScreenSharing ? "default" : "outline"}
                size="icon"
                onClick={onToggleScreenShare}
                className="rounded-full"
              >
                {isScreenSharing ? (
                  <ScreenShareOff className="h-5 w-5" />
                ) : (
                  <ScreenShare className="h-5 w-5" />
                )}
              </Button>

              <Button
                variant={isSpeakerEnabled ? "outline" : "destructive"}
                size="icon"
                onClick={onToggleSpeaker}
                className="rounded-full"
              >
                {isSpeakerEnabled ? (
                  <Volume2 className="h-5 w-5" />
                ) : (
                  <VolumeX className="h-5 w-5" />
                )}
              </Button>
            </div>

            {/* Center controls */}
            <div className="flex items-center space-x-4">
              <Dialog open={isParticipantsOpen} onOpenChange={setIsParticipantsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Users className="h-4 w-4 mr-2" />
                    Participants
                    <Badge variant="secondary" className="ml-2">
                      {participants.length}
                    </Badge>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Participants</DialogTitle>
                    <DialogDescription>
                      {participants.length} people in this call
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {participants.map((participant) => (
                      <div
                        key={participant.user.id}
                        className="flex items-center justify-between p-3 hover:bg-muted rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                              <span className="font-medium">
                                {participant.user.username?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            {participant.is_muted && (
                              <Badge
                                variant="destructive"
                                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
                              >
                                <MicOff className="h-3 w-3" />
                              </Badge>
                            )}
                          </div>
                          <div>
                            <p className="font-medium">
                              {participant.user.username}
                              {participant.is_in_call && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  (in call)
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {participant.role}
                            </p>
                          </div>
                        </div>
                        {isInitiator && participant.user.id !== 'local' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => onMuteParticipant(participant.user.id)}
                              >
                                {participant.is_muted ? (
                                  <>
                                    <Mic className="h-4 w-4 mr-2" />
                                    Unmute
                                  </>
                                ) : (
                                  <>
                                    <MicOff className="h-4 w-4 mr-2" />
                                    Mute
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => onKickParticipant(participant.user.id)}
                              >
                                <UserX className="h-4 w-4 mr-2" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="outline" size="icon">
                <MessageSquare className="h-5 w-5" />
              </Button>
            </div>

            {/* Right controls */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsSettingsOpen(true)}
              >
                <Settings className="h-5 w-5" />
              </Button>

              <Button
                variant="destructive"
                size="icon"
                onClick={handleEndCall}
                className="rounded-full"
              >
                <PhoneOff className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Call Settings</DialogTitle>
            <DialogDescription>
              Adjust your call preferences and device settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium">Audio Settings</h4>
              <div className="space-y-2">
                <label className="text-sm font-medium">Input Device</label>
                <select className="w-full p-2 border rounded-md">
                  <option>Default Microphone</option>
                  <option>Microphone 2</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Output Device</label>
                <select className="w-full p-2 border rounded-md">
                  <option>Default Speakers</option>
                  <option>Headphones</option>
                </select>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Video Settings</h4>
              <div className="space-y-2">
                <label className="text-sm font-medium">Camera</label>
                <select className="w-full p-2 border rounded-md">
                  <option>Front Camera</option>
                  <option>Back Camera</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="hd" defaultChecked />
                <label htmlFor="hd" className="text-sm">
                  Enable HD Video
                </label>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Advanced</h4>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="noise" defaultChecked />
                <label htmlFor="noise" className="text-sm">
                  Noise Suppression
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="echo" defaultChecked />
                <label htmlFor="echo" className="text-sm">
                  Echo Cancellation
                </label>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}