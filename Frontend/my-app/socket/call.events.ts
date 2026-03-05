import { socketService } from './socket';
import { useCallStore } from '@/store/callStore';
import type { 
  Call, 
  CallParticipant, 
  WebRTCSignal,
  CallQuality,
  CallStatus  // Import the CallStatus type
} from '@/types';

// Define call statuses if not already defined in your types
const CALL_STATUSES = {
  INITIATED: 'initiated',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  MISSED: 'missed',
  REJECTED: 'rejected',
  FAILED: 'failed',
} as const;

export const setupCallEvents = () => {
  const callStore = useCallStore.getState();

  // 📞 Incoming call notification
  socketService.on('incoming_call', (data: { call: Call }) => {
    callStore.setIncomingCall(data.call);
    
    // Play ringtone for incoming call
    playRingtone();
  });

  // 📞 Call initiated (when user starts a call)
  socketService.on('call_initiated', (data: { call: Call }) => {
    callStore.setActiveCall(data.call);
  });

  // ✅ Call accepted by participant
  socketService.on('call_accepted', (data: { 
    call_id: string; 
    participant: CallParticipant 
  }) => {
    callStore.addParticipant(data.call_id, data.participant);
    
    // Stop ringtone if this is our acceptance
    stopRingtone();
  });

  // ❌ Call rejected
  socketService.on('call_rejected', (data: { 
    call_id: string; 
    user_id: number;
    reason?: string;
  }) => {
    callStore.removeParticipant(data.call_id, data.user_id);
    
    // Show rejection notification
    if (data.reason) {
      console.log(`Call rejected: ${data.reason}`);
    }
    
    // Stop ringtone
    stopRingtone();
  });

  // 📵 Call ended
  socketService.on('call_ended', (data: { 
    call_id: string; 
    reason: string;
    ended_by?: number;
  }) => {
    callStore.cleanup();
    
    // Stop ringtone
    stopRingtone();
  });

  // 👤 Participant joined call
  socketService.on('participant_joined', (data: { 
    call_id: string; 
    participant: CallParticipant 
  }) => {
    callStore.addParticipant(data.call_id, data.participant);
  });

  // 👋 Participant left call
  socketService.on('participant_left', (data: { 
    call_id: string; 
    user_id: number;
    reason?: string;
  }) => {
    callStore.removeParticipant(data.call_id, data.user_id);
  });

  // 🔇 Participant muted/unmuted
  socketService.on('participant_muted', (data: { 
    call_id: string; 
    user_id: number; 
    is_muted: boolean 
  }) => {
    callStore.updateParticipant(data.call_id, data.user_id, {
      is_muted: data.is_muted,
    });
  });

  // 📹 Participant video toggled
  socketService.on('participant_video_toggled', (data: { 
    call_id: string; 
    user_id: number; 
    has_video: boolean 
  }) => {
    callStore.updateParticipant(data.call_id, data.user_id, {
      has_video: data.has_video,
    });
  });

  // 📡 WebRTC signaling
  socketService.on('webrtc_signal', (data: WebRTCSignal) => {
    // Forward to WebRTC service for handling
    callStore.handleWebRTCSignal(data);
  });

  // 📊 Call quality updates
  socketService.on('call_quality_update', (data: {
    call_id: string;
    user_id: number;
    quality: Partial<CallQuality>;
  }) => {
    callStore.updateCallQuality(data.call_id, data.user_id, data.quality);
  });

  // 🔄 Call status updated
  socketService.on('call_status_updated', (data: {
    call_id: string;
    status: CallStatus; // Use the specific CallStatus type
    updated_at: string;
  }) => {
    // Update call status in store if active
    const { activeCall } = callStore;
    if (activeCall && activeCall.id === data.call_id) {
      callStore.setActiveCall({
        ...activeCall,
        status: data.status,
        updated_at: data.updated_at,
      });
    }
  });

  // ---------- EMITTERS ----------

  const initiateCall = (chatId: string, callType: 'audio' | 'video') => {
    socketService.emit('initiate_call', {
      chat_id: chatId,
      call_type: callType,
    });
  };

  const acceptCall = (callId: string) => {
    socketService.emit('accept_call', {
      call_id: callId,
    });
  };

  const rejectCall = (callId: string, reason?: string) => {
    socketService.emit('reject_call', {
      call_id: callId,
      reason: reason,
    });
  };

  const endCall = (callId: string) => {
    socketService.emit('end_call', {
      call_id: callId,
    });
  };

  const joinCall = (callId: string) => {
    socketService.emit('join_call', {
      call_id: callId,
    });
  };

  const leaveCall = (callId: string) => {
    socketService.emit('leave_call', {
      call_id: callId,
    });
  };

  const toggleMute = (callId: string, isMuted: boolean) => {
    socketService.emit('toggle_mute', {
      call_id: callId,
      is_muted: isMuted,
    });
  };

  const toggleVideo = (callId: string, hasVideo: boolean) => {
    socketService.emit('toggle_video', {
      call_id: callId,
      has_video: hasVideo,
    });
  };

  const sendWebRTCSignal = (signal: WebRTCSignal) => {
    socketService.emit('webrtc_signal', signal);
  };

  const logCallQuality = (callId: string, qualityData: Partial<CallQuality>) => {
    socketService.emit('log_call_quality', {
      call_id: callId,
      ...qualityData,
    });
  };

  // Ringtone management
  let ringtoneAudio: HTMLAudioElement | null = null;

  const playRingtone = () => {
    try {
      if (!ringtoneAudio) {
          ringtoneAudio = new Audio('/sounds/ringtone.mp3');
        }
      ringtoneAudio.loop = true;
      ringtoneAudio.volume = 0.7;
      ringtoneAudio.play().catch(() => {
        // Silent fail if audio can't play
      });
    } catch (error) {
      console.error('Failed to play ringtone:', error);
    }
  };

  const stopRingtone = () => {
    if (ringtoneAudio) {
      ringtoneAudio.pause();
      ringtoneAudio.currentTime = 0;
      ringtoneAudio = null;
    }
  };

  return {
    // Call management
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    joinCall,
    leaveCall,
    
    // Media controls
    toggleMute,
    toggleVideo,
    
    // WebRTC
    sendWebRTCSignal,
    
    // Quality monitoring
    logCallQuality,
    
    // Room management
    joinCallRoom: (callId: string) => {
      socketService.emit('join_call_room', { call_id: callId });
    },
    
    leaveCallRoom: (callId: string) => {
      socketService.emit('leave_call_room', { call_id: callId });
    },
    
    // Cleanup
    cleanup: () => {
      stopRingtone();
    },
  };
};

// Singleton instance
let callEventsInstance: ReturnType<typeof setupCallEvents> | null = null;

export const getCallEvents = () => {
  if (!callEventsInstance) {
    callEventsInstance = setupCallEvents();
  }
  return callEventsInstance;
};