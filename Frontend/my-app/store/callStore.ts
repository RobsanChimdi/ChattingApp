// store/call.store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Call, CallParticipant, CallQuality } from '../types/call.types';
import { callService } from '../services/call.service';
import type { WebRTCSignal } from '../types/socket.types';

interface CallStore {
  // State
  activeCall: Call | null;
  incomingCall: Call | null;
  participants: Map<number, CallParticipant[]>;
  localStream: MediaStream | null;
  remoteStreams: Map<number, MediaStream>;
  callQuality: Map<number, CallQuality[]>;
  isCallActive: boolean;
  isJoining: boolean;
  isMuted: boolean;
  hasVideo: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  initiateCall: (chatId: number, callType: 'audio' | 'video') => Promise<Call>;
  joinCall: (callId: number) => Promise<void>;
  leaveCall: (callId: number) => Promise<void>;
  endCall: (callId: number) => Promise<void>;
  setActiveCall: (call: Call | null) => void;
  setIncomingCall: (call: Call | null) => void;
  addParticipant: (callId: number, participant: CallParticipant) => void;
  removeParticipant: (callId: number, userId: number) => void;
  updateParticipant: (callId: number, userId: number, updates: Partial<CallParticipant>) => void;
  fetchParticipants: (callId: number) => Promise<void>;
  setLocalStream: (stream: MediaStream | null) => void;
  addRemoteStream: (userId: number, stream: MediaStream) => void;
  removeRemoteStream: (userId: number) => void;
  toggleMute: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  startLocalMedia: (withVideo: boolean) => Promise<void>;
  handleWebRTCSignal: (signal: WebRTCSignal) => void;
  logCallQuality: (callId: number, data: Partial<CallQuality>) => Promise<void>;
  updateCallQuality: (callId: number, userId: number, quality: Partial<CallQuality>) => void;
  fetchActiveCalls: () => Promise<Call[]>;
  setJoining: (joining: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  cleanup: () => void;
  cleanupMedia: () => void;
  // ADD THESE MISSING METHODS
  setIsMuted: (muted: boolean) => void;
  setHasVideo: (video: boolean) => void;
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
          const call = await callService.getCall(callId);
          
          set({
            activeCall: call,
            isCallActive: true,
            isJoining: false,
          });
          
          get().addParticipant(callId, participant);
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
          get().cleanupMedia();
          
          set({
            activeCall: null,
            incomingCall: null,
            isCallActive: false,
            participants: new Map(),
            callQuality: new Map(),
          });
        } catch (error: any) {
          set({ error: error.response?.data?.error || 'Failed to leave call' });
          throw error;
        }
      },
      
      endCall: async (callId) => {
        set({ isLoading: true, error: null });
        
        try {
          await callService.endCall(callId);
          get().cleanup();
          
          set({
            activeCall: null,
            incomingCall: null,
            isCallActive: false,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error.response?.data?.error || 'Failed to end call',
            isLoading: false,
          });
          throw error;
        }
      },
      
      setActiveCall: (call) => set({ activeCall: call, isCallActive: !!call }),
      setIncomingCall: (call) => set({ incomingCall: call }),
      
      addParticipant: (callId, participant) => {
        set((state) => {
          const callParticipants = state.participants.get(callId) || [];
          const exists = participant.user && callParticipants.some((p) => p.user?.id === participant.user.id);
          if (exists) return state;

          return {
            participants: new Map(state.participants).set(callId, [...callParticipants, participant]),
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
              callParticipants.filter((p) => p.user?.id !== userId)
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
      
      setLocalStream: (stream) => set({ localStream: stream }),
      
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
      
      toggleMute: async () => {
        const { localStream, isMuted, activeCall } = get();
        
        if (localStream && activeCall) {
          localStream.getAudioTracks().forEach((track) => {
            track.enabled = isMuted;
          });
          
          set({ isMuted: !isMuted });
          
          try {
            await callService.toggleMute(activeCall.id);
          } catch (error) {
            console.error('Failed to toggle mute:', error);
          }
        }
      },
      
      toggleVideo: async () => {
        const { localStream, hasVideo, activeCall } = get();
        
        if (localStream && activeCall && activeCall.call_type === 'video') {
          localStream.getVideoTracks().forEach((track) => {
            track.enabled = !hasVideo;
          });
          
          set({ hasVideo: !hasVideo });
          
          try {
            await callService.toggleVideo(activeCall.id);
          } catch (error) {
            console.error('Failed to toggle video:', error);
          }
        }
      },
      
      startLocalMedia: async (withVideo) => {
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
          set({ error: 'Failed to access media devices. Please check permissions.' });
          throw error;
        }
      },
      
      handleWebRTCSignal: (signal) => {
        console.log('WebRTC signal received:', signal);
      },
      
      logCallQuality: async (callId, data) => {
        try {
          await callService.logCallQuality(callId, data);
          
          set((state) => {
            const qualityLogs = state.callQuality.get(callId) || [];
            return {
              callQuality: new Map(state.callQuality).set(callId, [
                ...qualityLogs,
                { ...data, measured_at: new Date().toISOString() } as CallQuality,
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
            callQuality: new Map(state.callQuality).set(callId, [...qualityLogs, quality as CallQuality]),
          };
        });
      },
      
      fetchActiveCalls: async () => {
        try {
          return await callService.getActiveCalls();
        } catch (error) {
          console.error('Failed to fetch active calls:', error);
          return [];
        }
      },
      
      setJoining: (joining) => set({ isJoining: joining }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
      
      // ADD THESE MISSING METHODS
      setIsMuted: (muted) => set({ isMuted: muted }),
      setHasVideo: (video) => set({ hasVideo: video }),
      
      cleanup: () => {
        const { localStream, remoteStreams } = get();
        
        if (localStream) {
          localStream.getTracks().forEach((track) => track.stop());
        }
        
        remoteStreams.forEach((stream) => {
          stream.getTracks().forEach((track) => track.stop());
        });
        
        set({
          activeCall: null,
          incomingCall: null,
          participants: new Map(),
          localStream: null,
          remoteStreams: new Map(),
          callQuality: new Map(),
          isCallActive: false,
          isMuted: false,
          hasVideo: false,
          isJoining: false,
          isLoading: false,
          error: null,
        });
      },
      
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

// Selectors
export const useActiveCall = () => useCallStore((state) => state.activeCall);
export const useIncomingCall = () => useCallStore((state) => state.incomingCall);
export const useCallParticipants = (callId: number) =>
  useCallStore((state) => state.participants.get(callId) || []);
export const useLocalStream = () => useCallStore((state) => state.localStream);
export const useRemoteStreams = () => useCallStore((state) => state.remoteStreams);
export const useIsCallActive = () => useCallStore((state) => state.isCallActive);
export const useIsMuted = () => useCallStore((state) => state.isMuted);
export const useHasVideo = () => useCallStore((state) => state.hasVideo);
export const useCallLoading = () => useCallStore((state) => state.isLoading);
export const useCallError = () => useCallStore((state) => state.error);