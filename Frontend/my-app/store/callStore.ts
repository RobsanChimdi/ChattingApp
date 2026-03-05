import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Call, CallParticipant, CallQuality } from '../types/call.types';
import { callService } from '../services/call.service';
import type { WebRTCSignal } from '../types/socket.types';
import { useAuthStore } from './authStore';


interface CallStore {
  // State
  activeCall: Call | null;
  incomingCall: Call | null;
  participants: Map<string, CallParticipant[]>; // callId -> participants
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>; // userId -> stream
  callQuality: Map<string, CallQuality[]>; // callId -> quality logs
  isCallActive: boolean;
  isJoining: boolean;
  isMuted: boolean;
  hasVideo: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  // Call management
  initiateCall: (chatId: string, callType: 'audio' | 'video') => Promise<Call>;
  joinCall: (callId: string) => Promise<void>;
  leaveCall: (callId: string) => Promise<void>;
  endCall: (callId: string) => Promise<void>;
  setActiveCall: (call: Call | null) => void;
  setIncomingCall: (call: Call | null) => void;
  
  // Participant management
  addParticipant: (callId: string, participant: CallParticipant) => void;
  removeParticipant: (callId: string, userId: number) => void;
  updateParticipant: (
    callId: string,
    userId: number,
    updates: Partial<CallParticipant>
  ) => void;
  fetchParticipants: (callId: string) => Promise<void>;
  
  // Media streams
  setLocalStream: (stream: MediaStream | null) => void;
  addRemoteStream: (userId: string, stream: MediaStream) => void;
  removeRemoteStream: (userId: string) => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  startLocalMedia: (withVideo: boolean) => Promise<void>;
  
  // WebRTC
  handleWebRTCSignal: (signal: WebRTCSignal) => void;
  
  // Call quality
  logCallQuality: (callId: string, data: Partial<CallQuality>) => Promise<void>;
  updateCallQuality: (
    callId: string,
    userId: number,
    quality: Partial<CallQuality>
  ) => void;
  
  // Active calls
  fetchActiveCalls: () => Promise<Call[]>;
  
  // UI State
  setJoining: (joining: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Cleanup
  cleanup: () => void;
  cleanupMedia: () => void;
}

export const useCallStore = create<CallStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      activeCall: null,
      incomingCall: null,
      participants: new Map(),
      localStream: null,
      remoteStreams: new Map(),
      callQuality: new Map(),
      isCallActive: false,
      isJoining: false,
      isMuted: false,
      hasVideo: false,
      isLoading: false,
      error: null,
      
      // Call management
      initiateCall: async (chatId, callType) => {
        set({ isLoading: true, error: null });
        
        try {
          const call = await callService.createCall({
            chat: chatId,
            call_type: callType,
          });
          
          set({
            activeCall: call,
            isCallActive: true,
            hasVideo: callType === 'video',
            isLoading: false,
          });
          
          // Add initiator as participant
          get().addParticipant(call.id, {
            id: Date.now().toString(),
            user: useAuthStore.getState().user!,
            call: call.id,
            role: 'initiator',
            joined_at: new Date().toISOString(),
            is_speaking:false,
            is_muted: false,
            has_video: callType === 'video',
          });
          
          return call;
        } catch (error: any) {
          set({
            error: error.response?.data?.error || 'Failed to initiate call',
            isLoading: false,
          });
          throw error;
        }
      },
      
      joinCall: async (callId) => {
        set({ isJoining: true, error: null });
        
        try {
          const participant = await callService.joinCall(callId);
          
          // Fetch call details
          const call = await callService.getCall(callId);
          
          set({
            activeCall: call,
            isCallActive: true,
            isJoining: false,
          });
          
          // Add participant
          get().addParticipant(callId, participant);
          
          // Start local media stream
          await get().startLocalMedia(call.call_type === 'video');
        } catch (error: any) {
          set({
            error: error.response?.data?.error || 'Failed to join call',
            isJoining: false,
          });
          throw error;
        }
      },
      
      leaveCall: async (callId) => {
        try {
          await callService.leaveCall(callId);
          
          set((state) => {
            const newParticipants = new Map(state.participants);
            newParticipants.delete(callId);
            const newCallQuality = new Map(state.callQuality);
            newCallQuality.delete(callId);
            return {
              activeCall: null,
              incomingCall: null,
              isCallActive: false,
              participants: newParticipants,
              callQuality: newCallQuality,
            };
          });
          
          // Cleanup media streams
          get().cleanupMedia();
        } catch (error: any) {
          set({
            error: error.response?.data?.error || 'Failed to leave call',
          });
          throw error;
        }
      },
      
      endCall: async (callId) => {
        set({ isLoading: true, error: null });
        
        try {
          const call = await callService.endCall(callId);
          
          set({
            activeCall: null,
            incomingCall: null,
            isCallActive: false,
            isLoading: false,
          });
          
          // Log call quality before cleanup
          if (get().localStream) {
            await get().logCallQuality(callId, {
              audio_level: 0,
              video_bitrate: 0,
              audio_bitrate: 0,
              packet_loss: 0,
              jitter: 0,
              round_trip_time: 0,
            });
          }
          
          // Cleanup
          get().cleanup();
        } catch (error: any) {
          set({
            error: error.response?.data?.error || 'Failed to end call',
            isLoading: false,
          });
          throw error;
        }
      },
      
      setActiveCall: (call) => {
        set({
          activeCall: call,
          isCallActive: !!call,
        });
      },
      
      setIncomingCall: (call) => {
        set({ incomingCall: call });
      },
      
      // Participant management
      addParticipant: (callId, participant) => {
            set((state) => {
              const callParticipants = state.participants.get(callId) || [];

              const exists = callParticipants.some(
                (p) => p.user.id === participant.user.id
              );

              if (exists) return state;

              return {
                participants: new Map(state.participants).set(callId, [
                  ...callParticipants,
                  participant,
                ]),
              };
            });
          },
      
      removeParticipant: (callId, userId) => {
        set((state) => {
          const callParticipants = state.participants.get(callId);
          if (!callParticipants) return state;
          
          return {
            participants: new Map(state.participants).set(
              callId,
              callParticipants.filter((p) => p.user.id !== userId)
            ),
          };
        });
      },
      
      updateParticipant: (callId, userId, updates) => {
        set((state) => {
          const callParticipants = state.participants.get(callId);
          if (!callParticipants) return state;
          
          return {
            participants: new Map(state.participants).set(
              callId,
              callParticipants.map((p) =>
                p.user.id === userId ? { ...p, ...updates } : p
              ),
            ),
          };
        });
      },
      
      fetchParticipants: async (callId) => {
        try {
          const participants = await callService.getCallParticipants(callId);
          
          set((state) => ({
            participants: new Map(state.participants).set(callId, participants),
          }));
        } catch (error) {
          console.error('Failed to fetch participants:', error);
        }
      },
      
      // Media streams
      setLocalStream: (stream) => {
        set({ localStream: stream });
      },
      
      addRemoteStream: (userId, stream) => {
        set((state) => ({
          remoteStreams: new Map(state.remoteStreams).set(userId, stream),
        }));
      },
      
      removeRemoteStream: (userId) => {
        set((state) => {
          const newStreams = new Map(state.remoteStreams);
          newStreams.delete(userId);
          return { remoteStreams: newStreams };
        });
      },
      
      toggleMute: () => {
        const { localStream, isMuted, activeCall } = get();
        
        if (localStream && activeCall) {
          localStream.getAudioTracks().forEach((track) => {
            track.enabled = isMuted;
          });
          
          // Update participant in store
          get().updateParticipant(activeCall.id, useAuthStore.getState().user!.id, {
            is_muted: !isMuted,
          });
          
          // Call API to update mute status
          callService.toggleMute(activeCall.id).catch(console.error);
          
          set({ isMuted: !isMuted });
        }
      },
      
      toggleVideo: () => {
        const { localStream, hasVideo, activeCall } = get();
        
        if (localStream && activeCall && activeCall.call_type === 'video') {
          localStream.getVideoTracks().forEach((track) => {
            track.enabled = !hasVideo;
          });
          
          // Update participant in store
          get().updateParticipant(activeCall.id, useAuthStore.getState().user!.id, {
            has_video: !hasVideo,
          });
          
          // Call API to update video status
          callService.toggleVideo(activeCall.id).catch(console.error);
          
          set({ hasVideo: !hasVideo });
        }
      },
      
      // Helper method to start local media
      startLocalMedia: async (withVideo: boolean) => {
        try {
          const constraints: MediaStreamConstraints = {
            audio: true,
            video: withVideo ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
            } : false,
          };
          
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          get().setLocalStream(stream);
          set({ hasVideo: withVideo, isMuted: false });
        } catch (error) {
          set({
            error: 'Failed to access media devices. Please check permissions.',
          });
          throw error;
        }
      },
      
      // WebRTC
      handleWebRTCSignal: (signal) => {
        // This will be implemented with the WebRTC service
        console.log('WebRTC signal received:', signal);
        // TODO: Implement WebRTC signaling logic
      },
      
      // Call quality
      logCallQuality: async (callId, data) => {
        try {
          await callService.logCallQuality(callId, data);
          
          set((state) => {
            const qualityLogs = state.callQuality.get(callId) || [];
            return {
              callQuality: new Map(state.callQuality).set(callId, [
                ...qualityLogs,
                { ...data, timestamp: new Date().toISOString() } as CallQuality,
              ]),
            };
          });
        } catch (error) {
          console.error('Failed to log call quality:', error);
        }
      },
      
      updateCallQuality: (callId, userId, quality) => {
        set((state) => {
          const qualityLogs = state.callQuality.get(callId) || [];
          return {
            callQuality: new Map(state.callQuality).set(callId, [
              ...qualityLogs,
              { ...quality, timestamp: new Date().toISOString() } as CallQuality,
            ]),
          };
        });
      },
      
      // Active calls
      fetchActiveCalls: async () => {
        try {
          return await callService.getActiveCalls();
        } catch (error) {
          console.error('Failed to fetch active calls:', error);
          return [];
        }
      },
      
      // UI State
      setJoining: (joining) => set({ isJoining: joining }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
      
      // Cleanup
      cleanup: () => {
        const { localStream, remoteStreams } = get();
        
        // Stop local stream
        if (localStream) {
          localStream.getTracks().forEach((track) => track.stop());
        }
        
        // Stop remote streams
        remoteStreams.forEach((stream) => {
          stream.getTracks().forEach((track) => track.stop());
        });
        
        set({
          activeCall: null,
          incomingCall: null,
          participants: new Map(),
          localStream: null,
          remoteStreams: new Map(),
          isCallActive: false,
          isMuted: false,
          hasVideo: false,
        });
      },
      
      // Cleanup media only
      cleanupMedia: () => {
        const { localStream, remoteStreams } = get();
        
        if (localStream) {
          localStream.getTracks().forEach((track) => track.stop());
        }
        
        remoteStreams.forEach((stream) => {
          stream.getTracks().forEach((track) => track.stop());
        });
        
        set({
          localStream: null,
          remoteStreams: new Map(),
          isMuted: false,
          hasVideo: false,
        });
      },
    }),
    { name: 'call-store' }
  )
);

// Selectors for better performance
export const useActiveCall = () => useCallStore((state) => state.activeCall);
export const useIncomingCall = () => useCallStore((state) => state.incomingCall);
export const useCallParticipants = (callId: string) =>
  useCallStore((state) => state.participants.get(callId) || []);
export const useLocalStream = () => useCallStore((state) => state.localStream);
export const useRemoteStreams = () => useCallStore((state) => state.remoteStreams);
export const useIsCallActive = () => useCallStore((state) => state.isCallActive);
export const useIsMuted = () => useCallStore((state) => state.isMuted);
export const useHasVideo = () => useCallStore((state) => state.hasVideo);
export const useCallLoading = () => useCallStore((state) => state.isLoading);
export const useCallError = () => useCallStore((state) => state.error);