// services/webrtc/peer.ts
import { mediaService, MediaConstraints } from './media';

export interface PeerConfig {
  peerId: string;
  userId: string;
  isInitiator: boolean;
  mediaStream?: MediaStream;
  constraints?: MediaStreamConstraints;
  iceServers?: RTCIceServer[];
  dataChannelConfig?: RTCDataChannelInit;
}

export interface PeerConnection {
  peerId: string;
  pc: RTCPeerConnection;
  stream?: MediaStream;
  dataChannel?: RTCDataChannel;
  isConnected: boolean;
  iceCandidates: RTCIceCandidate[];
  isNegotiating: boolean;
}

export interface DataChannelMessage {
  type: string;
  payload: any;
  timestamp: number;
}

export interface ConnectionStats {
  audio: RTCStatsReport | null;
  video: RTCStatsReport | null;
  transport: RTCStatsReport | null;
  timestamp: number;
}

export interface ConnectionQuality {
  audioLevel: number;
  bitrate: number;
  packetsLost: number;
  packetsSent: number;
  roundTripTime: number;
  jitter: number;
}

class WebRTCPeer {
  private connections: Map<string, PeerConnection> = new Map();
  private localStream?: MediaStream;
  private configuration: RTCConfiguration;
  private statsInterval: NodeJS.Timeout | null = null;
  private connectionQualities: Map<string, ConnectionQuality> = new Map();

  // Event callbacks
  public onRemoteStream: ((peerId: string, stream: MediaStream) => void) | null = null;
  public onRemoteStreamEnded: ((peerId: string) => void) | null = null;
  public onDataChannelMessage: ((peerId: string, message: DataChannelMessage) => void) | null = null;
  public onDataChannelOpen: ((peerId: string) => void) | null = null;
  public onDataChannelClose: ((peerId: string) => void) | null = null;
  public onPeerConnected: ((peerId: string) => void) | null = null;
  public onPeerDisconnected: ((peerId: string) => void) | null = null;
  public onIceCandidate: ((peerId: string, candidate: RTCIceCandidate) => void) | null = null;
  public onNegotiationNeeded: ((peerId: string) => void) | null = null;
  public onSignalingStateChange: ((peerId: string, state: RTCSignalingState) => void) | null = null;
  public onConnectionQuality: ((peerId: string, quality: ConnectionQuality) => void) | null = null;

  constructor(config?: RTCConfiguration) {
    this.configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
      ],
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      iceCandidatePoolSize: 10,
      ...config,
    };

    if (!this.isWebRTCSupported()) {
      throw new Error('WebRTC is not supported in this browser');
    }

    // Start stats collection
    this.startStatsCollection();
  }

  private isWebRTCSupported(): boolean {
    return !!(window.RTCPeerConnection && 
              window.RTCSessionDescription && 
              window.RTCIceCandidate);
  }

  // Initialize local media
  async initializeLocalStream(constraints: MediaConstraints = {
    audio: true,
    video: true,
  }): Promise<MediaStream> {
    try {
      this.localStream = await mediaService.getLocalStream(constraints);
      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }

  // Create peer connection
  async createPeerConnection(peerId: string, config: Partial<PeerConfig> = {}): Promise<RTCPeerConnection> {
    // Close existing connection if any
    if (this.connections.has(peerId)) {
      this.closeConnection(peerId);
    }

    const pc = new RTCPeerConnection({
      ...this.configuration,
      iceServers: config.iceServers || this.configuration.iceServers,
    });

    // Setup event handlers
    this.setupPeerConnectionEvents(pc, peerId, config.isInitiator || false);

    // Add local stream tracks if available
    const stream = config.mediaStream || this.localStream;
    if (stream) {
      this.addLocalStreamToConnection(pc, stream);
    }

    // Create or setup data channel
    if (config.isInitiator) {
      this.createDataChannel(pc, peerId, config.dataChannelConfig);
    }

    // Store connection
    this.connections.set(peerId, {
      peerId,
      pc,
      isConnected: false,
      iceCandidates: [],
      isNegotiating: false,
    });

    return pc;
  }

  private setupPeerConnectionEvents(pc: RTCPeerConnection, peerId: string, isInitiator: boolean): void {
    // ICE candidate handling
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const conn = this.connections.get(peerId);
        if (conn) {
          conn.iceCandidates.push(event.candidate);
        }
        
        if (this.onIceCandidate) {
          this.onIceCandidate(peerId, event.candidate);
        }
      } else {
        // No more candidates
        console.log(`ICE gathering complete for ${peerId}`);
      }
    };

    // ICE connection state change
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log(`ICE connection state for ${peerId}:`, state);

      const conn = this.connections.get(peerId);
      if (!conn) return;

      switch (state) {
        case 'connected':
        case 'completed':
          conn.isConnected = true;
          if (this.onPeerConnected) {
            this.onPeerConnected(peerId);
          }
          break;
          
        case 'disconnected':
          console.warn(`Connection ${peerId} disconnected, attempting to reconnect...`);
          break;
          
        case 'failed':
          console.error(`Connection ${peerId} failed`);
          this.handleConnectionFailure(peerId);
          break;
          
        case 'closed':
          conn.isConnected = false;
          if (this.onPeerDisconnected) {
            this.onPeerDisconnected(peerId);
          }
          this.connections.delete(peerId);
          break;
      }
    };

    // ICE gathering state change
    pc.onicegatheringstatechange = () => {
      console.log(`ICE gathering state for ${peerId}:`, pc.iceGatheringState);
    };

    // Signaling state change
    pc.onsignalingstatechange = () => {
      console.log(`Signaling state for ${peerId}:`, pc.signalingState);
      if (this.onSignalingStateChange) {
        this.onSignalingStateChange(peerId, pc.signalingState);
      }
    };

    // Negotiation needed
    pc.onnegotiationneeded = async () => {
      const conn = this.connections.get(peerId);
      if (!conn || conn.isNegotiating) return;

      conn.isNegotiating = true;
      try {
        if (this.onNegotiationNeeded) {
          this.onNegotiationNeeded(peerId);
        }
      } finally {
        conn.isNegotiating = false;
      }
    };

    // Track handling for remote streams
    pc.ontrack = (event) => {
      console.log('Received remote track from:', peerId, event.track.kind);
      
      if (event.streams && event.streams.length > 0) {
        const stream = event.streams[0];
        const conn = this.connections.get(peerId);
        if (conn) {
          conn.stream = stream;
        }
        
        // Listen for track ended
        event.track.onended = () => {
          console.log(`Track ended for ${peerId}`);
          if (this.onRemoteStreamEnded) {
            this.onRemoteStreamEnded(peerId);
          }
        };

        if (this.onRemoteStream) {
          this.onRemoteStream(peerId, stream);
        }
      }
    };

    // Data channel
    if (!isInitiator) {
      pc.ondatachannel = (event) => {
        this.setupDataChannel(event.channel, peerId);
      };
    }
  }

  private addLocalStreamToConnection(pc: RTCPeerConnection, stream: MediaStream): void {
    stream.getTracks().forEach(track => {
      const sender = pc.getSenders().find(s => s.track?.kind === track.kind);
      
      if (sender) {
        // Replace existing track
        sender.replaceTrack(track);
      } else {
        // Add new track
        pc.addTrack(track, stream);
      }
    });
  }

  private createDataChannel(pc: RTCPeerConnection, peerId: string, config?: RTCDataChannelInit): void {
    const dataChannel = pc.createDataChannel('data', {
      ordered: true,
      maxPacketLifeTime: 3000,
      maxRetransmits: 3,
      protocol: 'json',
      negotiated: false,
      ...config,
    });

    this.setupDataChannel(dataChannel, peerId);
    
    const conn = this.connections.get(peerId);
    if (conn) {
      conn.dataChannel = dataChannel;
    }
  }

  private setupDataChannel(channel: RTCDataChannel, peerId: string): void {
    channel.onopen = () => {
      console.log(`Data channel opened for ${peerId}`);
      const conn = this.connections.get(peerId);
      if (conn) {
        conn.isConnected = true;
      }
      
      if (this.onDataChannelOpen) {
        this.onDataChannelOpen(peerId);
      }
    };

    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const message: DataChannelMessage = {
          ...data,
          timestamp: Date.now(),
        };
        
        if (this.onDataChannelMessage) {
          this.onDataChannelMessage(peerId, message);
        }
      } catch (error) {
        console.error('Error parsing data channel message:', error, event.data);
      }
    };

    channel.onclose = () => {
      console.log(`Data channel closed for ${peerId}`);
      const conn = this.connections.get(peerId);
      if (conn) {
        conn.isConnected = false;
      }
      
      if (this.onDataChannelClose) {
        this.onDataChannelClose(peerId);
      }
    };

    channel.onerror = (error) => {
      console.error(`Data channel error for ${peerId}:`, error);
    };

    const conn = this.connections.get(peerId);
    if (conn) {
      conn.dataChannel = channel;
    }
  }

  // Create offer
  async createOffer(peerId: string, options?: RTCOfferOptions): Promise<RTCSessionDescriptionInit> {
    const conn = this.connections.get(peerId);
    if (!conn) {
      throw new Error(`No connection found for peer: ${peerId}`);
    }

    const offerOptions: RTCOfferOptions = {
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
      iceRestart: false,
      ...options,
    };

    try {
      const offer = await conn.pc.createOffer(offerOptions);
      await conn.pc.setLocalDescription(offer);
      return offer;
    } catch (error) {
      console.error('Error creating offer:', error);
      throw error;
    }
  }

  // Create answer
  async createAnswer(peerId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    const conn = this.connections.get(peerId);
    if (!conn) {
      throw new Error(`No connection found for peer: ${peerId}`);
    }

    try {
      await conn.pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await conn.pc.createAnswer();
      await conn.pc.setLocalDescription(answer);
      return answer;
    } catch (error) {
      console.error('Error creating answer:', error);
      throw error;
    }
  }

  // Set remote description
  async setRemoteDescription(peerId: string, description: RTCSessionDescriptionInit): Promise<void> {
    const conn = this.connections.get(peerId);
    if (!conn) {
      throw new Error(`No connection found for peer: ${peerId}`);
    }

    try {
      await conn.pc.setRemoteDescription(new RTCSessionDescription(description));
      
      // Add pending ICE candidates
      for (const candidate of conn.iceCandidates) {
        await conn.pc.addIceCandidate(candidate);
      }
      conn.iceCandidates = [];
    } catch (error) {
      console.error('Error setting remote description:', error);
      throw error;
    }
  }

  // Add ICE candidate
  async addIceCandidate(peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const conn = this.connections.get(peerId);
    if (!conn) {
      // Store candidate for later if connection doesn't exist yet
      const newConn = this.connections.get(peerId);
      if (newConn) {
        newConn.iceCandidates.push(new RTCIceCandidate(candidate));
      }
      return;
    }

    try {
      await conn.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
      // Store candidate for later if remote description not set yet
      if (conn.pc.remoteDescription) {
        throw error;
      } else {
        conn.iceCandidates.push(new RTCIceCandidate(candidate));
      }
    }
  }

  // Send message via data channel
  sendDataMessage(peerId: string, message: any): boolean {
    const conn = this.connections.get(peerId);
    if (!conn || !conn.dataChannel || conn.dataChannel.readyState !== 'open') {
      return false;
    }

    try {
      const data: DataChannelMessage = {
        type: typeof message === 'object' ? message.type || 'message' : 'message',
        payload: message,
        timestamp: Date.now(),
      };
      
      conn.dataChannel.send(JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error sending data channel message:', error);
      return false;
    }
  }

  // Update local stream
  async updateLocalStream(constraints?: MediaConstraints): Promise<void> {
    if (constraints) {
      this.localStream = await mediaService.getLocalStream(constraints);
    }

    // Update all active connections
    this.connections.forEach(conn => {
      if (this.localStream) {
        this.addLocalStreamToConnection(conn.pc, this.localStream);
      }
    });
  }

  // Toggle audio
  toggleAudio(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  // Toggle video
  toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  // Get connection stats
  async getConnectionStats(peerId: string): Promise<ConnectionStats> {
    const conn = this.connections.get(peerId);
    if (!conn) {
      throw new Error(`No connection found for peer: ${peerId}`);
    }

    try {
      const stats = await conn.pc.getStats();
      const result: ConnectionStats = {
        audio: null,
        video: null,
        transport: null,
        timestamp: Date.now(),
      };

      stats.forEach(report => {
        if (report.type === 'inbound-rtp' || report.type === 'outbound-rtp') {
          const kind = (report as any).kind;
          if (kind === 'audio') {
            result.audio = report;
          } else if (kind === 'video') {
            result.video = report;
          }
        } else if (report.type === 'transport') {
          result.transport = report;
        }
      });

      return result;
    } catch (error) {
      console.error('Error getting connection stats:', error);
      throw error;
    }
  }

  // Collect connection quality metrics
  private async collectConnectionQuality(peerId: string): Promise<void> {
    try {
      const stats = await this.getConnectionStats(peerId);
      const quality: ConnectionQuality = {
        audioLevel: 0,
        bitrate: 0,
        packetsLost: 0,
        packetsSent: 0,
        roundTripTime: 0,
        jitter: 0,
      };

      if (stats.audio) {
        const audio = stats.audio as any;
        quality.audioLevel = audio.audioLevel || 0;
        quality.bitrate = (quality.bitrate || 0) + (audio.bitrate || 0);
        quality.packetsLost = (quality.packetsLost || 0) + (audio.packetsLost || 0);
        quality.packetsSent = (quality.packetsSent || 0) + (audio.packetsSent || 0);
        quality.jitter = Math.max(quality.jitter || 0, audio.jitter || 0);
      }

      if (stats.video) {
        const video = stats.video as any;
        quality.bitrate = (quality.bitrate || 0) + (video.bitrate || 0);
        quality.packetsLost = (quality.packetsLost || 0) + (video.packetsLost || 0);
        quality.packetsSent = (quality.packetsSent || 0) + (video.packetsSent || 0);
        quality.jitter = Math.max(quality.jitter || 0, video.jitter || 0);
      }

      if (stats.transport) {
        const transport = stats.transport as any;
        quality.roundTripTime = transport.currentRoundTripTime || 0;
      }

      this.connectionQualities.set(peerId, quality);
      
      if (this.onConnectionQuality) {
        this.onConnectionQuality(peerId, quality);
      }
    } catch (error) {
      console.error('Error collecting connection quality:', error);
    }
  }

  private startStatsCollection(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }

    this.statsInterval = setInterval(() => {
      this.connections.forEach((_, peerId) => {
        this.collectConnectionQuality(peerId);
      });
    }, 5000); // Collect stats every 5 seconds
  }

  private handleConnectionFailure(peerId: string): void {
    const conn = this.connections.get(peerId);
    if (!conn) return;

    // Attempt to restart ICE
    try {
      conn.pc.restartIce();
    } catch (error) {
      console.error('Error restarting ICE:', error);
    }

    // If still failing after timeout, close connection
    setTimeout(() => {
      if (conn.pc.iceConnectionState === 'failed') {
        this.closeConnection(peerId);
      }
    }, 5000);
  }

  // Close specific connection
  closeConnection(peerId: string): void {
    const conn = this.connections.get(peerId);
    if (conn) {
      conn.pc.close();
      if (conn.dataChannel) {
        conn.dataChannel.close();
      }
      this.connections.delete(peerId);
      this.connectionQualities.delete(peerId);
      
      if (this.onPeerDisconnected) {
        this.onPeerDisconnected(peerId);
      }
    }
  }

  // Close all connections and cleanup
  destroy(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    this.connections.forEach((conn, peerId) => {
      this.closeConnection(peerId);
    });
    
    this.connections.clear();
    this.connectionQualities.clear();
    
    if (this.localStream) {
      mediaService.stopLocalStream();
    }
  }

  // Get all active connections
  getActiveConnections(): PeerConnection[] {
    return Array.from(this.connections.values());
  }

  // Check if connection exists
  hasConnection(peerId: string): boolean {
    return this.connections.has(peerId);
  }

  // Get connection by peerId
  getConnection(peerId: string): PeerConnection | undefined {
    return this.connections.get(peerId);
  }

  // Get connection quality
  getConnectionQuality(peerId: string): ConnectionQuality | undefined {
    return this.connectionQualities.get(peerId);
  }

  // Get local stream
  getLocalStream(): MediaStream | undefined {
    return this.localStream;
  }

  // Set local stream
  setLocalStream(stream: MediaStream): void {
    this.localStream = stream;
  }

  // Reconnect to peer
  async reconnect(peerId: string): Promise<RTCPeerConnection> {
    const oldConn = this.connections.get(peerId);
    if (!oldConn) {
      throw new Error(`No connection found for peer: ${peerId}`);
    }

    // Store old connection state
    const wasInitiator = oldConn.dataChannel?.readyState === 'open';
    
    // Close old connection
    this.closeConnection(peerId);
    
    // Create new connection
    return this.createPeerConnection(peerId, {
      isInitiator: wasInitiator,
      mediaStream: this.localStream,
    });
  }
}

export const webRTCPeer = new WebRTCPeer();
export default webRTCPeer;