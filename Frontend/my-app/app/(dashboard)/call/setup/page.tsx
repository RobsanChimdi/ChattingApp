'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AudioIndicator } from '@/components/calls/AudioIndicator';
import { Label } from '@/components/ui/label';
import { Switch } from '@radix-ui/react-switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@radix-ui/react-select';
import { Slider } from '@radix-ui/react-slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { useMedia } from '@/hooks/useMedia';
import { useCall } from '@/hooks/useCall';
import { Video, Mic, Phone, Settings, Check, AlertCircle, Volume2, Headphones, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MainLayout } from '@/components/layout/main-layout';
import { Badge } from '@/components/ui/badge';

export default function CallSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatId = searchParams.get('chatId');
  const contactId = searchParams.get('contactId');
  const callType = searchParams.get('type') as 'audio' | 'video' || 'audio';

  const [selectedCallType, setSelectedCallType] = useState<'audio' | 'video'>(callType);
  const [audioLevel, setAudioLevel] = useState(0);
  const [videoTestActive, setVideoTestActive] = useState(true);
  const [audioTestActive, setAudioTestActive] = useState(true);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [audioVolume, setAudioVolume] = useState([80]);
  const [isTestingAudio, setIsTestingAudio] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const animationRef = useRef<number | null>(null);

  const {
    stream,
    audioEnabled,
    videoEnabled,
    devices,
    selectedAudioDevice,
    selectedVideoDevice,
    isLoading,
    toggleAudio,
    toggleVideo,
    switchCamera,
    switchMicrophone,
    refreshDevices,
  } = useMedia({ audio: true, video: true });

  const { initiateCall } = useCall();

  const audioDevices = devices.filter(d => d.kind === 'audioinput');
  const videoDevices = devices.filter(d => d.kind === 'videoinput');

  // Setup audio analysis for microphone testing
  useEffect(() => {
    if (audioTestActive && stream && stream.getAudioTracks().length > 0) {
      const setupAudioAnalysis = async () => {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const analyserNode = ctx.createAnalyser();
          const source = ctx.createMediaStreamSource(stream);
          
          analyserNode.fftSize = 256;
          analyserNode.smoothingTimeConstant = 0.8;
          source.connect(analyserNode);
          
          setAudioContext(ctx);
          setAnalyser(analyserNode);
          
          const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
          
          const updateAudioLevel = () => {
            if (!analyser) return;
            
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            setAudioLevel(Math.min(average / 255, 1));
            
            animationRef.current = requestAnimationFrame(updateAudioLevel);
          };
          
          animationRef.current = requestAnimationFrame(updateAudioLevel);
        } catch (err) {
          console.error('Audio analysis error:', err);
        }
      };
      
      setupAudioAnalysis();
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [audioTestActive, stream]);

  const handleStartCall = async () => {
    if (!chatId && !contactId) {
      router.back();
      return;
    }

    try {
      setError(null);
      const call = await initiateCall(
        chatId || contactId || '',
        selectedCallType
      );
      router.push(`/call/${call.id}`);
    } catch (error: any) {
      console.error('Failed to start call:', error);
      setError(error.message || 'Failed to start call. Please try again.');
    }
  };

  const handleDeviceChange = async (type: 'audio' | 'video', deviceId: string) => {
    try {
      setError(null);
      if (type === 'audio') {
        await switchMicrophone(deviceId);
      } else {
        await switchCamera(deviceId);
      }
      await refreshDevices();
    } catch (error: any) {
      console.error('Failed to switch device:', error);
      setError(`Failed to switch ${type}: ${error.message}`);
    }
  };

  const testAudioOutput = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(console.error);
      setIsTestingAudio(true);
      setTimeout(() => setIsTestingAudio(false), 2000);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Prepare for Call</h1>
          <p className="text-muted-foreground">
            Configure your audio and video settings before starting
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Preview panel */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>
                  How you'll appear to others in the call
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative aspect-video bg-gradient-to-br from-muted/30 to-muted/10 rounded-lg overflow-hidden border">
                  {videoEnabled && stream ? (
                    <video
                      ref={el => {
                        if (el && stream) {
                          el.srcObject = stream;
                          el.onloadedmetadata = () => el.play();
                        }
                      }}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-8">
                      <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center mb-4">
                        <Video className="h-12 w-12 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">Camera is off</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Turn on camera to preview
                      </p>
                    </div>
                  )}

                  {/* Audio level indicator */}
                  {stream && (
                    <div className="absolute bottom-4 right-4">
                      <AudioIndicator
                        stream={stream}
                        isSpeaking={audioLevel > 0.05}
                        level={audioLevel}
                        size="md"
                        showLevel
                      />
                    </div>
                  )}

                  {/* Camera status */}
                  <div className="absolute top-4 left-4 flex flex-col space-y-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className={cn(
                        "gap-2",
                        !videoEnabled && "bg-destructive hover:bg-destructive/90"
                      )}
                      onClick={toggleVideo}
                    >
                      <Video className="h-4 w-4" />
                      {videoEnabled ? 'Camera On' : 'Camera Off'}
                    </Button>
                  </div>

                  {/* Mic status */}
                  <div className="absolute top-4 right-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      className={cn(
                        "gap-2",
                        !audioEnabled && "bg-destructive hover:bg-destructive/90"
                      )}
                      onClick={toggleAudio}
                    >
                      <Mic className="h-4 w-4" />
                      {audioEnabled ? 'Mic On' : 'Mic Off'}
                    </Button>
                  </div>

                  {/* Call type indicator */}
                  <div className="absolute bottom-4 left-4">
                    <Badge variant="secondary" className="gap-1">
                      {selectedCallType === 'video' ? (
                        <>
                          <Video className="h-3 w-3" />
                          Video Call
                        </>
                      ) : (
                        <>
                          <Mic className="h-3 w-3" />
                          Audio Call
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <div className="w-full">
                  <Tabs defaultValue="audio" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="audio">Audio Settings</TabsTrigger>
                      <TabsTrigger value="video">Video Settings</TabsTrigger>
                    </TabsList>
                    <TabsContent value="audio" className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Microphone Level</Label>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 transition-all duration-100"
                            style={{ width: `${audioLevel * 100}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between space-x-4">
                        <div className="flex-1">
                          <Label>Output Volume</Label>
                          <Slider
                            value={audioVolume}
                            onValueChange={setAudioVolume}
                            max={100}
                            step={1}
                            className="mt-2"
                          />
                        </div>
                        <Button variant="outline" size="sm" onClick={testAudioOutput}>
                          <Volume2 className="h-4 w-4 mr-2" />
                          Test
                        </Button>
                      </div>
                    </TabsContent>
                    <TabsContent value="video" className="space-y-4 pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Brightness</Label>
                          <Slider defaultValue={[50]} max={100} step={1} />
                        </div>
                        <div className="space-y-2">
                          <Label>Contrast</Label>
                          <Slider defaultValue={[50]} max={100} step={1} />
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </CardFooter>
            </Card>
          </div>

          {/* Settings panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Call Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Call Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={selectedCallType === 'audio' ? 'default' : 'outline'}
                      onClick={() => setSelectedCallType('audio')}
                      className="h-auto py-4 flex-col"
                    >
                      <div className="flex flex-col items-center">
                        <Mic className="h-6 w-6 mb-2" />
                        <span>Audio Call</span>
                        <span className="text-xs text-muted-foreground mt-1">
                          Voice only
                        </span>
                      </div>
                    </Button>
                    <Button
                      variant={selectedCallType === 'video' ? 'default' : 'outline'}
                      onClick={() => setSelectedCallType('video')}
                      className="h-auto py-4 flex-col"
                    >
                      <div className="flex flex-col items-center">
                        <Video className="h-6 w-6 mb-2" />
                        <span>Video Call</span>
                        <span className="text-xs text-muted-foreground mt-1">
                          With camera
                        </span>
                      </div>
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="microphone">Microphone</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => refreshDevices()}
                      >
                        Refresh
                      </Button>
                    </div>
                    <Select
                      value={selectedAudioDevice || undefined}
                      onValueChange={(value:string) => handleDeviceChange('audio', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select microphone" />
                      </SelectTrigger>
                      <SelectContent>
                        {audioDevices.length > 0 ? (
                          audioDevices.map((device) => (
                            <SelectItem key={device.deviceId} value={device.deviceId}>
                              {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>
                            No microphones found
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedCallType === 'video' && (
                    <div className="space-y-2">
                      <Label>Camera</Label>
                      <Select
                        value={selectedVideoDevice || undefined}
                        onValueChange={(value:string) => handleDeviceChange('video', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select camera" />
                        </SelectTrigger>
                        <SelectContent>
                          {videoDevices.length > 0 ? (
                            videoDevices.map((device) => (
                              <SelectItem key={device.deviceId} value={device.deviceId}>
                                {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>
                              No cameras found
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-4 border-t pt-4">
                  <h4 className="text-sm font-medium">Audio Enhancements</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="noise-suppression">Noise Suppression</Label>
                        <p className="text-xs text-muted-foreground">
                          Reduce background noise
                        </p>
                      </div>
                      <Switch
                        id="noise-suppression"
                        checked={noiseSuppression}
                        onCheckedChange={setNoiseSuppression}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="echo-cancellation">Echo Cancellation</Label>
                        <p className="text-xs text-muted-foreground">
                          Remove echo from audio
                        </p>
                      </div>
                      <Switch
                        id="echo-cancellation"
                        checked={echoCancellation}
                        onCheckedChange={setEchoCancellation}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Audio test */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Audio Test</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Test Microphone</Label>
                      <p className="text-xs text-muted-foreground">
                        Speak to check your microphone
                      </p>
                    </div>
                    <Switch
                      checked={audioTestActive}
                      onCheckedChange={setAudioTestActive}
                    />
                  </div>
                  
                  {audioTestActive && (
                    <div className="space-y-3">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all duration-100"
                          style={{ width: `${audioLevel * 100}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-center space-x-2 text-xs">
                        <div className="flex items-center">
                          <div className="h-2 w-2 rounded-full bg-green-500 mr-1"></div>
                          <span>Good</span>
                        </div>
                        <div className="flex items-center">
                          <div className="h-2 w-2 rounded-full bg-yellow-500 mr-1"></div>
                          <span>Fair</span>
                        </div>
                        <div className="flex items-center">
                          <div className="h-2 w-2 rounded-full bg-red-500 mr-1"></div>
                          <span>Poor</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Start call button */}
            <Button
              size="lg"
              className="w-full"
              onClick={handleStartCall}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Preparing...
                </>
              ) : (
                <>
                  <Phone className="mr-2 h-5 w-5" />
                  Start {selectedCallType === 'video' ? 'Video' : 'Audio'} Call
                </>
              )}
            </Button>

            {/* Hidden audio element for output test */}
            <audio ref={audioRef} className="hidden">
              <source src="/audio/test-tone.mp3" type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}