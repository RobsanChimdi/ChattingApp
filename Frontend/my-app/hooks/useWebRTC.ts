import { useRef, useEffect, useCallback, useState } from 'react';
import { useCallStore } from '@/store/callStore';
import { useSocket } from './useSocket';
import type { WebRTCSignal, ICEServer } from '@/types/socket.types';

export const useWebRTC = (callId?: string) => {
  // Refs for mutable objects
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const dataChannels = useRef<Map<string, RTCDataChannel>>(new Map());
  const negotiationLock = useRef<Map<string, boolean>>(new Map());
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  const [iceServers, setIceServers] = useState<ICEServer[]>([]);
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { localStream, addRemoteStream, removeRemoteStream } = useCallStore();
  const { emit, on } = useSocket();

  // Fetch ICE servers
  const fetchIceServers = useCallback(async () => {
    try {
      setIceServers([
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]);
    } catch {
      setError('Failed to fetch ICE servers');
    }
  }, []);

  useEffect(() => {
    fetchIceServers();
  }, [fetchIceServers]);

  // Socket listeners
  useEffect(() => {
    const offOffer = on('webrtc_offer', handleIncomingOffer);
    const offAnswer = on('webrtc_answer', handleIncomingAnswer);
    const offCandidate = on('webrtc_candidate', handleIncomingCandidate);

    return () => {
      offOffer(); offAnswer(); offCandidate();
    };
  }, [on]);

  // Create PeerConnection
  const createPeerConnection = useCallback((userId: string) => {
    if (peerConnections.current.has(userId)) {
      peerConnections.current.get(userId)?.close();
    }

    const pc = new RTCPeerConnection({ iceServers });

    // Local tracks
    if (localStream) {
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }

    // ICE candidate
    pc.onicecandidate = e => {
      if (e.candidate && callId) {
        emit('webrtc_candidate', { callId, targetUserId: userId, candidate: e.candidate.toJSON() });
      }
    };

    pc.ontrack = e => {
      if (e.streams?.[0]) addRemoteStream(userId, e.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        removeRemoteStream(userId);
      }
    };

    pc.onnegotiationneeded = async () => {
      if (negotiationLock.current.get(userId)) return;
      negotiationLock.current.set(userId, true);
      try {
        await handleNegotiationNeeded(userId);
      } catch (err) {
        console.error(err);
        setError('Negotiation failed');
      } finally {
        negotiationLock.current.set(userId, false);
      }
    };

    peerConnections.current.set(userId, pc);
    return pc;
  }, [iceServers, localStream, callId, emit, addRemoteStream, removeRemoteStream]);

  // Handle negotiation needed
  const handleNegotiationNeeded = useCallback(async (userId: string) => {
    const pc = peerConnections.current.get(userId);
    if (!pc || pc.signalingState !== 'stable') return;

    try {
      setIsNegotiating(true);
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);

      // Send offer
      if (callId) emit('webrtc_offer', { callId, targetUserId: userId, offer });
    } finally {
      setIsNegotiating(false);
    }
  }, [callId, emit]);

  // Handle remote offer
  const handleIncomingOffer = useCallback(async (data: { userId: string; offer: RTCSessionDescriptionInit }) => {
    const pc = peerConnections.current.get(data.userId) || createPeerConnection(data.userId);
    await pc.setRemoteDescription(data.offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    if (callId) emit('webrtc_answer', { callId, targetUserId: data.userId, answer });
  }, [createPeerConnection, callId, emit]);

  // Handle remote answer
  const handleIncomingAnswer = useCallback(async (data: { userId: string; answer: RTCSessionDescriptionInit }) => {
    const pc = peerConnections.current.get(data.userId);
    if (!pc) return;
    await pc.setRemoteDescription(data.answer);
  }, []);

  // Handle ICE candidate
  const handleIncomingCandidate = useCallback(async (data: { userId: string; candidate: RTCIceCandidateInit }) => {
    const pc = peerConnections.current.get(data.userId);
    if (!pc || !pc.remoteDescription) {
      // Queue candidate
      const pending = pendingCandidates.current.get(data.userId) || [];
      pending.push(data.candidate);
      pendingCandidates.current.set(data.userId, pending);
      return;
    }

    try {
      await pc.addIceCandidate(data.candidate);
    } catch (err) { console.error(err); }
  }, []);

  // Cleanup
  const closeAllConnections = useCallback(() => {
    peerConnections.current.forEach((pc, userId) => {
      pc.close();
      removeRemoteStream(userId);
    });
    peerConnections.current.clear();
    dataChannels.current.forEach(dc => dc.close());
    dataChannels.current.clear();
    pendingCandidates.current.clear();
    negotiationLock.current.clear();
  }, [removeRemoteStream]);

  return {
    peerConnections: peerConnections.current,
    dataChannels: dataChannels.current,
    iceServers,
    isNegotiating,
    error,
    createPeerConnection,
    closeAllConnections,
  };
};
