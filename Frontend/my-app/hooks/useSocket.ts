// hooks/useSocket.ts
import { useEffect, useCallback, useState, useRef } from 'react';
import { socketService } from '@/socket/socket';
import { useAuthStore } from '@/store/authStore'; 
interface UseSocketReturn {
  isConnected: boolean;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  error: string | null;
  socketId: string | null;

  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;

  emit: (event: string, data?: any) => boolean;
  on: (event: string, callback: (data: any) => void) => () => void;
  off: (event: string, callback: (data: any) => void) => void;

  joinRoom: (room: string) => boolean;
  leaveRoom: (room: string) => boolean;

  joinChat: (chatId: number) => void;
  leaveChat: (chatId: number) => void;
  emitTyping: (chatId: number, isTyping: boolean) => boolean;

  joinCallRoom: (callId: number) => void;
  leaveCallRoom: (callId: number) => void;

  ping: () => Promise<number>;
  getStats: () => {
    connected: boolean;
    socketId: string | null;
    subscribedRooms: number;
    reconnectAttempts: number;
    manuallyDisconnected: boolean;
  };
}

export const useSocket = (): UseSocketReturn => {
  const { isAuthenticated, token, user } = useAuthStore();
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mountedRef = useRef(true);

  // Initialize socket connection
  useEffect(() => {
    mountedRef.current = true;
    
    if (isAuthenticated && token && user) {
      const timer = setTimeout(() => {
        connect();
      }, 100);

      return () => {
        clearTimeout(timer);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
      };
    } else {
      disconnect();
    }

    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = undefined;
      }
    };
  }, [isAuthenticated, token, user?.id]);

  // Listen for socket events
  useEffect(() => {
    const handleConnect = () => {
      if (!mountedRef.current) return;
      setConnectionStatus('connected');
      setIsConnected(true);
      setError(null);
      reconnectAttempts.current = 0;
      setSocketId(socketService.getSocketId());
      if (user) socketService.emit('join_user_room', { user_id: user.id });
    };

    const handleDisconnect = (data?: any) => {
      if (!mountedRef.current) return;
      setConnectionStatus('disconnected');
      setIsConnected(false);
      setSocketId(null);
      if (data?.reason !== 'io client disconnect' && isAuthenticated) scheduleReconnect();
    };

    const handleConnectError = (data?: any) => {
      if (!mountedRef.current) return;
      setConnectionStatus('error');
      setError(`Connection error: ${data?.error?.message || 'Unknown error'}`);
      setIsConnected(false);
      if (isAuthenticated) scheduleReconnect();
    };

    const handleError = (data?: any) => {
      if (!mountedRef.current) return;
      setError(`Socket error: ${data?.error?.message || 'Unknown error'}`);
    };

    const handleReconnectAttempt = () => {
      if (!mountedRef.current) return;
      setConnectionStatus('connecting');
    };

    const handleReconnected = () => {
      if (!mountedRef.current) return;
      setConnectionStatus('connected');
      setIsConnected(true);
      setSocketId(socketService.getSocketId());
      setError(null);
    };

    const handleReconnectFailed = () => {
      if (!mountedRef.current) return;
      setError('Max reconnection attempts reached. Please refresh the page.');
      setConnectionStatus('error');
      setIsConnected(false);
    };

    // Subscribe to socket events
    socketService.on('socket:connected', handleConnect);
    socketService.on('socket:disconnected', handleDisconnect);
    socketService.on('socket:connect_error', handleConnectError);
    socketService.on('socket:error', handleError);
    socketService.on('socket:reconnect_attempt', handleReconnectAttempt);
    socketService.on('socket:reconnected', handleReconnected);
    socketService.on('socket:reconnect_failed', handleReconnectFailed);

    const unsubscribeStatus = socketService.onConnectionChange((connected) => {
      if (!mountedRef.current) return;
      setIsConnected(connected);
      setSocketId(socketService.getSocketId());
      if (connected) {
        setConnectionStatus('connected');
        setError(null);
      }
    });

    // Initial sync
    setIsConnected(socketService.isConnected());
    setSocketId(socketService.getSocketId());

    // Cleanup
    return () => {
      socketService.off('socket:connected', handleConnect);
      socketService.off('socket:disconnected', handleDisconnect);
      socketService.off('socket:connect_error', handleConnectError);
      socketService.off('socket:error', handleError);
      socketService.off('socket:reconnect_attempt', handleReconnectAttempt);
      socketService.off('socket:reconnected', handleReconnected);
      socketService.off('socket:reconnect_failed', handleReconnectFailed);
      unsubscribeStatus?.();
    };
  }, [isAuthenticated, user]);

  // Connection management
  const connect = useCallback(async () => {
    if (socketService.isConnected()) {
      setConnectionStatus('connected');
      setIsConnected(true);
      setSocketId(socketService.getSocketId());
      return;
    }

    if (!token) {
      setError('No authentication token available');
      setConnectionStatus('error');
      return;
    }

    setConnectionStatus('connecting');
    setError(null);

    try {
      await socketService.connect();
    } catch (err: any) {
      setConnectionStatus('error');
      setError(`Failed to connect: ${err.message}`);
      throw err;
    }
  }, [token]);

  const disconnect = useCallback(() => {
    socketService.disconnect();
    setConnectionStatus('disconnected');
    setIsConnected(false);
    setError(null);
    setSocketId(null);
    reconnectAttempts.current = 0;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
  }, []);

  const reconnect = useCallback(async () => {
    if (socketService.isConnected()) {
      setConnectionStatus('connected');
      setIsConnected(true);
      setSocketId(socketService.getSocketId());
      return;
    }

    if (reconnectAttempts.current >= maxReconnectAttempts) {
      setError('Max reconnection attempts reached. Please refresh the page.');
      setConnectionStatus('error');
      return;
    }

    reconnectAttempts.current += 1;

    try {
      await connect();
      reconnectAttempts.current = 0;
    } catch {
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(() => reconnect(), delay);
    }
  }, [connect]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      setError('Connection lost. Please refresh the page.');
      setConnectionStatus('error');
      return;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }

    const baseDelay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
    const jitter = Math.random() * 1000;
    const delay = baseDelay + jitter;

    reconnectTimeoutRef.current = setTimeout(() => reconnect(), delay);
  }, [reconnect]);

  // Event handling
  const emit = useCallback((event: string, data?: any): boolean => {
    if (!socketService.isConnected()) {
      setError('Socket not connected');
      return false;
    }
    return socketService.emit(event, data);
  }, []);

  const on = useCallback((event: string, callback: (data: any) => void) => {
    socketService.on(event, callback);
    return () => socketService.off(event, callback);
  }, []);

  const off = useCallback((event: string, callback: (data: any) => void) => {
    socketService.off(event, callback);
  }, []);

  // Rooms & chat/call helpers
  const joinRoom = useCallback((room: string) => socketService.joinRoom(room), []);
  const leaveRoom = useCallback((room: string) => socketService.leaveRoom(room), []);
  
  const joinChat = useCallback((chatId: number) => joinRoom(`chat_${chatId}`), [joinRoom]);
  const leaveChat = useCallback((chatId: number) => leaveRoom(`chat_${chatId}`), [leaveRoom]);
  
  const emitTyping = useCallback((chatId: number, isTyping: boolean) => 
    emit(isTyping ? 'typing_start' : 'typing_end', { chat_id: chatId }), [emit]);
  
  const joinCallRoom = useCallback((callId: number) => joinRoom(`call_${callId}`), [joinRoom]);
  const leaveCallRoom = useCallback((callId: number) => leaveRoom(`call_${callId}`), [leaveRoom]);

  // Utilities
  const ping = useCallback((): Promise<number> => {
    return new Promise((resolve, reject) => {
      if (!socketService.isConnected()) {
        reject(new Error('Socket not connected'));
        return;
      }

      const start = Date.now();
      const timeout = setTimeout(() => {
        socketService.off('pong', handlePong);
        reject(new Error('Ping timeout'));
      }, 5000);

      const handlePong = () => {
        clearTimeout(timeout);
        socketService.off('pong', handlePong);
        resolve(Date.now() - start);
      };

      socketService.on('pong', handlePong);
      socketService.emit('ping');
    });
  }, []);

  const getStats = useCallback(() => socketService.getStats(), []);

  return {
    isConnected: socketService.isConnected(),
    connectionStatus,
    error,
    socketId,
    connect,
    disconnect,
    reconnect,
    emit,
    on,
    off,
    joinRoom,
    leaveRoom,
    joinChat,
    leaveChat,
    emitTyping,
    joinCallRoom,
    leaveCallRoom,
    ping,
    getStats,
  };
};