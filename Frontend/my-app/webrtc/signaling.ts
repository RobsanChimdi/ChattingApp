// services/webrtc/signaling.ts
import { io, Socket } from 'socket.io-client';
import { webRTCPeer, PeerConnection } from './peer';
import { mediaService } from './media';

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'candidate' | 'ready' | 'end' | 'error' | 'join' | 'leave' | 'mute' | 'video';
  from: string;
  to?: string;
  roomId: string;
  payload: any;
  timestamp: number;
}

export interface RoomInfo {
  roomId: string;
  participants: string[];
  isActive: boolean;
  createdAt: number;
}

export interface CallOptions {
  audio: boolean;
  video: boolean;
  screenShare: boolean;
  iceServers?: RTCIceServer[];
  dataChannel?: boolean;
}

class SignalingService {
  private socket: Socket | null = null;
  private currentRoom: string | null = null;
  private userId: string | null = null;
  private token: string | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  // Event callbacks
  public onRoomJoined: ((roomInfo: RoomInfo) => void) | null = null;
  public onRoomLeft: ((roomId: string) => void) | null = null;
  public onParticipantJoined: ((userId: string) => void) | null = null;
  public onParticipantLeft: ((userId: string) => void) | null = null;
  public onCallStarted: ((roomId: string, initiator: string) => void) | null = null;
  public onCallEnded: ((roomId: string) => void) | null = null;
  public onError: ((error: string) => void) | null = null;
  public onReconnect: (() => void) | null = null;
  public onDisconnect: (() => void) | null = null;

  constructor() {
    this.initializeWebRTCEvents();
  }

  // Initialize WebRTC event handlers
  private initializeWebRTCEvents(): void {
    // Handle remote stream
    webRTCPeer.onRemoteStream = (peerId: string, stream: MediaStream) => {
      console.log(`Received remote stream from ${peerId}`);
      // You can emit this to UI components or handle it as needed
    };

    // Handle data channel messages
    webRTCPeer.onDataChannelMessage = (peerId: string, message: any) => {
      console.log(`Data channel message from ${peerId}:`, message);
      // Handle data channel messages (chat, files, etc.)
    };

    // Handle peer connection
    webRTCPeer.onPeerConnected = (peerId: string) => {
      console.log(`Peer ${peerId} connected`);
      // Notify other participants about connection
      if (this.currentRoom && this.userId) {
        this.sendMessage('ready', peerId, { connected: true });
      }
    };

    // Handle peer disconnection
    webRTCPeer.onPeerDisconnected = (peerId: string) => {
      console.log(`Peer ${peerId} disconnected`);
      // Clean up peer connection
      webRTCPeer.closeConnection(peerId);
    };

    // Handle ICE candidates
    webRTCPeer.onIceCandidate = (peerId: string, candidate: RTCIceCandidate) => {
      if (this.currentRoom && this.userId) {
        this.sendMessage('candidate', peerId, candidate.toJSON());
      }
    };

    // Handle negotiation needed
    webRTCPeer.onNegotiationNeeded = async (peerId: string) => {
      if (this.currentRoom && this.userId) {
        try {
          const offer = await webRTCPeer.createOffer(peerId);
          this.sendMessage('offer', peerId, offer);
        } catch (error) {
          console.error('Error creating offer during negotiation:', error);
        }
      }
    };
  }

  // Connect to signaling server
  async connect(
    serverUrl: string,
    userId: string,
    token: string
  ): Promise<void> {
    this.userId = userId;
    this.token = token;

    return new Promise((resolve, reject) => {
      try {
        this.socket = io(serverUrl, {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000,
        });

        this.setupSocketEvents();
        
        this.socket.on('connect', () => {
          console.log('Connected to signaling server');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
          }
          
          if (this.onReconnect) {
            this.onReconnect();
          }
          
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          this.isConnected = false;
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Setup socket event handlers
  private setupSocketEvents(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from signaling server:', reason);
      this.isConnected = false;
      
      if (this.onDisconnect) {
        this.onDisconnect();
      }

      // Attempt reconnection for unexpected disconnects
      if (reason === 'io server disconnect' || reason === 'transport close') {
        this.attemptReconnect();
      }
    });

    // Room events
    this.socket.on('room:joined', (data: { roomId: string; participants: string[] }) => {
      console.log(`Joined room ${data.roomId}`);
      this.currentRoom = data.roomId;
      
      if (this.onRoomJoined) {
        this.onRoomJoined({
          roomId: data.roomId,
          participants: data.participants,
          isActive: true,
          createdAt: Date.now(),
        });
      }

      // Create peer connections for existing participants
      data.participants.forEach(participantId => {
        if (participantId !== this.userId && !webRTCPeer.hasConnection(participantId)) {
          this.createPeerConnection(participantId);
        }
      });
    });

    this.socket.on('room:left', (roomId: string) => {
      console.log(`Left room ${roomId}`);
      this.currentRoom = null;
      
      if (this.onRoomLeft) {
        this.onRoomLeft(roomId);
      }
    });

    this.socket.on('participant:joined', (userId: string) => {
      console.log(`Participant ${userId} joined`);
      
      if (this.onParticipantJoined) {
        this.onParticipantJoined(userId);
      }

      // Create peer connection for new participant
      if (userId !== this.userId && !webRTCPeer.hasConnection(userId)) {
        this.createPeerConnection(userId);
      }
    });

    this.socket.on('participant:left', (userId: string) => {
      console.log(`Participant ${userId} left`);
      
      if (this.onParticipantLeft) {
        this.onParticipantLeft(userId);
      }

      // Close peer connection
      webRTCPeer.closeConnection(userId);
    });

    // Call events
    this.socket.on('call:started', (data: { roomId: string; initiator: string }) => {
      console.log(`Call started in room ${data.roomId} by ${data.initiator}`);
      
      if (this.onCallStarted) {
        this.onCallStarted(data.roomId, data.initiator);
      }
    });

    this.socket.on('call:ended', (roomId: string) => {
      console.log(`Call ended in room ${roomId}`);
      
      if (this.onCallEnded) {
        this.onCallEnded(roomId);
      }

      // Clean up all peer connections
      webRTCPeer.destroy();
    });

    // Signaling messages
    this.socket.on('signal:offer', this.handleOffer.bind(this));
    this.socket.on('signal:answer', this.handleAnswer.bind(this));
    this.socket.on('signal:candidate', this.handleCandidate.bind(this));
    this.socket.on('signal:ready', this.handleReady.bind(this));
    this.socket.on('signal:end', this.handleEnd.bind(this));
    this.socket.on('signal:mute', this.handleMute.bind(this));
    this.socket.on('signal:video', this.handleVideo.bind(this));

    // Error handling
    this.socket.on('error', (error: string) => {
      console.error('Signaling error:', error);
      
      if (this.onError) {
        this.onError(error);
      }
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    this.reconnectTimeout = setTimeout(async () => {
      if (this.socket && !this.socket.connected) {
        this.socket.connect();
      }
    }, Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000));
  }

  // Join a room
  async joinRoom(roomId: string, options?: CallOptions): Promise<void> {
    if (!this.socket || !this.isConnected) {
      throw new Error('Not connected to signaling server');
    }

    return new Promise((resolve, reject) => {
      this.socket!.emit('room:join', { roomId, options }, (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          this.currentRoom = roomId;
          
          // Initialize media if options provided
          if (options) {
            this.initializeMedia(options).then(resolve).catch(reject);
          } else {
            resolve();
          }
        }
      });
    });
  }

  // Leave current room
  leaveRoom(): void {
    if (!this.socket || !this.currentRoom) return;

    this.socket.emit('room:leave', { roomId: this.currentRoom });
    this.currentRoom = null;
    
    // Clean up peer connections
    webRTCPeer.destroy();
  }

  // Start a call
  async startCall(roomId: string, options: CallOptions): Promise<void> {
    await this.joinRoom(roomId, options);
    
    if (this.socket) {
      this.socket.emit('call:start', { roomId });
    }
  }

  // End current call
  endCall(): void {
    if (!this.socket || !this.currentRoom) return;

    this.socket.emit('call:end', { roomId: this.currentRoom });
    this.leaveRoom();
  }

  // Initialize media based on options
  private async initializeMedia(options: CallOptions): Promise<void> {
    try {
      // Get local media stream
      const constraints = {
        audio: options.audio,
        video: options.video,
        audioConstraints: options.audio ? {
          echoCancellation: true,
          noiseSuppression: true,
        } : undefined,
        videoConstraints: options.video ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        } : undefined,
      };

      const stream = await mediaService.getLocalStream(constraints);
      webRTCPeer.setLocalStream(stream);
    } catch (error) {
      console.error('Error initializing media:', error);
      throw error;
    }
  }

  // Create peer connection for a participant
  private async createPeerConnection(participantId: string): Promise<void> {
    if (webRTCPeer.hasConnection(participantId)) {
      return;
    }

    try {
      const pc = await webRTCPeer.createPeerConnection(participantId, {
        peerId: participantId,
        userId: this.userId!,
        isInitiator: false, // We'll let the participant who joined later become initiator
      });

      // If we have a local stream, add it to the connection
      const localStream = webRTCPeer.getLocalStream();
      if (localStream) {
        this.addLocalStreamToConnection(pc, localStream);
      }

      // Send ready signal to initiate connection
      this.sendMessage('ready', participantId, {});
    } catch (error) {
      console.error('Error creating peer connection:', error);
    }
  }

  // Add local stream to peer connection
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

  // Send signaling message
  private sendMessage(type: string, to: string, payload: any): void {
    if (!this.socket || !this.currentRoom || !this.userId) return;

    const message: SignalingMessage = {
      type: type as any,
      from: this.userId,
      to,
      roomId: this.currentRoom,
      payload,
      timestamp: Date.now(),
    };

    this.socket.emit('signal', message);
  }

  // Handle incoming offer
  private async handleOffer(message: SignalingMessage): Promise<void> {
    try {
      if (!this.userId || message.from === this.userId) return;

      // Create or get peer connection
      if (!webRTCPeer.hasConnection(message.from)) {
        await this.createPeerConnection(message.from);
      }

      const answer = await webRTCPeer.createAnswer(message.from, message.payload);
      this.sendMessage('answer', message.from, answer);
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }

  // Handle incoming answer
  private async handleAnswer(message: SignalingMessage): Promise<void> {
    try {
      if (!this.userId || message.from === this.userId) return;

      await webRTCPeer.setRemoteDescription(message.from, message.payload);
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }

  // Handle incoming ICE candidate
  private async handleCandidate(message: SignalingMessage): Promise<void> {
    try {
      if (!this.userId || message.from === this.userId) return;

      await webRTCPeer.addIceCandidate(message.from, message.payload);
    } catch (error) {
      console.error('Error handling candidate:', error);
    }
  }

  // Handle ready signal
  private async handleReady(message: SignalingMessage): Promise<void> {
    try {
      if (!this.userId || message.from === this.userId) return;

      if (!webRTCPeer.hasConnection(message.from)) {
        await this.createPeerConnection(message.from);
      }

      // If we're the initiator, create an offer
      const conn = webRTCPeer.getConnection(message.from);
      if (conn && conn.dataChannel) {
        const offer = await webRTCPeer.createOffer(message.from);
        this.sendMessage('offer', message.from, offer);
      }
    } catch (error) {
      console.error('Error handling ready signal:', error);
    }
  }

  // Handle end signal
  private handleEnd(message: SignalingMessage): void {
    if (!this.userId || message.from === this.userId) return;

    webRTCPeer.closeConnection(message.from);
  }

  // Handle mute signal
  private handleMute(message: SignalingMessage): void {
    if (!this.userId || message.from === this.userId) return;

    // Update participant mute status in UI
    console.log(`Participant ${message.from} mute: ${message.payload.muted}`);
  }

  // Handle video signal
  private handleVideo(message: SignalingMessage): void {
    if (!this.userId || message.from === this.userId) return;

    // Update participant video status in UI
    console.log(`Participant ${message.from} video: ${message.payload.enabled}`);
  }

  // Send mute status
  sendMuteStatus(muted: boolean): void {
    if (!this.currentRoom || !this.userId) return;

    const participants = this.getRoomParticipants();
    participants.forEach(participantId => {
      if (participantId !== this.userId) {
        this.sendMessage('mute', participantId, { muted });
      }
    });
  }

  // Send video status
  sendVideoStatus(enabled: boolean): void {
    if (!this.currentRoom || !this.userId) return;

    const participants = this.getRoomParticipants();
    participants.forEach(participantId => {
      if (participantId !== this.userId) {
        this.sendMessage('video', participantId, { enabled });
      }
    });
  }

  // Get room participants
  getRoomParticipants(): string[] {
    // This would typically come from server, but for now return connected peers
    return Array.from(webRTCPeer.getActiveConnections().map(conn => conn.peerId));
  }

  // Disconnect from signaling server
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.isConnected = false;
    this.currentRoom = null;
    this.reconnectAttempts = 0;
    
    // Clean up WebRTC connections
    webRTCPeer.destroy();
  }

  // Check connection status
  isSignalingConnected(): boolean {
    return this.isConnected && !!this.socket?.connected;
  }

  // Get current room
  getCurrentRoom(): string | null {
    return this.currentRoom;
  }

  // Get user ID
  getUserId(): string | null {
    return this.userId;
  }
}

export const signalingService = new SignalingService();
export default signalingService;