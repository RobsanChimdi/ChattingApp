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
  private connections: Map<number, PeerConnection> = new Map(); // Changed to number
  private localStream?: MediaStream;
  private configuration: RTCConfiguration;
  private statsInterval: NodeJS.Timeout | null = null;
  private connectionQualities: Map<number, ConnectionQuality> = new Map(); // Changed to number

  // Event callbacks
  public onRemoteStream: ((peerId: number, stream: MediaStream) => void) | null = null;
  public onRemoteStreamEnded: ((peerId: number) => void) | null = null;
  public onDataChannelMessage: ((peerId: number, message: DataChannelMessage) => void) | null = null;
  public onDataChannelOpen: ((peerId: number) => void) | null = null;
  public onDataChannelClose: ((peerId: number) => void) | null = null;
  public onPeerConnected: ((peerId: number) => void) | null = null;
  public onPeerDisconnected: ((peerId: number) => void) | null = null;
  public onIceCandidate: ((peerId: number, candidate: RTCIceCandidate) => void) | null = null;
  public onNegotiationNeeded: ((peerId: number) => void) | null = null;
  public onSignalingStateChange: ((peerId: number, state: RTCSignalingState) => void) | null = null;
  public onConnectionQuality: ((peerId: number, quality: ConnectionQuality) => void) | null = null;

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

    this.startStatsCollection();
  }

  private isWebRTCSupported(): boolean {
    return !!(window.RTCPeerConnection && 
              window.RTCSessionDescription && 
              window.RTCIceCandidate);
  }

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

  async createPeerConnection(peerId: number, config: Partial<PeerConfig> = {}): Promise<RTCPeerConnection> {
    if (this.connections.has(peerId)) {
      this.closeConnection(peerId);
    }

    const pc = new RTCPeerConnection({
      ...this.configuration,
      iceServers: config.iceServers || this.configuration.iceServers,
    });

    this.setupPeerConnectionEvents(pc, peerId, config.isInitiator || false);

    const stream = config.mediaStream || this.localStream;
    if (stream) {
      this.addLocalStreamToConnection(pc, stream);
    }

    if (config.isInitiator) {
      this.createDataChannel(pc, peerId, config.dataChannelConfig);
    }

    this.connections.set(peerId, {
      peerId: peerId.toString(),
      pc,
      isConnected: false,
      iceCandidates: [],
      isNegotiating: false,
    });

    return pc;
  }

  private setupPeerConnectionEvents(pc: RTCPeerConnection, peerId: number, isInitiator: boolean): void {
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
        console.log(`ICE gathering complete for ${peerId}`);
      }
    };

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

    pc.onicegatheringstatechange = () => {
      console.log(`ICE gathering state for ${peerId}:`, pc.iceGatheringState);
    };

    pc.onsignalingstatechange = () => {
      console.log(`Signaling state for ${peerId}:`, pc.signalingState);
      if (this.onSignalingStateChange) {
        this.onSignalingStateChange(peerId, pc.signalingState);
      }
    };

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

    pc.ontrack = (event) => {
      console.log('Received remote track from:', peerId, event.track.kind);
      
      if (event.streams && event.streams.length > 0) {
        const stream = event.streams[0];
        const conn = this.connections.get(peerId);
        if (conn) {
          conn.stream = stream;
        }
        
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
        sender.replaceTrack(track);
      } else {
        pc.addTrack(track, stream);
      }
    });
  }

  private createDataChannel(pc: RTCPeerConnection, peerId: number, config?: RTCDataChannelInit): void {
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

  private setupDataChannel(channel: RTCDataChannel, peerId: number): void {
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

  async createOffer(peerId: number, options?: RTCOfferOptions): Promise<RTCSessionDescriptionInit> {
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

  async createAnswer(peerId: number, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
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

  async setRemoteDescription(peerId: number, description: RTCSessionDescriptionInit): Promise<void> {
    const conn = this.connections.get(peerId);
    if (!conn) {
      throw new Error(`No connection found for peer: ${peerId}`);
    }

    try {
      await conn.pc.setRemoteDescription(new RTCSessionDescription(description));
      
      for (const candidate of conn.iceCandidates) {
        await conn.pc.addIceCandidate(candidate);
      }
      conn.iceCandidates = [];
    } catch (error) {
      console.error('Error setting remote description:', error);
      throw error;
    }
  }

  async addIceCandidate(peerId: number, candidateInit: RTCIceCandidateInit): Promise<void> {
    const conn = this.connections.get(peerId);
    if (!conn) {
      const newConn = this.connections.get(peerId);
      if (newConn) {
        newConn.iceCandidates.push(new RTCIceCandidate(candidateInit));
      }
      return;
    }

    try {
      await conn.pc.addIceCandidate(new RTCIceCandidate(candidateInit));
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
      if (!conn.pc.remoteDescription) {
        conn.iceCandidates.push(new RTCIceCandidate(candidateInit));
      }
    }
  }

  sendDataMessage(peerId: number, message: any): boolean {
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

  async updateLocalStream(constraints?: MediaConstraints): Promise<void> {
    if (constraints) {
      this.localStream = await mediaService.getLocalStream(constraints);
    }

    this.connections.forEach(conn => {
      if (this.localStream) {
        this.addLocalStreamToConnection(conn.pc, this.localStream);
      }
    });
  }

  toggleAudio(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  async getConnectionStats(peerId: number): Promise<ConnectionStats> {
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

  private async collectConnectionQuality(peerId: number): Promise<void> {
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
    }, 5000);
  }

  private handleConnectionFailure(peerId: number): void {
    const conn = this.connections.get(peerId);
    if (!conn) return;

    try {
      conn.pc.restartIce();
    } catch (error) {
      console.error('Error restarting ICE:', error);
    }

    setTimeout(() => {
      if (conn.pc.iceConnectionState === 'failed') {
        this.closeConnection(peerId);
      }
    }, 5000);
  }

  closeConnection(peerId: number): void {
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
      this.localStream = undefined;
    }
  }

  getActiveConnections(): PeerConnection[] {
    return Array.from(this.connections.values());
  }

  hasConnection(peerId: number): boolean {
    return this.connections.has(peerId);
  }

  getConnection(peerId: number): PeerConnection | undefined {
    return this.connections.get(peerId);
  }

  getConnectionQuality(peerId: number): ConnectionQuality | undefined {
    return this.connectionQualities.get(peerId);
  }

  getLocalStream(): MediaStream | undefined {
    return this.localStream;
  }

  setLocalStream(stream: MediaStream): void {
    this.localStream = stream;
  }

  async reconnect(peerId: number): Promise<RTCPeerConnection> {
    const oldConn = this.connections.get(peerId);
    if (!oldConn) {
      throw new Error(`No connection found for peer: ${peerId}`);
    }

    const wasInitiator = oldConn.dataChannel?.readyState === 'open';
    
    this.closeConnection(peerId);
    
    return this.createPeerConnection(peerId, {
      isInitiator: wasInitiator,
      mediaStream: this.localStream,
    });
  }
}

export const webRTCPeer = new WebRTCPeer();
export default webRTCPeer;