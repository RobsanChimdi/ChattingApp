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

  joinChat: (chatId: string) => void;
  leaveChat: (chatId: string) => void;
  emitTyping: (chatId: string, isTyping: boolean) => boolean;

  joinCallRoom: (callId: string) => void;
  leaveCallRoom: (callId: string) => void;

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

  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Initialize socket connection
  useEffect(() => {
    if (isAuthenticated && token && user) {
      const timer = setTimeout(() => {
        connect();
      }, 100);

      return () => clearTimeout(timer);
    } else {
      disconnect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [isAuthenticated, token, user?.id]);

  // Listen for socket events
  useEffect(() => {
    const handleConnect = () => {
      setConnectionStatus('connected');
      setError(null);
      reconnectAttempts.current = 0;
      setSocketId(socketService.getSocketId());
      if (user) socketService.emit('join_user_room', { user_id: user.id });
    };

    const handleDisconnect = (data?: any) => {
      setConnectionStatus('disconnected');
      setSocketId(null);
      if (data?.reason !== 'io client disconnect' && isAuthenticated) scheduleReconnect();
    };

    const handleConnectError = (data?: any) => {
      setConnectionStatus('error');
      setError(`Connection error: ${data?.error?.message || 'Unknown error'}`);
      if (isAuthenticated) scheduleReconnect();
    };

    const handleError = (data?: any) => setError(`Socket error: ${data?.error?.message || 'Unknown error'}`);
    const handleReconnectAttempt = () => setConnectionStatus('connecting');
    const handleReconnected = () => {
      setConnectionStatus('connected');
      setSocketId(socketService.getSocketId());
    };
    const handleReconnectFailed = () => {
      setError('Max reconnection attempts reached. Please refresh the page.');
      setConnectionStatus('error');
    };

    // Subscribe
    socketService.on('socket:connected', handleConnect);
    socketService.on('socket:disconnected', handleDisconnect);
    socketService.on('socket:connect_error', handleConnectError);
    socketService.on('socket:error', handleError);
    socketService.on('socket:reconnect_attempt', handleReconnectAttempt);
    socketService.on('socket:reconnected', handleReconnected);
    socketService.on('socket:reconnect_failed', handleReconnectFailed);

    const unsubscribeStatus = socketService.onConnectionChange((connected) => {
      setSocketId(socketService.getSocketId());
      if (connected) setConnectionStatus('connected');
    });

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
    setError(null);
    setSocketId(null);

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
  }, []);

  const reconnect = useCallback(async () => {
    if (socketService.isConnected()) {
      setConnectionStatus('connected');
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
  const joinChat = useCallback((chatId: string) => joinRoom(`chat_${chatId}`), [joinRoom]);
  const leaveChat = useCallback((chatId: string) => leaveRoom(`chat_${chatId}`), [leaveRoom]);
  const emitTyping = useCallback((chatId: string, isTyping: boolean) => emit(isTyping ? 'typing_start' : 'typing_end', { chat_id: chatId }), [emit]);
  const joinCallRoom = useCallback((callId: string) => joinRoom(`call_${callId}`), [joinRoom]);
  const leaveCallRoom = useCallback((callId: string) => leaveRoom(`call_${callId}`), [leaveRoom]);

  // Utilities
  const ping = useCallback((): Promise<number> => {
    return new Promise((resolve, reject) => {
      if (!socketService.isConnected()) return reject(new Error('Socket not connected'));

      const start = Date.now();
      const handlePong = () => {
        socketService.off('pong', handlePong);
        resolve(Date.now() - start);
      };

      socketService.on('pong', handlePong);
      socketService.emit('ping');

      setTimeout(() => {
        socketService.off('pong', handlePong);
        reject(new Error('Ping timeout'));
      }, 5000);
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
