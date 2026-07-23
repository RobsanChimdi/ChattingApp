// hooks/useCall.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCallStore } from '@/store/callStore'; // FIXED import
import { useAuth } from './useAuth';
import { useSocket } from './useSocket';
import { useWebRTC } from './useWebRTC';
import type { Call, CallParticipant, WebRTCSignal, CallQuality } from '@/types';

interface UseCallReturn {
  // State
  activeCall: Call | null;
  incomingCall: Call | null;
  participants: CallParticipant[];
  localStream: MediaStream | null;
  remoteStreams: Map<number, MediaStream>;
  isCallActive: boolean;
  isJoining: boolean;
  isMuted: boolean;
  hasVideo: boolean;
  isLoading: boolean;
  error: string | null;
  callStats: any;
  
  // Call management
  initiateCall: (chatId: number, callType: 'audio' | 'video') => Promise<Call>;
  joinCall: (callId: number) => Promise<void>;
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

export const useCall = (callId?: number): UseCallReturn => {
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
  
  // Initialize WebRTC hook
  const webRTC = useWebRTC(callId);
  
  // Local state
  const [localError, setLocalError] = useState<string | null>(null);
  const [callStats, setCallStats] = useState<any>(null);
  const qualityMonitorRef = useRef<NodeJS.Timeout | null>(null);
  
  // Combined error state
  const error = localError || storeError;
  
  // Get participants for current call
  const participants = activeCall ? storeParticipants.get(activeCall.id) || [] : [];
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (qualityMonitorRef.current) {
        clearInterval(qualityMonitorRef.current);
        qualityMonitorRef.current = null;
      }
      stopRingtone();
      webRTC.cleanup();
    };
  }, [webRTC]);

  // Setup socket listeners
  useEffect(() => {
    const unsubscribeIncomingCall = on('incoming_call', (data: { call: Call }) => {
      if (data.call.initiated_by !== user?.id) {
        setIncomingCall(data.call);
        playRingtone();
      }
    });
    
    const unsubscribeCallEnded = on('call_ended', (data: { call_id: number; reason: string }) => {
      if (activeCall?.id === data.call_id) {
        handleCallEnded(data.reason);
      }
      if (incomingCall?.id === data.call_id) {
        setIncomingCall(null);
        stopRingtone();
      }
    });
    
    const unsubscribeParticipantUpdate = on('participant_updated', 
      (data: { call_id: number; participant: CallParticipant }) => {
        if (activeCall?.id === data.call_id) {
          useCallStore.getState().updateParticipant(data.call_id, data.participant.user.id, data.participant);
        }
      }
    );
    
    const unsubscribeWebRTCSignal = on('webrtc_signal', (signal: WebRTCSignal) => {
      if (activeCall?.id === signal.callId) {
        webRTC.sendWebRTCSignal(signal);
      }
    });
    
    return () => {
      unsubscribeIncomingCall();
      unsubscribeCallEnded();
      unsubscribeParticipantUpdate();
      unsubscribeWebRTCSignal();
      stopQualityMonitoring();
      stopRingtone();
    };
  }, [activeCall?.id, incomingCall?.id, user?.id, on, webRTC]);

  // Auto-join call if callId provided and not in call
  useEffect(() => {
    if (callId && !activeCall && !isCallActive && user) {
      joinCall(callId).catch(console.error);
    }
  }, [callId, activeCall, isCallActive, user]);
  
  // Initialize WebRTC when call becomes active
  useEffect(() => {
    if (activeCall && callId === activeCall.id && localStream) {
      activeCall.participants?.forEach((participant) => {
        if (participant.user.id !== user?.id) {
          webRTC.addRemoteParticipant(participant.user.id).catch(console.error);
        }
      });
    }
  }, [activeCall, callId, localStream, user?.id, webRTC]);
  
  // Handle call ended
  const handleCallEnded = useCallback((reason: string) => {
    if (activeCall) {
      leaveCallAction(activeCall.id).catch(console.error);
    }
    webRTC.cleanup();
    setLocalError(`Call ended: ${reason}`);
    
    setTimeout(() => {
      if (activeCall?.chat) {
        router.push(`/chat/${activeCall.chat}`);
      }
    }, 2000);
  }, [activeCall, leaveCallAction, router, webRTC]);
  
  // Enhanced actions
  const initiateCall = useCallback(async (chatId: number, callType: 'audio' | 'video') => {
    try {
      const call = await initiateCallAction(chatId, callType);
      startQualityMonitoring();
      await webRTC.initLocalStream(callType === 'video');
      return call;
    } catch (error: any) {
      setLocalError(error.message || 'Failed to initiate call');
      throw error;
    }
  }, [initiateCallAction, webRTC]);
  
  const joinCall = useCallback(async (callId: number) => {
    try {
      await joinCallAction(callId);
      startQualityMonitoring();
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
      stopRingtone();
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
      stopRingtone();
      webRTC.cleanup();
      if (activeCall.chat) {
        router.push(`/chat/${activeCall.chat}`);
      }
    } catch (error: any) {
      setLocalError(error.message || 'Failed to leave call');
    }
  }, [activeCall, leaveCallAction, router, webRTC]);
  
  const endCall = useCallback(async () => {
    if (!activeCall) return;
    try {
      await endCallAction(activeCall.id);
      stopQualityMonitoring();
      stopRingtone();
      webRTC.cleanup();
      if (activeCall.chat) {
        router.push(`/chat/${activeCall.chat}`);
      }
    } catch (error: any) {
      setLocalError(error.message || 'Failed to end call');
    }
  }, [activeCall, endCallAction, router, webRTC]);
  
  // Media controls - INTEGRATED with WebRTC
  const toggleMute = useCallback(() => {
    webRTC.toggleAudio(isMuted);
    toggleMuteAction();
  }, [isMuted, webRTC, toggleMuteAction]);
  
  const toggleVideo = useCallback(() => {
    webRTC.toggleVideo(!hasVideo);
    toggleVideoAction();
  }, [hasVideo, webRTC, toggleVideoAction]);
  
  const switchCamera = useCallback(async () => {
    if (!activeCall || activeCall.call_type !== 'video') return;
    try {
      await webRTC.switchCamera();
    } catch (error: any) {
      setLocalError('Failed to switch camera');
    }
  }, [activeCall, webRTC]);
  
  const toggleSpeaker = useCallback(() => {
    console.log('Speaker toggled');
  }, []);
  
  // Participant management
  const kickParticipant = useCallback(async (userId: number) => {
    if (!activeCall || !user) return;
    const isInitiator = activeCall.initiated_by === user.id;
    if (!isInitiator) {
      setLocalError('You do not have permission to kick participants');
      return;
    }
    try {
      emit('kick_participant', { call_id: activeCall.id, user_id: userId });
      webRTC.removeRemoteParticipant(userId);
    } catch (error) {
      setLocalError('Failed to kick participant');
    }
  }, [activeCall, user, emit, webRTC]);
  
  const muteParticipant = useCallback(async (userId: number) => {
    if (!activeCall || !user) return;
    if (activeCall.initiated_by !== user.id) {
      setLocalError('Only call initiator can mute participants');
      return;
    }
    try {
      emit('mute_participant', { call_id: activeCall.id, user_id: userId });
    } catch (error) {
      setLocalError('Failed to mute participant');
    }
  }, [activeCall, user, emit]);
  
  // WebRTC signaling
  const sendWebRTCSignal = useCallback((signal: WebRTCSignal) => {
    if (!activeCall) return;
    webRTC.sendWebRTCSignal(signal);
  }, [activeCall, webRTC]);
  
  // Quality monitoring
  const startQualityMonitoring = useCallback(() => {
    if (qualityMonitorRef.current) return;
    webRTC.startQualityMonitoring();
    
    qualityMonitorRef.current = setInterval(async () => {
      if (!activeCall) return;
      try {
        const connections = webRTC.getActiveConnections();
        const stats = {
          audioLevel: 0,
          videoBitrate: 0,
          audioBitrate: 0,
          packetLoss: 0,
          jitter: 0,
          roundTripTime: 0,
        };
        const qualityPayload: Partial<CallQuality> = {
          latency_ms: stats.roundTripTime,
          jitter_ms: stats.jitter,
          packet_loss: stats.packetLoss,
          audio_bitrate: stats.audioBitrate,
          video_bitrate: stats.videoBitrate,
          audio_level: stats.audioLevel,
          quality_status: stats.packetLoss > 0.1 || stats.jitter > 50 ? 'poor' : 'good',
        };

        setCallStats(stats);
        if (stats.packetLoss > 0.1 || stats.jitter > 50) {
          useCallStore.getState().logCallQuality(activeCall.id, qualityPayload);
        }
      } catch (error) {
        console.error('Failed to get connection stats:', error);
      }
    }, 5000);
  }, [activeCall, webRTC]);
  
  const stopQualityMonitoring = useCallback(() => {
    if (qualityMonitorRef.current) {
      clearInterval(qualityMonitorRef.current);
      qualityMonitorRef.current = null;
    }
    webRTC.stopQualityMonitoring();
    setCallStats(null);
  }, [webRTC]);
  
  // Helper functions
  const isInitiator = !!activeCall && !!user && activeCall.initiated_by === user.id;
  const isParticipant = useCallback((userId: number) => participants.some(p => p.user.id === userId), [participants]);
  const getParticipant = useCallback((userId: number) => participants.find(p => p.user.id === userId), [participants]);
  const clearError = useCallback(() => { setLocalError(null); clearStoreError(); }, [clearStoreError]);
  
  // Audio helpers
  let ringtoneAudio: HTMLAudioElement | null = null;
  const playRingtone = () => {
    try {
      if (!ringtoneAudio) { ringtoneAudio = new Audio('/sounds/ringtone.mp3'); }
      ringtoneAudio.loop = true;
      ringtoneAudio.volume = 0.7;
      ringtoneAudio.play().catch(() => {});
    } catch (error) { console.error('Failed to play ringtone:', error); }
  };
  const stopRingtone = () => {
    if (ringtoneAudio) { ringtoneAudio.pause(); ringtoneAudio.currentTime = 0; ringtoneAudio = null; }
  };
  
  return {
    activeCall, incomingCall, participants, localStream, remoteStreams,
    isCallActive, isJoining, isMuted, hasVideo, isLoading, error, callStats,
    initiateCall, joinCall, answerCall, rejectCall, leaveCall, endCall,
    toggleMute, toggleVideo, switchCamera, toggleSpeaker,
    kickParticipant, muteParticipant,
    sendWebRTCSignal,
    startQualityMonitoring, stopQualityMonitoring,
    clearError,
    isInitiator, isParticipant, getParticipant,
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

export const useCallParticipants = (callId: number) => {
  const participants = useCallStore((state) => state.participants.get(callId) || []);
  const localStream = useCallStore((state) => state.localStream);
  const remoteStreams = useCallStore((state) => state.remoteStreams);
  return { participants, localStream, remoteStreams };
};