'use client';

import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCall } from '@/hooks/useCall';
import { Phone, PhoneOff, Video, Mic, MicOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface IncomingCallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IncomingCallModal({ open, onOpenChange }: IncomingCallModalProps) {
  const { incomingCall, answerCall, rejectCall } = useCall();

  useEffect(() => {
    if (incomingCall) {
      onOpenChange(true);
    }
  }, [incomingCall, onOpenChange]);

  if (!incomingCall) return null;

  const callerProfile = incomingCall.initiated_by_info;
  const callerName = callerProfile?.display_name || callerProfile?.username || `User #${incomingCall.initiated_by}` || 'Unknown';
  const callerAvatar = callerProfile?.profile_image || '';
  const callType = incomingCall.call_type;
  const isVideoCall = callType === 'video';

  const handleAnswer = async () => {
    await answerCall();
    onOpenChange(false);
  };

  const handleReject = async () => {
    await rejectCall();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            Incoming {isVideoCall ? 'Video' : 'Audio'} Call
          </DialogTitle>
          <DialogDescription className="text-center">
            {callerName} is calling you
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6">
          {/* Caller info */}
          <div className="text-center">
            <Avatar className="h-24 w-24 mx-auto mb-4">
              <AvatarImage src={callerAvatar} />
              <AvatarFallback>
                {callerName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-xl font-semibold">{callerName}</h3>
            <div className="flex items-center justify-center space-x-2 mt-2">
              {isVideoCall ? (
                <Badge variant="secondary">
                  <Video className="h-3 w-3 mr-1" />
                  Video Call
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Mic className="h-3 w-3 mr-1" />
                  Audio Call
                </Badge>
              )}
            </div>
          </div>

          {/* Call duration indicator (simulated) */}
          <div className="w-full">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Ringing...</span>
              <span>00:30</span>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden mt-1">
              <div className="h-full bg-primary animate-pulse w-1/2" />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center space-x-4 w-full">
            <Button
              variant="destructive"
              size="lg"
              className="rounded-full h-14 w-14"
              onClick={handleReject}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>

            <Button
              variant="default"
              size="lg"
              className="rounded-full h-14 w-14 bg-green-600 hover:bg-green-700"
              onClick={handleAnswer}
            >
              {isVideoCall ? (
                <Video className="h-6 w-6" />
              ) : (
                <Phone className="h-6 w-6" />
              )}
            </Button>
          </div>

          {/* Quick actions */}
          <div className="flex items-center justify-center space-x-4 w-full pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                handleReject();
                // Optionally send a message
              }}
            >
              Decline with message
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}