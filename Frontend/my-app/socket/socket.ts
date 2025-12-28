// socket/socket.ts
import io, { Socket } from 'socket.io-client';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/authStore';

// Types for WebSocket events matching Django Channels
interface SocketEvent {
  type: string;
  payload: any;
}

interface WebSocketAuth {
  token: string;
}

interface JoinRoomEvent {
  room: string;
}

interface LeaveRoomEvent {
  room: string;
}

interface WebSocketMessage {
  type: string;
  message: any;
}

interface CallbackFunction {
  (data: any): void;
}

class SocketService {
  private socket: Socket | null = null;
  private eventListeners: Map<string, CallbackFunction[]> = new Map();
  private roomSubscriptions: Set<string> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private isManuallyDisconnected = false;
  private connectionPromise: Promise<void> | null = null;
  
  // Connection status tracking
  private _isConnected = false;
  private connectionCallbacks: Array<(connected: boolean) => void> = [];

  constructor() {
    // Auto-reconnect on page visibility change
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }
  }

  // ========== PUBLIC API ==========

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // Don't connect if manually disconnected
    if (this.isManuallyDisconnected) {
      return;
    }

    this.connectionPromise = this._connect();
    return this.connectionPromise;
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isManuallyDisconnected = true;
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this._isConnected = false;
    this.notifyConnectionStatus(false);
    this.connectionPromise = null;
    
    console.log('WebSocket manually disconnected');
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Subscribe to connection status changes
   */
  onConnectionChange(callback: (connected: boolean) => void): () => void {
    this.connectionCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.connectionCallbacks.indexOf(callback);
      if (index > -1) {
        this.connectionCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Register event listener
   */
  on(event: string, callback: CallbackFunction): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: CallbackFunction): void {
    const callbacks = this.eventListeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to server
   */
  emit(event: string, data?: any): boolean {
    if (!this.socket || !this._isConnected) {
      console.warn(`Cannot emit ${event}: Socket not connected`);
      return false;
    }

    try {
      this.socket.emit(event, data);
      return true;
    } catch (error) {
      console.error(`Error emitting ${event}:`, error);
      return false;
    }
  }

  /**
   * Join a room/channel
   */
  joinRoom(room: string): boolean {
    if (!this._isConnected) {
      console.warn(`Cannot join room ${room}: Socket not connected`);
      return false;
    }

    this.emit('join_room', { room });
    this.roomSubscriptions.add(room);
    return true;
  }

  /**
   * Leave a room/channel
   */
  leaveRoom(room: string): boolean {
    if (!this._isConnected) {
      return false;
    }

    this.emit('leave_room', { room });
    this.roomSubscriptions.delete(room);
    return true;
  }

  /**
   * Get all subscribed rooms
   */
  getSubscribedRooms(): string[] {
    return Array.from(this.roomSubscriptions);
  }

  /**
   * Rejoin all rooms after reconnection
   */
  private rejoinRooms(): void {
    this.roomSubscriptions.forEach(room => {
      this.emit('join_room', { room });
    });
  }

  // ========== PRIVATE METHODS ==========

  private async _connect(): Promise<void> {
    try {
      // Get authentication token
      const authState = useAuthStore.getState();
      const token = authState.token;
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Clean up existing connection
      if (this.socket) {
        this.socket.removeAllListeners();
        this.socket.disconnect();
      }

      // WebSocket URL - adjust based on your Django setup
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 
                   process.env.NEXT_PUBLIC_API_URL?.replace('http', 'ws') || 
                   'ws://localhost:8000';

      console.log(`Connecting to WebSocket at: ${wsUrl}/ws/`);

      // Create socket connection with Django Channels format
      this.socket = io(`${wsUrl}/ws/`, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        forceNew: true,
        withCredentials: true,
        path: '/ws/socket.io/',
        autoConnect: true,
      });

      this.setupEventListeners();

      return new Promise((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Socket initialization failed'));
          return;
        }

        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 15000);

        const connectHandler = () => {
          clearTimeout(timeout);
          this.socket?.off('connect_error', errorHandler);
          this._isConnected = true;
          this.notifyConnectionStatus(true);
          this.reconnectAttempts = 0;
          this.isManuallyDisconnected = false;
          console.log('WebSocket connected successfully');
          resolve();
        };

        const errorHandler = (error: Error) => {
          clearTimeout(timeout);
          this.socket?.off('connect', connectHandler);
          console.error('WebSocket connection error:', error);
          reject(error);
        };

        this.socket.once('connect', connectHandler);
        this.socket.once('connect_error', errorHandler);
      });

    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
      this.scheduleReconnect();
      throw error;
    } finally {
      this.connectionPromise = null;
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this._isConnected = true;
      this.notifyConnectionStatus(true);
      this.reconnectAttempts = 0;
      
      // Rejoin all previously subscribed rooms
      this.rejoinRooms();
      
      // Emit custom event for internal use
      this.triggerEvent('socket:connected', null);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('WebSocket disconnected:', reason);
      this._isConnected = false;
      this.notifyConnectionStatus(false);
      this.triggerEvent('socket:disconnected', { reason });
      
      if (!this.isManuallyDisconnected && 
          reason !== 'io client disconnect') {
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('WebSocket connection error:', error);
      this._isConnected = false;
      this.notifyConnectionStatus(false);
      this.triggerEvent('socket:connect_error', { error });
      
      this.reconnectAttempts++;
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    });

    this.socket.on('reconnect_attempt', (attempt: number) => {
      console.log(`WebSocket reconnection attempt ${attempt}`);
      this.triggerEvent('socket:reconnect_attempt', { attempt });
    });

    this.socket.on('reconnect', (attempt: number) => {
      console.log(`WebSocket reconnected after ${attempt} attempts`);
      this.triggerEvent('socket:reconnected', { attempt });
    });

    this.socket.on('reconnect_failed', () => {
      console.error('WebSocket reconnection failed');
      this.triggerEvent('socket:reconnect_failed', null);
    });

    // Custom event handling
    this.socket.onAny((eventName: string, ...args: any[]) => {
      this.handleIncomingEvent(eventName, args[0]);
    });

    // Ping/pong for connection monitoring
    this.socket.on('ping', () => {
      this.socket?.emit('pong');
    });
  }

  private handleIncomingEvent(eventName: string, data: any): void {
    // console.log(`Received WebSocket event: ${eventName}`, data);
    this.triggerEvent(eventName, data);
  }

  private triggerEvent(eventName: string, data: any): void {
    const callbacks = this.eventListeners.get(eventName);
    if (callbacks) {
      // Use setTimeout to prevent blocking
      setTimeout(() => {
        callbacks.forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            console.error(`Error in ${eventName} handler:`, error);
          }
        });
      }, 0);
    }
  }

  private scheduleReconnect(): void {
    if (this.isManuallyDisconnected) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(
      this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts),
      30000
    );

    console.log(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    setTimeout(() => {
      if (!this._isConnected && !this.isManuallyDisconnected) {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }
    }, delay);
  }

  private notifyConnectionStatus(connected: boolean): void {
    this.connectionCallbacks.forEach(callback => {
      try {
        callback(connected);
      } catch (error) {
        console.error('Error in connection status callback:', error);
      }
    });
  }

  // ========== EVENT HANDLERS ==========

  private handleOnline(): void {
    console.log('Browser came online, attempting to reconnect...');
    if (!this._isConnected && !this.isManuallyDisconnected) {
      this.connect().catch(console.error);
    }
  }

  private handleOffline(): void {
    console.log('Browser went offline');
    if (this.socket) {
      this.socket.disconnect();
    }
    this._isConnected = false;
    this.notifyConnectionStatus(false);
  }

  private handleVisibilityChange(): void {
    if (document.visibilityState === 'visible' && 
        !this._isConnected && 
        !this.isManuallyDisconnected) {
      console.log('Page became visible, attempting to reconnect...');
      this.connect().catch(console.error);
    }
  }

  // ========== UTILITY METHODS ==========

  /**
   * Send a message to a specific room
   */
  sendToRoom(room: string, event: string, data: any): boolean {
    return this.emit('send_to_room', {
      room,
      event,
      data
    });
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(event: string, data: any): boolean {
    return this.emit('broadcast', {
      event,
      data
    });
  }

  /**
   * Get socket ID
   */
  getSocketId(): string | null {
    return this.socket?.id || null;
  }

  /**
   * Check if subscribed to a room
   */
  isSubscribedToRoom(room: string): boolean {
    return this.roomSubscriptions.has(room);
  }

  /**
   * Clear all event listeners
   */
  clearAllListeners(): void {
    this.eventListeners.clear();
    this.connectionCallbacks = [];
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    connected: boolean;
    socketId: string | null;
    subscribedRooms: number;
    reconnectAttempts: number;
    manuallyDisconnected: boolean;
  } {
    return {
      connected: this._isConnected,
      socketId: this.getSocketId(),
      subscribedRooms: this.roomSubscriptions.size,
      reconnectAttempts: this.reconnectAttempts,
      manuallyDisconnected: this.isManuallyDisconnected
    };
  }
}

// Export singleton instance
export const socketService = new SocketService();

// React hook for using socket in components
import { useEffect, useState } from 'react';

export function useSocket() {
  const [isConnected, setIsConnected] = useState(socketService.isConnected());
  const [socketId, setSocketId] = useState<string | null>(null);
  const authStore = useAuthStore();

  useEffect(() => {
    // Connect when authenticated
    if (authStore.isAuthenticated) {
      socketService.connect().catch(console.error);
    } else {
      socketService.disconnect();
    }

    // Listen for connection changes
    const unsubscribe = socketService.onConnectionChange((connected) => {
      setIsConnected(connected);
      setSocketId(socketService.getSocketId());
    });

    // Initial setup
    setIsConnected(socketService.isConnected());
    setSocketId(socketService.getSocketId());

    return () => {
      unsubscribe();
      // Don't disconnect here - connection is managed by auth state
    };
  }, [authStore.isAuthenticated]);

  // Helper to join chat room
  const joinChatRoom = (chatId: string) => {
    socketService.joinRoom(`chat_${chatId}`);
  };

  // Helper to leave chat room
  const leaveChatRoom = (chatId: string) => {
    socketService.leaveRoom(`chat_${chatId}`);
  };

  // Helper to join call room
  const joinCallRoom = (callId: string) => {
    socketService.joinRoom(`call_${callId}`);
  };

  // Helper to leave call room
  const leaveCallRoom = (callId: string) => {
    socketService.leaveRoom(`call_${callId}`);
  };

  return {
    socket: socketService,
    isConnected,
    socketId,
    joinChatRoom,
    leaveChatRoom,
    joinCallRoom,
    leaveCallRoom,
    stats: socketService.getStats()
  };
}

// Default export
export default socketService;