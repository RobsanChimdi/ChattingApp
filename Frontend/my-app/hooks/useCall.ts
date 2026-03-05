import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCallStore } from '@/store/callStore';
import { useAuth } from './useAuth';
import { useSocket } from './useSocket';
import type { Call, CallParticipant, WebRTCSignal } from '@/types';

interface UseCallReturn {
  // State
  activeCall: Call | null;
  incomingCall: Call | null;
  participants: CallParticipant[];
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  isCallActive: boolean;
  isJoining: boolean;
  isMuted: boolean;
  hasVideo: boolean;
  isLoading: boolean;
  error: string | null;
  callStats: any;
  
  // Call management
  initiateCall: (chatId: string, callType: 'audio' | 'video') => Promise<Call>;
  joinCall: (callId: string) => Promise<void>;
  answerCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  leaveCall: () => Promise<void>;
  endCall: () => Promise<void>;
  
  // Media controls
  toggleMute: () => void;
  toggleVideo: () => void;
  switchCamera: () => Promise<void>;
  toggleSpeaker: () => void;
  
  // Participant management
  kickParticipant: (userId: number) => Promise<void>;
  muteParticipant: (userId: number) => Promise<void>;
  
  // WebRTC
  sendWebRTCSignal: (signal: WebRTCSignal) => void;
  
  // Quality monitoring
  startQualityMonitoring: () => void;
  stopQualityMonitoring: () => void;
  
  // UI State
  clearError: () => void;
  
  // Helpers
  isInitiator: boolean;
  isParticipant: (userId: number) => boolean;
  getParticipant: (userId: number) => CallParticipant | undefined;
}

export const useCall = (callId?: string): UseCallReturn => {
  const router = useRouter();
  const { user } = useAuth();
  const { on, emit } = useSocket();
  
  // Get state and actions from store
  const {
    activeCall,
    incomingCall,
    participants: storeParticipants,
    localStream,
    remoteStreams,
    isCallActive,
    isJoining,
    isMuted,
    hasVideo,
    isLoading,
    error: storeError,
    initiateCall: initiateCallAction,
    joinCall: joinCallAction,
    leaveCall: leaveCallAction,
    endCall: endCallAction,
    toggleMute: toggleMuteAction,
    toggleVideo: toggleVideoAction,
    setIncomingCall,
    setError: setStoreError,
    clearError: clearStoreError,
  } = useCallStore();
  
  // Local state
  const [localError, setLocalError] = useState<string | null>(null);
  const [callStats, setCallStats] = useState<any>(null);
  const [activeSpeaker, setActiveSpeaker] = useState<number | null>(null);
  const qualityMonitorRef = useRef<NodeJS.Timeout | null>(null);
  
  // Combined error state
  const error = localError || storeError;
  
  // Get participants for current call
  const participants = activeCall ? storeParticipants.get(activeCall.id) || [] : [];
     useEffect(() => {
  return () => {
    if (qualityMonitorRef.current) {
      clearInterval(qualityMonitorRef.current);
    }
  };
}, []);

  // Setup socket listeners
  useEffect(() => {
    // Listen for incoming calls
    const unsubscribeIncomingCall = on('incoming_call', (data: { call: Call }) => {
      if (data.call.initiated_by.id !== user?.id) {
        setIncomingCall(data.call);
        
        // Play ringtone
        playRingtone();
      }
    });
    
    // Listen for call ended
    const unsubscribeCallEnded = on('call_ended', (data: { call_id: string; reason: string }) => {
      if (activeCall?.id === data.call_id) {
        handleCallEnded(data.reason);
      }
      if (incomingCall?.id === data.call_id) {
        setIncomingCall(null);
        stopRingtone();
      }
    });
    
    // Listen for participant updates
    const unsubscribeParticipantUpdate = on('participant_updated', 
      (data: { call_id: string; participant: CallParticipant }) => {
        if (activeCall?.id === data.call_id) {
          // Update participant in local state if needed
        }
      }
    );
    
    // Listen for WebRTC signals
    const unsubscribeWebRTCSignal = on('webrtc_signal', (signal: WebRTCSignal) => {
      if (activeCall?.id === signal.callId) {
        handleWebRTCSignal(signal);
      }
    });
    
    return () => {
      unsubscribeIncomingCall();
      unsubscribeCallEnded();
      unsubscribeParticipantUpdate();
      unsubscribeWebRTCSignal();
      
      // Stop quality monitoring
      stopQualityMonitoring();
      
      // Stop ringtone if playing
      stopRingtone();
    };
  }, [activeCall?.id, incomingCall?.id, user?.id, on, setIncomingCall]);
  
  // Auto-join call if callId provided and not in call
  useEffect(() => {
    if (callId && !activeCall && !isCallActive && user) {
      joinCall(callId).catch(console.error);
    }
  }, [callId, activeCall, isCallActive, user]);
  
  // Handle call ended
  const handleCallEnded = useCallback((reason: string) => {
    leaveCallAction(activeCall!.id).catch(console.error);
    
    // Show call ended message
    setLocalError(`Call ended: ${reason}`);
    
    // Navigate back to chat after delay
    setTimeout(() => {
      if (activeCall?.chat) {
        router.push(`/chat/${activeCall.chat}`);
      }
    }, 2000);
  }, [activeCall, leaveCallAction, router]);
  
  // Handle WebRTC signal
  const handleWebRTCSignal = useCallback((signal: WebRTCSignal) => {
    // Forward to WebRTC service
    emit('webrtc_signal', signal);
  }, [emit]);
  
  // Enhanced actions
  const initiateCall = useCallback(async (chatId: string, callType: 'audio' | 'video') => {
    try {
      const call = await initiateCallAction(chatId, callType);
      
      // Start quality monitoring
      startQualityMonitoring();
      
      return call;
    } catch (error: any) {
      setLocalError(error.message || 'Failed to initiate call');
      throw error;
    }
  }, [initiateCallAction]);
  
  const joinCall = useCallback(async (callId: string) => {
    try {
      await joinCallAction(callId);
      
      // Start quality monitoring
      startQualityMonitoring();
      
      // Stop ringtone if we were answering
      stopRingtone();
    } catch (error: any) {
      setLocalError(error.message || 'Failed to join call');
      throw error;
    }
  }, [joinCallAction]);
  
  const answerCall = useCallback(async () => {
    if (!incomingCall) return;
    
    try {
      await joinCall(incomingCall.id);
      setIncomingCall(null);
    } catch (error) {
      setLocalError('Failed to answer call');
    }
  }, [incomingCall, joinCall, setIncomingCall]);
  
  const rejectCall = useCallback(async () => {
    if (!incomingCall) return;
    
    try {
      emit('reject_call', { call_id: incomingCall.id });
      setIncomingCall(null);
      stopRingtone();
    } catch (error) {
      setLocalError('Failed to reject call');
    }
  }, [incomingCall, emit, setIncomingCall]);
  
  const leaveCall = useCallback(async () => {
    if (!activeCall) return;
    
    try {
      await leaveCallAction(activeCall.id);
      stopQualityMonitoring();
      
      // Navigate back to chat
      if (activeCall.chat) {
        router.push(`/chat/${activeCall.chat}`);
      }
    } catch (error: any) {
      setLocalError(error.message || 'Failed to leave call');
    }
  }, [activeCall, leaveCallAction, router]);
  
  const endCall = useCallback(async () => {
    if (!activeCall) return;
    
    try {
      await endCallAction(activeCall.id);
      stopQualityMonitoring();
      
      // Navigate back to chat
      if (activeCall.chat) {
        router.push(`/chat/${activeCall.chat}`);
      }
    } catch (error: any) {
      setLocalError(error.message || 'Failed to end call');
    }
  }, [activeCall, endCallAction, router]);
  
  // Media controls
  const toggleMute = useCallback(() => {
    try {
      toggleMuteAction();
    } catch (error: any) {
      setLocalError('Failed to toggle mute');
    }
  }, [toggleMuteAction]);
  
  const toggleVideo = useCallback(() => {
    try {
      toggleVideoAction();
    } catch (error: any) {
      setLocalError('Failed to toggle video');
    }
  }, [toggleVideoAction]);
  
  const switchCamera = useCallback(async () => {
    if (!localStream || !activeCall || activeCall.call_type !== 'video') {
      return;
    }
    
    try {
      const videoTrack = localStream.getVideoTracks()[0];
      if (!videoTrack) return;
      
      // Get all video devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length < 2) {
        setLocalError('Only one camera available');
        return;
      }
      
      // Find current device
      const currentDeviceId = videoTrack.getSettings().deviceId;
      const otherDevice = videoDevices.find(device => device.deviceId !== currentDeviceId);
      
      if (!otherDevice) {
        setLocalError('Could not find another camera');
        return;
      }
      
      // Create new stream with other camera
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: otherDevice.deviceId } },
        audio: true,
      });
      
      // Replace video track
      const newVideoTrack = newStream.getVideoTracks()[0];
      const sender = getVideoSender();
      
      if (sender && typeof sender.replaceTrack === 'function') {
        sender.replaceTrack(newVideoTrack);
      }
      
      // Update local stream
      videoTrack.stop();
      localStream.removeTrack(videoTrack);
      localStream.addTrack(newVideoTrack);
      
      // Cleanup
      newStream.getAudioTracks().forEach(track => track.stop());
    } catch (error: any) {
      setLocalError('Failed to switch camera');
    }
  }, [localStream, activeCall]);
  
  const toggleSpeaker = useCallback(() => {
    // This would require access to audio output devices
    // For now, we'll just toggle a UI state
    console.log('Speaker toggled');
  }, []);
  
  // Participant management
  const kickParticipant = useCallback(async (userId: number) => {
    if (!activeCall || !user) return;
    
    // Check permissions
    const isInitiator = activeCall.initiated_by.id === user.id;
    const isChatAdmin = false; // Would need to check chat store
    
    if (!isInitiator && !isChatAdmin) {
      setLocalError('You do not have permission to kick participants');
      return;
    }
    
    try {
      emit('kick_participant', {
        call_id: activeCall.id,
        user_id: userId,
      });
    } catch (error) {
      setLocalError('Failed to kick participant');
    }
  }, [activeCall, user, emit]);
  
  const muteParticipant = useCallback(async (userId: number) => {
    if (!activeCall || !user) return;
    
    // Only initiator can mute others
    if (activeCall.initiated_by.id !== user.id) {
      setLocalError('Only call initiator can mute participants');
      return;
    }
    
    try {
      emit('mute_participant', {
        call_id: activeCall.id,
        user_id: userId,
      });
    } catch (error) {
      setLocalError('Failed to mute participant');
    }
  }, [activeCall, user, emit]);
  
  // WebRTC signaling
  const sendWebRTCSignal = useCallback((signal: WebRTCSignal) => {
    if (!activeCall) return;
    
    emit('webrtc_signal', {
      ...signal,
      callId: activeCall.id,
    });
  }, [activeCall, emit]);
  
  // Quality monitoring
  const startQualityMonitoring = useCallback(() => {
    if (qualityMonitorRef.current) return;
    
    qualityMonitorRef.current = setInterval(async () => {
      if (!activeCall || !localStream) return;
      
      try {
        const stats = await getConnectionStats();
        setCallStats(stats);
        
        // Log quality if stats are poor
        if (stats.packetLoss > 0.1 || stats.jitter > 50) {
          useCallStore.getState().logCallQuality(activeCall.id, stats);
        }
      } catch (error) {
        console.error('Failed to get connection stats:', error);
      }
    }, 5000); // Every 5 seconds
  }, [activeCall, localStream]);
  
  const stopQualityMonitoring = useCallback(() => {
    if (qualityMonitorRef.current) {
      clearInterval(qualityMonitorRef.current);
      qualityMonitorRef.current = null;
    }
    setCallStats(null);
  }, []);
  
  // Helper functions
  const isInitiator = !!activeCall && !!user && activeCall.initiated_by.id === user.id;
  
  const isParticipant = useCallback((userId: number) => {
    return participants.some(p => p.user.id === userId);
  }, [participants]);
  
  const getParticipant = useCallback((userId: number) => {
    return participants.find(p => p.user.id === userId);
  }, [participants]);
  
  const clearError = useCallback(() => {
    setLocalError(null);
    clearStoreError();
  }, [clearStoreError]);
  
  // Audio helpers
  const playRingtone = () => {
    const audio = new Audio('/sounds/ringtone.mp3');
    audio.loop = true;
    audio.play().catch(console.error);
    (window as any).ringtoneAudio = audio;
  };
  
  const stopRingtone = () => {
    const audio = (window as any).ringtoneAudio;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  };
  
  // WebRTC helper
  const getVideoSender = (): RTCRtpSender | null => {
    // This would be implemented with the WebRTC service
    return null;
  };
  
  const getConnectionStats = async () => {
    // This would be implemented with the WebRTC service
    return {
      audioLevel: 0,
      videoBitrate: 0,
      audioBitrate: 0,
      packetLoss: 0,
      jitter: 0,
      roundTripTime: 0,
    };
  };
  
  return {
    // State
    activeCall,
    incomingCall,
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
    
    // Call management
    initiateCall,
    joinCall,
    answerCall,
    rejectCall,
    leaveCall,
    endCall,
    
    // Media controls
    toggleMute,
    toggleVideo,
    switchCamera,
    toggleSpeaker,
    
    // Participant management
    kickParticipant,
    muteParticipant,
    
    // WebRTC
    sendWebRTCSignal,
    
    // Quality monitoring
    startQualityMonitoring,
    stopQualityMonitoring,
    
    // UI State
    clearError,
    
    // Helpers
    isInitiator,
    isParticipant,
    getParticipant,
  };
};

// Call-specific selector hooks
export const useCallState = () => {
  const activeCall = useCallStore((state) => state.activeCall);
  const isCallActive = useCallStore((state) => state.isCallActive);
  const isMuted = useCallStore((state) => state.isMuted);
  const hasVideo = useCallStore((state) => state.hasVideo);
  
  return { activeCall, isCallActive, isMuted, hasVideo };
};

export const useCallParticipants = (callId: string) => {
  const participants = useCallStore((state) => state.participants.get(callId) || []);
  const localStream = useCallStore((state) => state.localStream);
  const remoteStreams = useCallStore((state) => state.remoteStreams);
  
  return { participants, localStream, remoteStreams };
};