// app/call/setup/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCall } from '@/hooks/useCall';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Mic, MicOff, Video, VideoOff, Monitor, Camera,
  Volume2, Settings, Check, AlertCircle, Loader2,
  ArrowLeft, Phone, PhoneOff, Radio
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CallSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatId = searchParams.get('chat');
  const callType = (searchParams.get('type') as 'audio' | 'video') || 'audio';
  
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { initiateCall } = useCall();
  
  const [step, setStep] = useState<'permissions' | 'devices' | 'preview'>('permissions');
  const [hasPermissions, setHasPermissions] = useState(false);
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [hasVideo, setHasVideo] = useState(callType === 'video');
  const [volume, setVolume] = useState(100);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>('');
  
  const [devices, setDevices] = useState<{
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
  }>({
    cameras: [],
    microphones: []
  });

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const requestPermissions = async () => {
    setIsRequestingPermissions(true);
    setPermissionError(null);

    try {
      const constraints = {
        audio: true,
        video: callType === 'video'
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      setHasPermissions(true);
      setStep('devices');

      const devicesList = await navigator.mediaDevices.enumerateDevices();
      setDevices({
        cameras: devicesList.filter(d => d.kind === 'videoinput'),
        microphones: devicesList.filter(d => d.kind === 'audioinput')
      });

      if (devicesList.find(d => d.kind === 'videoinput')) {
        setSelectedCamera(devicesList.find(d => d.kind === 'videoinput')?.deviceId || '');
      }
      if (devicesList.find(d => d.kind === 'audioinput')) {
        setSelectedMicrophone(devicesList.find(d => d.kind === 'audioinput')?.deviceId || '');
      }

    } catch (error: any) {
      console.error('Permission error:', error);
      setPermissionError(error.message || 'Failed to get camera/microphone permissions');
      setHasPermissions(false);
    } finally {
      setIsRequestingPermissions(false);
    }
  };

  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream && callType === 'video') {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !hasVideo;
      });
      setHasVideo(!hasVideo);
    }
  };

  const switchCamera = async (deviceId: string) => {
    if (!localStream || callType !== 'video') return;

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: selectedMicrophone ? { exact: selectedMicrophone } : undefined },
        video: { deviceId: { exact: deviceId } }
      });

      const videoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = localStream.getVideoTracks()[0];
      
      localStream.removeTrack(oldVideoTrack);
      localStream.addTrack(videoTrack);
      oldVideoTrack.stop();

      setSelectedCamera(deviceId);
    } catch (error) {
      console.error('Failed to switch camera:', error);
    }
  };

  const handleStartCall = async () => {
    if (!chatId) {
      router.push('/dashboard/chat');
      return;
    }

    try {
      const call = await initiateCall(parseInt(chatId, 10), callType);
      router.push(`/dashboard/call/${call.id}`);
    } catch (error) {
      console.error('Failed to start call:', error);
    }
  };

  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [localStream]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Badge variant="outline" className="text-lg">
            {callType === 'video' ? '📹 Video Call' : '🎤 Audio Call'} Setup
          </Badge>
          <div className="w-20" />
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center mb-8">
            {['permissions', 'devices', 'preview'].map((s, index) => (
              <div key={s} className="flex items-center">
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-sm",
                  step === s ? "bg-primary text-primary-foreground" : 
                  ['permissions', 'devices', 'preview'].indexOf(step) > index ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                )}>
                  {['permissions', 'devices', 'preview'].indexOf(step) > index ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                {index < 2 && <div className={cn("h-1 w-16 mx-2", ['permissions', 'devices', 'preview'].indexOf(step) > index ? "bg-green-500" : "bg-muted")} />}
              </div>
            ))}
          </div>

          {step === 'permissions' && (
            <Card className="p-8 text-center">
              <div className="max-w-md mx-auto space-y-6">
                <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  {callType === 'video' ? <Camera className="h-10 w-10 text-primary" /> : <Mic className="h-10 w-10 text-primary" />}
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">{callType === 'video' ? 'Camera & Microphone Access' : 'Microphone Access'}</h2>
                  <p className="text-muted-foreground">
                    We need access to your {callType === 'video' ? 'camera and microphone' : 'microphone'} to start the call.
                  </p>
                </div>

                {permissionError && (
                  <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 mt-0.5" />
                    <div className="text-left"><p className="font-medium">Permission Error</p><p className="text-sm">{permissionError}</p></div>
                  </div>
                )}

                <div className="space-y-4">
                  <Button size="lg" onClick={requestPermissions} disabled={isRequestingPermissions} className="w-full">
                    {isRequestingPermissions ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Requesting...</> : 'Allow Access'}
                  </Button>
                  <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
                </div>
              </div>
            </Card>
          )}

          {step === 'devices' && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6">Configure Your Devices</h2>
              
              <div className="space-y-6">
                {callType === 'video' && devices.cameras.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-base">Camera</Label>
                    <div className="grid gap-2">
                      {devices.cameras.map((camera) => (
                        <Button key={camera.deviceId} variant={selectedCamera === camera.deviceId ? "default" : "outline"} className="justify-start" onClick={() => switchCamera(camera.deviceId)}>
                          <Camera className="h-4 w-4 mr-2" />
                          {camera.label || `Camera ${camera.deviceId.slice(0, 5)}`}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {devices.microphones.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-base">Microphone</Label>
                    <div className="grid gap-2">
                      {devices.microphones.map((mic) => (
                        <Button key={mic.deviceId} variant={selectedMicrophone === mic.deviceId ? "default" : "outline"} className="justify-start" onClick={() => setSelectedMicrophone(mic.deviceId)}>
                          <Mic className="h-4 w-4 mr-2" />
                          {mic.label || `Microphone ${mic.deviceId.slice(0, 5)}`}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between"><Label className="text-base">Microphone Volume</Label><span className="text-sm text-muted-foreground">{volume}%</span></div>
                  <Slider value={[volume]} onValueChange={([v]: [number]) => setVolume(v)} max={100} step={1} />
                </div>

                <Separator />

                <div className="flex items-center space-x-4">
                  <Button variant="outline" size="sm" onClick={toggleMute}>
                    {isMuted ? <><MicOff className="h-4 w-4 mr-2" />Unmute</> : <><Mic className="h-4 w-4 mr-2" />Mute</>}
                  </Button>
                  {callType === 'video' && (
                    <Button variant="outline" size="sm" onClick={toggleVideo}>
                      {hasVideo ? <><Video className="h-4 w-4 mr-2" />Stop Video</> : <><VideoOff className="h-4 w-4 mr-2" />Start Video</>}
                    </Button>
                  )}
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <Button variant="outline" onClick={() => setStep('permissions')}>Back</Button>
                  <Button onClick={() => setStep('preview')}>Continue to Preview</Button>
                </div>
              </div>
            </Card>
          )}

          {step === 'preview' && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6">Preview & Join</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                    {hasVideo && callType === 'video' && localStream ? (
                      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Avatar className="h-20 w-20">
                          <AvatarImage src={user?.profile_image || ''} />
                          <AvatarFallback>{user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      </div>
                    )}

                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                      <Button size="icon" variant={isMuted ? "destructive" : "secondary"} onClick={toggleMute}>
                        {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      </Button>
                      {callType === 'video' && (
                        <Button size="icon" variant={hasVideo ? "secondary" : "destructive"} onClick={toggleVideo}>
                          {hasVideo ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="font-semibold">Call Details</h3>
                    <p className="text-sm text-muted-foreground">You're about to start a {callType} call.</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">Microphone</span>
                      <Badge variant={isMuted ? "destructive" : "default"} className={!isMuted ? "bg-green-500" : ""}>{isMuted ? "Muted" : "Active"}</Badge>
                    </div>
                    {callType === 'video' && (
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm">Camera</span>
                        <Badge variant={hasVideo ? "default" : "destructive"} className={hasVideo ? "bg-green-500" : ""}>{hasVideo ? "Active" : "Off"}</Badge>
                      </div>
                    )}
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">Connection</span>
                      <Badge variant="outline" className="text-green-500"><Radio className="h-3 w-3 mr-1 animate-pulse" />Ready</Badge>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <Button size="lg" onClick={handleStartCall} className="w-full"><Phone className="h-4 w-4 mr-2" />Start Call</Button>
                    <Button variant="outline" onClick={() => setStep('devices')} className="w-full"><Settings className="h-4 w-4 mr-2" />Adjust Settings</Button>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}