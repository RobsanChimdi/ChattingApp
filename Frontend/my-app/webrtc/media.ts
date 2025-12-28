// services/webrtc/media.ts
export interface MediaConstraints {
  audio: boolean;
  video: boolean;
  screenShare?: boolean;
  audioConstraints?: MediaTrackConstraints;
  videoConstraints?: MediaTrackConstraints;
}

export interface MediaDevice {
  deviceId: string;
  kind: MediaDeviceKind;
  label: string;
  groupId: string;
}

export interface MediaStats {
  audioLevel: number;
  videoResolution?: { width: number; height: number };
  frameRate?: number;
  bitrate?: number;
  packetsLost?: number;
  jitter?: number;
  roundTripTime?: number;
}

export interface AudioAnalyser {
  analyser: AnalyserNode;
  dataArray: Uint8Array;
  getLevel: () => number;
}

class MediaService {
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private audioAnalyser: AudioAnalyser | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private devices: MediaDevice[] = [];
  private deviceChangeCallbacks: ((devices: MediaDevice[]) => void)[] = [];
  private selectedAudioDevice: string | null = null;
  private selectedVideoDevice: string | null = null;

  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Request permission for audio first
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (error) {
        console.warn('Audio permission not granted:', error);
      }
      
      await this.refreshDevices();
      
      // Listen for device changes
      navigator.mediaDevices.addEventListener('devicechange', this.handleDeviceChange.bind(this));
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing media service:', error);
    }
  }

  private handleDeviceChange = async (): Promise<void> => {
    try {
      await this.refreshDevices();
      // Use slice to create a copy of the array
      const devicesCopy = this.devices.slice();
      this.deviceChangeCallbacks.forEach(callback => callback(devicesCopy));
    } catch (error) {
      console.error('Error handling device change:', error);
    }
  };

  private async refreshDevices(): Promise<void> {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      this.devices = deviceList
        .filter(device => device.deviceId && device.kind)
        .map(device => ({
          deviceId: device.deviceId,
          kind: device.kind,
          label: device.label || `Unknown ${device.kind}`,
          groupId: device.groupId,
        }));
    } catch (error) {
      console.error('Error refreshing devices:', error);
      this.devices = [];
    }
  }

  async getLocalStream(constraints: MediaConstraints): Promise<MediaStream> {
    try {
      // Stop existing stream if any
      if (this.localStream) {
        this.stopLocalStream();
      }

      const streamConstraints: MediaStreamConstraints = {
        audio: constraints.audio ? this.getAudioConstraints(constraints) : false,
        video: constraints.video ? this.getVideoConstraints(constraints) : false,
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(streamConstraints);
      
      // Store selected devices
      const audioTrack = this.localStream.getAudioTracks()[0];
      const videoTrack = this.localStream.getVideoTracks()[0];
      
      if (audioTrack) {
        this.selectedAudioDevice = audioTrack.getSettings().deviceId || null;
      }
      if (videoTrack) {
        this.selectedVideoDevice = videoTrack.getSettings().deviceId || null;
      }
      
      if (constraints.audio && audioTrack) {
        await this.setupAudioAnalysis();
      }
      
      return this.localStream;
    } catch (error) {
      console.error('Error getting local stream:', error);
      throw this.handleMediaError(error as Error);
    }
  }

  private getAudioConstraints(constraints: MediaConstraints): MediaTrackConstraints {
    const defaultConstraints: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
      sampleRate: 48000,
    };

    if (this.selectedAudioDevice) {
      defaultConstraints.deviceId = { exact: this.selectedAudioDevice };
    } else if (constraints.audioConstraints?.deviceId) {
      defaultConstraints.deviceId = constraints.audioConstraints.deviceId;
    }

    return { ...defaultConstraints, ...constraints.audioConstraints };
  }

  private getVideoConstraints(constraints: MediaConstraints): MediaTrackConstraints {
    const defaultConstraints: MediaTrackConstraints = {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 },
      aspectRatio: { ideal: 16 / 9 },
    };

    if (this.selectedVideoDevice) {
      defaultConstraints.deviceId = { exact: this.selectedVideoDevice };
    } else if (constraints.videoConstraints?.deviceId) {
      defaultConstraints.deviceId = constraints.videoConstraints.deviceId;
    }

    return { ...defaultConstraints, ...constraints.videoConstraints };
  }

  async getScreenShareStream(options?: DisplayMediaStreamOptions): Promise<MediaStream> {
    try {
      // Stop existing screen stream if any
      if (this.screenStream) {
        this.stopScreenShare();
      }

      const screenOptions: DisplayMediaStreamOptions = {
        video: {
          displaySurface: 'monitor',
          frameRate: { ideal: 30 },
          width: { max: 1920 },
          height: { max: 1080 },
          ...(options?.video as any),
        } as DisplayMediaStreamOptions['video'],
        audio: options?.audio ?? true,
        // @ts-ignore - experimental feature
        audioCapture: options?.audioCapture ?? 'include',
        selfBrowserSurface: 'exclude',
        surfaceSwitching: 'include',
        systemAudio: 'include',
      };

      this.screenStream = await navigator.mediaDevices.getDisplayMedia(screenOptions);

      // Handle screen share stop
      const videoTrack = this.screenStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.addEventListener('ended', () => {
          this.screenStream = null;
        });
      }

      // Handle audio track if present
      const audioTrack = this.screenStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.addEventListener('ended', () => {
          this.screenStream = null;
        });
      }

      return this.screenStream;
    } catch (error) {
      console.error('Error getting screen share:', error);
      throw this.handleMediaError(error as Error);
    }
  }

  private async setupAudioAnalysis(): Promise<void> {
    if (!this.localStream || !this.localStream.getAudioTracks().length || this.audioAnalyser) {
      return;
    }

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.localStream);
      this.mediaStreamSource.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      this.audioAnalyser = {
        analyser,
        dataArray,
        getLevel: () => {
          if (!analyser) return 0;
          
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          return Math.min(sum / dataArray.length / 256, 1);
        }
      };
    } catch (error) {
      console.error('Error setting up audio analysis:', error);
      this.audioAnalyser = null;
    }
  }

  getAudioLevel(): number {
    if (!this.audioAnalyser) {
      return 0;
    }
    
    try {
      return this.audioAnalyser.getLevel();
    } catch (error) {
      return 0;
    }
  }

  async switchCamera(deviceId?: string): Promise<void> {
    if (!this.localStream) return;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (!videoTrack) return;

    const devices = await this.getDevices('videoinput');
    if (devices.length === 0) return;

    let targetDeviceId = deviceId;
    
    if (!targetDeviceId) {
      // Cycle through cameras
      const currentDeviceId = videoTrack.getSettings().deviceId;
      const currentIndex = devices.findIndex(d => d.deviceId === currentDeviceId);
      const nextIndex = (currentIndex + 1) % devices.length;
      targetDeviceId = devices[nextIndex].deviceId;
    }

    if (!targetDeviceId) return;

    this.selectedVideoDevice = targetDeviceId;
    
    // Get new stream with the selected camera
    const constraints: MediaConstraints = {
      audio: !!this.localStream.getAudioTracks().length,
      video: true,
      videoConstraints: { deviceId: { exact: targetDeviceId } },
    };

    await this.getLocalStream(constraints);
  }

  async switchMicrophone(deviceId: string): Promise<void> {
    this.selectedAudioDevice = deviceId;
    
    if (!this.localStream) return;

    // Get new stream with the selected microphone
    const constraints: MediaConstraints = {
      audio: true,
      audioConstraints: { deviceId: { exact: deviceId } },
      video: !!this.localStream.getVideoTracks().length,
    };

    await this.getLocalStream(constraints);
  }

  async getDevices(kind?: MediaDeviceKind): Promise<MediaDevice[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    await this.refreshDevices();
    
    if (kind) {
      return this.devices.filter(device => device.kind === kind);
    }
    
    // Return a copy to prevent external modification
    return this.devices.slice();
  }

  async setAudioDevice(deviceId: string): Promise<void> {
    this.selectedAudioDevice = deviceId;
    
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        const constraints = this.getAudioConstraints({ audio: true, video: false });
        await audioTrack.applyConstraints(constraints);
      }
    }
  }

  async setVideoDevice(deviceId: string): Promise<void> {
    this.selectedVideoDevice = deviceId;
    
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        const constraints = this.getVideoConstraints({ audio: false, video: true });
        await videoTrack.applyConstraints(constraints);
      }
    }
  }

  toggleMute(kind: 'audio' | 'video'): boolean {
    if (!this.localStream) return false;

    const tracks = this.localStream.getTracks().filter(track => track.kind === kind);
    if (tracks.length === 0) return false;

    const newState = !tracks[0].enabled;
    tracks.forEach(track => {
      track.enabled = newState;
    });

    return newState;
  }

  isMuted(kind: 'audio' | 'video'): boolean {
    if (!this.localStream) return true;
    
    const track = this.localStream.getTracks().find(t => t.kind === kind);
    return track ? !track.enabled : true;
  }

  getMediaStats(): MediaStats {
    const stats: MediaStats = {
      audioLevel: this.getAudioLevel(),
    };

    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        stats.videoResolution = {
          width: settings.width || 0,
          height: settings.height || 0,
        };
        stats.frameRate = settings.frameRate;
      }
    }

    return stats;
  }

  onDeviceChange(callback: (devices: MediaDevice[]) => void): () => void {
    this.deviceChangeCallbacks.push(callback);
    
    // Call immediately with current devices
    callback(this.devices.slice());
    
    return () => {
      const index = this.deviceChangeCallbacks.indexOf(callback);
      if (index > -1) this.deviceChangeCallbacks.splice(index, 1);
    };
  }

  stopLocalStream(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
      this.localStream = null;
    }
    
    if (this.audioAnalyser) {
      if (this.mediaStreamSource) {
        this.mediaStreamSource.disconnect();
        this.mediaStreamSource = null;
      }
      this.audioAnalyser = null;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  stopScreenShare(): void {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }
  }

  stopAll(): void {
    this.stopLocalStream();
    this.stopScreenShare();
  }

  getCurrentLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getScreenStream(): MediaStream | null {
    return this.screenStream;
  }

  getSelectedAudioDevice(): string | null {
    return this.selectedAudioDevice;
  }

  getSelectedVideoDevice(): string | null {
    return this.selectedVideoDevice;
  }

  private handleMediaError(error: Error): Error {
    const name = error.name;
    let message = error.message;
    
    switch (name) {
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        message = 'No media devices found. Please connect a camera/microphone.';
        break;
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        message = 'Permission to access media devices was denied.';
        break;
      case 'NotReadableError':
      case 'TrackStartError':
        message = 'Device is already in use by another application.';
        break;
      case 'OverconstrainedError':
        message = 'Cannot satisfy the requested constraints.';
        break;
      case 'TypeError':
        if (error.message.includes('deviceId')) {
          message = 'The requested device is no longer available.';
        }
        break;
    }
    
    return new Error(message);
  }

  async isScreenShareSupported(): Promise<boolean> {
    return !!(navigator.mediaDevices && 
           'getDisplayMedia' in navigator.mediaDevices);
  }

  async isAudioOutputSupported(): Promise<boolean> {
    return 'setSinkId' in HTMLMediaElement.prototype;
  }

  async setAudioOutput(deviceId: string): Promise<void> {
    const audioElements = document.querySelectorAll('audio, video');
    for (const element of audioElements) {
      if (element instanceof HTMLMediaElement) {
        try {
          // @ts-ignore - setSinkId might not be in TypeScript types
          await element.setSinkId(deviceId);
        } catch (error) {
          console.error('Error setting audio output:', error);
        }
      }
    }
  }
}

export const mediaService = new MediaService();
export default mediaService;