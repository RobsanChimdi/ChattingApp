import { useState, useCallback, useEffect, useRef } from 'react';

interface UseMediaReturn {
  // State
  stream: MediaStream | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenShareActive: boolean;
  devices: MediaDeviceInfo[];
  selectedAudioDevice: string | null;
  selectedVideoDevice: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  startMedia: (constraints?: MediaStreamConstraints) => Promise<MediaStream>;
  stopMedia: () => void;
  toggleAudio: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  startScreenShare: () => Promise<MediaStream>;
  stopScreenShare: () => void;
  switchCamera: (deviceId: string) => Promise<void>;
  switchMicrophone: (deviceId: string) => Promise<void>;
  
  // Device management
  refreshDevices: () => Promise<void>;
  
  // Cleanup
  cleanup: () => void;
}

export const useMedia = (initialConstraints?: MediaStreamConstraints): UseMediaReturn => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [screenShareActive, setScreenShareActive] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string | null>(null);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const screenStreamRef = useRef<MediaStream | null>(null);
  const constraintsRef = useRef<MediaStreamConstraints>(
    initialConstraints || { audio: true, video: true }
  );
  
  // Get available devices on mount
  useEffect(() => {
    refreshDevices();
    
    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
    
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
      cleanup();
    };
  }, []);
  
  // Start media stream
  const startMedia = useCallback(async (constraints?: MediaStreamConstraints) => {
    if (constraints) {
      constraintsRef.current = constraints;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Stop existing stream
      if (stream) {
        stopMedia();
      }
      
      // Apply selected devices to constraints
      const actualConstraints: MediaStreamConstraints = {
        ...constraintsRef.current,
        audio: selectedAudioDevice ? { deviceId: { exact: selectedAudioDevice } } : true,
        video: selectedVideoDevice ? { deviceId: { exact: selectedVideoDevice } } : true,
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(actualConstraints);
      
      // Update state
      setStream(mediaStream);
      setAudioEnabled(true);
      setVideoEnabled(!!actualConstraints.video);
      
      // Refresh devices list
      await refreshDevices();
      
      return mediaStream;
    } catch (error: any) {
      let errorMessage = 'Failed to access media devices';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Permission denied. Please allow camera/microphone access.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No media devices found.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Device is already in use.';
      }
      
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [stream, selectedAudioDevice, selectedVideoDevice]);
  
  // Stop media stream
  const stopMedia = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);
  
  // Toggle audio
  const toggleAudio = useCallback(async () => {
    if (!stream) return;
    
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length > 0) {
      const newState = !audioEnabled;
      audioTracks.forEach(track => {
        track.enabled = newState;
      });
      setAudioEnabled(newState);
    } else if (!audioEnabled) {
      // No audio track, need to restart stream with audio
      const newConstraints = {
        ...constraintsRef.current,
        audio: true,
        video: !!constraintsRef.current.video,
      };
      await startMedia(newConstraints);
    }
  }, [stream, audioEnabled, startMedia]);
  
  // Toggle video
  const toggleVideo = useCallback(async () => {
    if (!stream) return;
    
    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length > 0) {
      const newState = !videoEnabled;
      videoTracks.forEach(track => {
        track.enabled = newState;
      });
      setVideoEnabled(newState);
    } else if (!videoEnabled) {
      // No video track, need to restart stream with video
      const newConstraints = {
        ...constraintsRef.current,
        audio: !!constraintsRef.current.audio,
        video: true,
      };
      await startMedia(newConstraints);
    }
  }, [stream, videoEnabled, startMedia]);
  
  // Start screen sharing
  const startScreenShare = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      
      screenStreamRef.current = screenStream;
      setScreenShareActive(true);
      
      // Listen for when user stops screen share
      screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        stopScreenShare();
      });
      
      return screenStream;
    } catch (error: any) {
      let errorMessage = 'Failed to start screen sharing';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Screen sharing permission denied';
      }
      
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Stop screen sharing
  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
      setScreenShareActive(false);
    }
  }, []);
  
  // Switch camera
  const switchCamera = useCallback(async (deviceId: string) => {
    if (!stream) return;
    
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;
    
    try {
      // Create new constraints with selected device
      const newConstraints: MediaStreamConstraints = {
        audio: constraintsRef.current.audio,
        video: { deviceId: { exact: deviceId } },
      };
      
      // Stop current video track
      videoTrack.stop();
      
      // Get new stream with selected camera
      const newStream = await navigator.mediaDevices.getUserMedia(newConstraints);
      const newVideoTrack = newStream.getVideoTracks()[0];
      
      // Replace video track in existing stream
      stream.removeTrack(videoTrack);
      stream.addTrack(newVideoTrack);
      
      // Clean up unused audio track from new stream
      newStream.getAudioTracks().forEach(track => track.stop());
      
      setSelectedVideoDevice(deviceId);
      setVideoEnabled(true);
    } catch (error: any) {
      setError(`Failed to switch camera: ${error.message}`);
    }
  }, [stream]);
  
  // Switch microphone
  const switchMicrophone = useCallback(async (deviceId: string) => {
    if (!stream) return;
    
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;
    
    try {
      // Create new constraints with selected device
      const newConstraints: MediaStreamConstraints = {
        audio: { deviceId: { exact: deviceId } },
        video: constraintsRef.current.video,
      };
      
      // Stop current audio track
      audioTrack.stop();
      
      // Get new stream with selected microphone
      const newStream = await navigator.mediaDevices.getUserMedia(newConstraints);
      const newAudioTrack = newStream.getAudioTracks()[0];
      
      // Replace audio track in existing stream
      stream.removeTrack(audioTrack);
      stream.addTrack(newAudioTrack);
      
      // Clean up unused video track from new stream
      newStream.getVideoTracks().forEach(track => track.stop());
      
      setSelectedAudioDevice(deviceId);
      setAudioEnabled(true);
    } catch (error: any) {
      setError(`Failed to switch microphone: ${error.message}`);
    }
  }, [stream]);
  
  // Refresh available devices
  const refreshDevices = useCallback(async () => {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      setDevices(deviceList);
      
      // Auto-select first available devices if none selected
      if (!selectedAudioDevice) {
        const audioInput = deviceList.find(d => d.kind === 'audioinput');
        if (audioInput) {
          setSelectedAudioDevice(audioInput.deviceId);
        }
      }
      
      if (!selectedVideoDevice) {
        const videoInput = deviceList.find(d => d.kind === 'videoinput');
        if (videoInput) {
          setSelectedVideoDevice(videoInput.deviceId);
        }
      }
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
    }
  }, [selectedAudioDevice, selectedVideoDevice]);
  
  // Cleanup
  const cleanup = useCallback(() => {
    stopMedia();
    stopScreenShare();
    setError(null);
  }, [stopMedia, stopScreenShare]);
  
  return {
    // State
    stream,
    audioEnabled,
    videoEnabled,
    screenShareActive,
    devices,
    selectedAudioDevice,
    selectedVideoDevice,
    isLoading,
    error,
    
    // Actions
    startMedia,
    stopMedia,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    switchCamera,
    switchMicrophone,
    
    // Device management
    refreshDevices,
    
    // Cleanup
    cleanup,
  };
};