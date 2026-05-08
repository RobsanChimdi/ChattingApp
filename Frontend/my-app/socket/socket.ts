// socket/socket.ts
import io, { Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';

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
  private isConnecting = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }
  }

  // ========== PUBLIC API ==========

  async connect(): Promise<void> {
    // Prevent multiple connection attempts
    if (this.isConnecting) {
      console.log('Connection already in progress, waiting...');
      return this.connectionPromise || Promise.resolve();
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    if (this.isManuallyDisconnected) {
      console.log('Manually disconnected, not connecting');
      return;
    }

    // Check if authenticated before attempting to connect
    const authState = useAuthStore.getState();
    if (!authState.isAuthenticated || !authState.token) {
      console.log('Not authenticated, skipping socket connection');
      return;
    }

    this.isConnecting = true;
    this.connectionPromise = this._connect();
    
    try {
      await this.connectionPromise;
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      this.isConnecting = false;
    }
    
    return this.connectionPromise;
  }

  disconnect(): void {
    this.isManuallyDisconnected = true;
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this._isConnected = false;
    this.notifyConnectionStatus(false);
    this.connectionPromise = null;
    this.isConnecting = false;
    
    console.log('WebSocket manually disconnected');
  }

  isConnected(): boolean {
    return this._isConnected;
  }

  onConnectionChange(callback: (connected: boolean) => void): () => void {
    this.connectionCallbacks.push(callback);
    
    return () => {
      const index = this.connectionCallbacks.indexOf(callback);
      if (index > -1) {
        this.connectionCallbacks.splice(index, 1);
      }
    };
  }

  on(event: string, callback: CallbackFunction): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: CallbackFunction): void {
    const callbacks = this.eventListeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

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

  joinRoom(room: string): boolean {
    if (!this._isConnected) {
      console.warn(`Cannot join room ${room}: Socket not connected`);
      return false;
    }

    this.emit('join_room', { room });
    this.roomSubscriptions.add(room);
    return true;
  }

  leaveRoom(room: string): boolean {
    if (!this._isConnected) {
      return false;
    }

    this.emit('leave_room', { room });
    this.roomSubscriptions.delete(room);
    return true;
  }

  getSubscribedRooms(): string[] {
    return Array.from(this.roomSubscriptions);
  }

  private rejoinRooms(): void {
    this.roomSubscriptions.forEach(room => {
      this.emit('join_room', { room });
    });
  }

  // ========== PRIVATE METHODS ==========

  private async _connect(): Promise<void> {
    try {
      const authState = useAuthStore.getState();
      const token = authState.token;
      
      // CRITICAL: Don't throw error, just return silently
      if (!token || !authState.isAuthenticated) {
        console.log('No authentication token or not authenticated, skipping connection');
        return;
      }

      if (this.socket) {
        this.socket.removeAllListeners();
        this.socket.disconnect();
      }

      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 
                   process.env.NEXT_PUBLIC_API_URL?.replace('http', 'ws') || 
                   'ws://localhost:8000';

      console.log(`Connecting to WebSocket at: ${wsUrl}/ws/`);

      this.socket = io(`${wsUrl}/ws/`, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: false,
        timeout: 10000,
        forceNew: true,
        withCredentials: true,
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
      // Don't re-throw, just log
    } finally {
      this.connectionPromise = null;
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this._isConnected = true;
      this.notifyConnectionStatus(true);
      this.reconnectAttempts = 0;
      this.rejoinRooms();
      this.triggerEvent('socket:connected', null);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('WebSocket disconnected:', reason);
      this._isConnected = false;
      this.notifyConnectionStatus(false);
      this.triggerEvent('socket:disconnected', { reason });
      
      if (!this.isManuallyDisconnected && reason !== 'io client disconnect') {
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

    this.socket.onAny((eventName: string, ...args: any[]) => {
      this.triggerEvent(eventName, args[0]);
    });
  }

  private triggerEvent(eventName: string, data: any): void {
    const callbacks = this.eventListeners.get(eventName);
    if (callbacks) {
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
    if (this.isManuallyDisconnected) return;
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
        const authState = useAuthStore.getState();
        if (authState.isAuthenticated && authState.token) {
          this.connect().catch(console.error);
        } else {
          console.log('Not authenticated, skipping reconnect');
        }
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

  private handleOnline(): void {
    console.log('Browser came online, attempting to reconnect...');
    if (!this._isConnected && !this.isManuallyDisconnected) {
      const authState = useAuthStore.getState();
      if (authState.isAuthenticated && authState.token) {
        this.connect().catch(console.error);
      } else {
        console.log('Browser online but not authenticated, skipping socket reconnect');
      }
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
      
      const authState = useAuthStore.getState();
      if (authState.isAuthenticated && authState.token) {
        console.log('Page became visible, attempting to reconnect...');
        this.connect().catch(console.error);
      } else {
        console.log('Page visible but not authenticated, skipping socket reconnect');
      }
    }
  }

  // ========== UTILITY METHODS ==========

  getSocketId(): string | null {
    return this.socket?.id || null;
  }

  isSubscribedToRoom(room: string): boolean {
    return this.roomSubscriptions.has(room);
  }

  clearAllListeners(): void {
    this.eventListeners.clear();
    this.connectionCallbacks = [];
  }

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

export const socketService = new SocketService();