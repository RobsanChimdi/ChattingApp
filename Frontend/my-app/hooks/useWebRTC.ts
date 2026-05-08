// hooks/useWebRTC.ts
import { useRef, useEffect, useCallback, useState } from 'react';
import { useCallStore } from '@/store/callStore'; // FIXED import
import { useSocket } from './useSocket';
import { webRTCPeer } from '@/webrtc/peer'; // FIXED path
import { mediaService } from '@/webrtc/media'; // FIXED path
import type { WebRTCSignal, ICEServer } from '@/types/socket.types';
import type { CallQuality } from '@/types/call.types';

export const useWebRTC = (callId?: number) => {
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qualityMonitorRef = useRef<NodeJS.Timeout | null>(null);

  const { 
    localStream, 
    addRemoteStream, 
    removeRemoteStream,
    activeCall,
    updateCallQuality 
  } = useCallStore();
  
  const { emit, on } = useSocket();

  // Initialize WebRTC peer event handlers
  useEffect(() => {
    // Handle remote stream from peer
    webRTCPeer.onRemoteStream = (peerId: number, stream: MediaStream) => {
      console.log(`Received remote stream from ${peerId}`);
      addRemoteStream(peerId, stream);
    };

    // Handle remote stream ended
    webRTCPeer.onRemoteStreamEnded = (peerId: number) => {
      console.log(`Remote stream ended for ${peerId}`);
      removeRemoteStream(peerId);
    };

    // Handle data channel messages
    webRTCPeer.onDataChannelMessage = (peerId: number, message: any) => {
      console.log(`Data channel message from ${peerId}:`, message);
    };

    // Handle peer connection
    webRTCPeer.onPeerConnected = (peerId: number) => {
      console.log(`Peer ${peerId} connected`);
      if (callId) {
        emit('peer_ready', { callId, peerId });
      }
    };

    // Handle peer disconnection
    webRTCPeer.onPeerDisconnected = (peerId: number) => {
      console.log(`Peer ${peerId} disconnected`);
      removeRemoteStream(peerId);
    };

    // Handle ICE candidates
    webRTCPeer.onIceCandidate = (peerId: number, candidate: RTCIceCandidate) => {
      if (callId) {
        emit('webrtc_candidate', {
          callId,
          targetUserId: peerId,
          candidate: candidate.toJSON()
        });
      }
    };

    // Handle negotiation needed
    webRTCPeer.onNegotiationNeeded = async (peerId: number) => {
      if (!callId) return;
      
      setIsNegotiating(true);
      try {
        const offer = await webRTCPeer.createOffer(peerId);
        emit('webrtc_offer', {
          callId,
          targetUserId: peerId,
          offer
        });
      } catch (error) {
        console.error('Error creating offer:', error);
        setError('Failed to create offer');
      } finally {
        setIsNegotiating(false);
      }
    };

    // Handle connection quality updates
    webRTCPeer.onConnectionQuality = (peerId: number, quality) => {
      if (callId && activeCall) {
        const qualityData: Partial<CallQuality> = {
          latency_ms: quality.roundTripTime,
          jitter_ms: quality.jitter,
          packet_loss: quality.packetsLost / (quality.packetsSent || 1),
          audio_level: quality.audioLevel,
        };
        updateCallQuality(callId, peerId, qualityData);
      }
    };

    return () => {
      webRTCPeer.onRemoteStream = null;
      webRTCPeer.onRemoteStreamEnded = null;
      webRTCPeer.onDataChannelMessage = null;
      webRTCPeer.onPeerConnected = null;
      webRTCPeer.onPeerDisconnected = null;
      webRTCPeer.onIceCandidate = null;
      webRTCPeer.onNegotiationNeeded = null;
      webRTCPeer.onConnectionQuality = null;
    };
  }, [callId, activeCall, emit, addRemoteStream, removeRemoteStream, updateCallQuality]);

  // Set local stream when it changes
  useEffect(() => {
    if (localStream) {
      webRTCPeer.setLocalStream(localStream);
    }
  }, [localStream]);

  // Socket event handlers for WebRTC signaling
  useEffect(() => {
    if (!callId) return;

    // Handle incoming offer
    const offOffer = on('webrtc_offer', async (data: { 
      callId: number; 
      targetUserId: number; 
      offer: RTCSessionDescriptionInit 
    }) => {
      if (data.callId !== callId) return;
      
      try {
        if (!webRTCPeer.hasConnection(data.targetUserId)) {
          await webRTCPeer.createPeerConnection(data.targetUserId, {
            peerId: data.targetUserId.toString(),
            userId: data.targetUserId.toString(),
            isInitiator: false,
          });
        }
        
        const answer = await webRTCPeer.createAnswer(data.targetUserId, data.offer);
        emit('webrtc_answer', {
          callId,
          targetUserId: data.targetUserId,
          answer
        });
      } catch (error) {
        console.error('Error handling offer:', error);
        setError('Failed to handle offer');
      }
    });

    // Handle incoming answer
    const offAnswer = on('webrtc_answer', async (data: { 
      callId: number; 
      targetUserId: number; 
      answer: RTCSessionDescriptionInit 
    }) => {
      if (data.callId !== callId) return;
      
      try {
        await webRTCPeer.setRemoteDescription(data.targetUserId, data.answer);
      } catch (error) {
        console.error('Error handling answer:', error);
        setError('Failed to handle answer');
      }
    });

    // Handle incoming ICE candidate
    const offCandidate = on('webrtc_candidate', async (data: { 
      callId: number; 
      targetUserId: number; 
      candidate: RTCIceCandidateInit 
    }) => {
      if (data.callId !== callId) return;
      
      try {
        await webRTCPeer.addIceCandidate(data.targetUserId, data.candidate);
      } catch (error) {
        console.error('Error handling ICE candidate:', error);
      }
    });

    return () => {
      offOffer();
      offAnswer();
      offCandidate();
    };
  }, [callId, emit, on]);

  // Initialize local media stream
  const initLocalStream = useCallback(async (withVideo: boolean) => {
    try {
      const stream = await mediaService.getLocalStream({
        audio: true,
        video: withVideo,
        videoConstraints: withVideo ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        } : undefined,
      });
      webRTCPeer.setLocalStream(stream);
      useCallStore.getState().setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('Error getting local stream:', error);
      setError('Failed to access camera/microphone');
      throw error;
    }
  }, []);

  // Add remote participant
  const addRemoteParticipant = useCallback(async (userId: number) => {
    if (webRTCPeer.hasConnection(userId)) {
      console.log('Peer connection already exists for', userId);
      return;
    }

    try {
      await webRTCPeer.createPeerConnection(userId, {
        peerId: userId.toString(),
        userId: userId.toString(),
        isInitiator: true,
      });
    } catch (error) {
      console.error('Error creating peer connection:', error);
      setError('Failed to connect to participant');
    }
  }, []);

  // Remove remote participant
  const removeRemoteParticipant = useCallback((userId: number) => {
    webRTCPeer.closeConnection(userId);
    removeRemoteStream(userId);
  }, [removeRemoteStream]);

  // Send WebRTC signal
  const sendWebRTCSignal = useCallback((signal: WebRTCSignal) => {
    if (!callId) return;
    
    switch (signal.type) {
      case 'offer':
        emit('webrtc_offer', {
          callId,
          targetUserId: signal.targetId,
          offer: signal.data,
        });
        break;
      case 'answer':
        emit('webrtc_answer', {
          callId,
          targetUserId: signal.targetId,
          answer: signal.data,
        });
        break;
      case 'candidate':
        emit('webrtc_candidate', {
          callId,
          targetUserId: signal.targetId,
          candidate: signal.data,
        });
        break;
      default:
        console.warn('Unknown signal type:', signal.type);
    }
  }, [callId, emit]);

  // Send message via data channel
  const sendDataMessage = useCallback((userId: number, message: any): boolean => {
    return webRTCPeer.sendDataMessage(userId, message);
  }, []);

  // Toggle audio mute
  const toggleAudio = useCallback((enabled: boolean) => {
    webRTCPeer.toggleAudio(enabled);
    useCallStore.getState().setIsMuted(!enabled);
  }, []);

  // Toggle video
  const toggleVideo = useCallback((enabled: boolean) => {
    webRTCPeer.toggleVideo(enabled);
    useCallStore.getState().setHasVideo(enabled);
  }, []);

  // Switch camera
  const switchCamera = useCallback(async () => {
    await mediaService.switchCamera();
    const newStream = mediaService.getCurrentLocalStream();
    if (newStream) {
      webRTCPeer.setLocalStream(newStream);
      useCallStore.getState().setLocalStream(newStream);
    }
  }, []);

  // Start quality monitoring
  const startQualityMonitoring = useCallback(() => {
    if (qualityMonitorRef.current) return;
    
    qualityMonitorRef.current = setInterval(async () => {
      if (!callId) return;
      
      const connections = webRTCPeer.getActiveConnections();
      for (const conn of connections) {
        try {
          const quality = webRTCPeer.getConnectionQuality(parseInt(conn.peerId));
          
          if (quality) {
            const qualityData: Partial<CallQuality> = {
              latency_ms: quality.roundTripTime,
              jitter_ms: quality.jitter,
              packet_loss: quality.packetsLost / (quality.packetsSent || 1),
              audio_level: quality.audioLevel,
            };
            updateCallQuality(callId, parseInt(conn.peerId), qualityData);
          }
        } catch (error) {
          console.error('Error getting connection stats:', error);
        }
      }
    }, 5000);
  }, [callId, updateCallQuality]);

  // Stop quality monitoring
  const stopQualityMonitoring = useCallback(() => {
    if (qualityMonitorRef.current) {
      clearInterval(qualityMonitorRef.current);
      qualityMonitorRef.current = null;
    }
  }, []);

  // Cleanup all connections
  const cleanup = useCallback(() => {
    stopQualityMonitoring();
    webRTCPeer.destroy();
    mediaService.stopAll();
  }, [stopQualityMonitoring]);

  // Get connection stats
  const getConnectionStats = useCallback(async (userId: number) => {
    try {
      return await webRTCPeer.getConnectionStats(userId);
    } catch (error) {
      console.error('Error getting connection stats:', error);
      return null;
    }
  }, []);

  // Get all active connections
  const getActiveConnections = useCallback(() => {
    return webRTCPeer.getActiveConnections();
  }, []);

  return {
    isNegotiating,
    error,
    initLocalStream,
    getLocalStream: () => webRTCPeer.getLocalStream(),
    toggleAudio,
    toggleVideo,
    switchCamera,
    addRemoteParticipant,
    removeRemoteParticipant,
    getActiveConnections,
    sendWebRTCSignal,
    sendDataMessage,
    getConnectionStats,
    hasConnection: (userId: number) => webRTCPeer.hasConnection(userId),
    startQualityMonitoring,
    stopQualityMonitoring,
    cleanup,
  };
};