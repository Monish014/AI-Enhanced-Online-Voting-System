import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

/**
 * useSocket
 *
 * Creates (and tears down) a Socket.io connection for the admin dashboard.
 * Emits 'join-admin' with the JWT token so the server can verify before
 * admitting to the admin-room.
 *
 * @param {boolean}  enabled   - connect only when true (e.g. user is admin)
 * @param {object}   handlers  - map of { eventName: callback }
 * @returns { connected, emit }
 */
export default function useSocket(enabled = false, handlers = {}) {
  const socketRef   = useRef(null);
  const handlersRef = useRef(handlers);

  // Keep handlers ref current without reconnecting
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!enabled) return;

    const token = localStorage.getItem('voteai_access_token');
    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      socket.emit('join-admin', token);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    // Register all passed handlers dynamically
    const registerHandlers = (h) => {
      Object.entries(h).forEach(([event, cb]) => {
        socket.on(event, (...args) => handlersRef.current[event]?.(...args));
      });
    };
    registerHandlers(handlers);

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  // Only re-run if enabled changes — handlers update via ref
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const emit = useCallback((event, ...args) => {
    socketRef.current?.emit(event, ...args);
  }, []);

  const connected = () => socketRef.current?.connected ?? false;

  return { connected, emit, socket: socketRef };
}
