import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { connectSocket } from '../lib/socket';
import { useChatStore, ChatMessage, RedFlagAlert } from '../store/chat.store';

/**
 * Connects the Socket.io client (once, globally) and wires store updates
 * for all real-time events. Safe to call from multiple components — the
 * underlying socket is a singleton.
 */
export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { addMessage, markRead, setTyping, setOnline, setRedFlagAlert } = useChatStore();

  useEffect(() => {
    let mounted = true;

    connectSocket().then((socket) => {
      if (!mounted) return;
      socketRef.current = socket;

      socket.on('message:new', (msg: ChatMessage) => {
        addMessage(msg);
      });

      socket.on('message:read', ({ matchId, readBy }: { matchId: string; readBy: string }) => {
        markRead(matchId, readBy);
      });

      socket.on('typing:start', ({ matchId, userId }: { matchId: string; userId: string }) => {
        setTyping(matchId, userId, true);
      });

      socket.on('typing:stop', ({ matchId, userId }: { matchId: string; userId: string }) => {
        setTyping(matchId, userId, false);
      });

      socket.on('presence:online', ({ userId }: { userId: string }) => {
        setOnline(userId, true);
      });

      socket.on('presence:offline', ({ userId }: { userId: string }) => {
        setOnline(userId, false);
      });

      socket.on('red_flag:alert', (alert: RedFlagAlert) => {
        setRedFlagAlert(alert);
      });
    });

    return () => {
      mounted = false;
      // Don't disconnect — keep the connection alive across screens
      const socket = socketRef.current;
      if (socket) {
        socket.off('message:new');
        socket.off('message:read');
        socket.off('typing:start');
        socket.off('typing:stop');
        socket.off('presence:online');
        socket.off('presence:offline');
        socket.off('red_flag:alert');
      }
    };
  }, []);

  return socketRef;
}

/** Emits a socket event safely (no-op if not connected). */
export function emitSocket(socketRef: React.RefObject<Socket | null>, event: string, data?: any) {
  socketRef.current?.emit(event, data);
}
