import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '../config/constants';
import { useAuthStore } from '../store/authStore';

interface UseSocketOptions {
  autoConnect?: boolean;
  namespace?: string;
}

export interface NotificationPayload {
  type: string;
  title: string;
  message: string;
  data?: any;
  timestamp: string;
}

export const useSocket = (options: UseSocketOptions = {}) => {
  const { autoConnect = true, namespace = '' } = options;
  
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { accessToken } = useAuthStore();

  useEffect(() => {
    if (!autoConnect || !accessToken) return;

    // Create socket connection
    const socket = io(`${API_CONFIG.SOCKET_URL}${namespace}`, {
      auth: {
        token: accessToken,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setIsConnected(true);
      setError(null);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setError(err.message);
      setIsConnected(false);
    });

    // Cleanup
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [autoConnect, accessToken, namespace]);

  // Subscribe to notifications
  const onNotification = (callback: (notification: NotificationPayload) => void) => {
    if (socketRef.current) {
      socketRef.current.on('notification', callback);
      return () => {
        socketRef.current?.off('notification', callback);
      };
    }
  };

  // Subscribe to any event
  const on = (event: string, callback: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
      return () => {
        socketRef.current?.off(event, callback);
      };
    }
  };

  // Emit event
  const emit = (event: string, data?: any) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
    }
  };

  // Join room
  const joinRoom = (room: string) => {
    emit('join_room', { room });
  };

  // Leave room
  const leaveRoom = (room: string) => {
    emit('leave_room', { room });
  };

  // Disconnect socket
  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  // Reconnect socket
  const reconnect = () => {
    if (socketRef.current) {
      socketRef.current.connect();
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    error,
    on,
    emit,
    onNotification,
    joinRoom,
    leaveRoom,
    disconnect,
    reconnect,
  };
};
