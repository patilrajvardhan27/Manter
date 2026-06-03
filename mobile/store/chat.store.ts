import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  redFlagScore?: number;
  redFlagsFound?: string[];
  readAt?: string | null;
  createdAt: string;
}

export interface RedFlagAlert {
  matchId: string;
  messageId: string;
  score: number;
  flags: string[];
  explanation: string;
}

interface ChatState {
  // messages keyed by matchId, stored oldest-first
  messages: Record<string, ChatMessage[]>;
  // users currently typing per matchId
  typingUsers: Record<string, Set<string>>;
  // online user IDs
  onlineUsers: Set<string>;
  // undismissed red flag alerts per matchId
  redFlagAlerts: Record<string, RedFlagAlert>;
  // whether older pages exist per matchId
  hasMore: Record<string, boolean>;

  setMessages: (matchId: string, messages: ChatMessage[], hasMore: boolean) => void;
  prependMessages: (matchId: string, messages: ChatMessage[], hasMore: boolean) => void;
  addMessage: (message: ChatMessage) => void;
  markRead: (matchId: string, readBy: string) => void;
  setTyping: (matchId: string, userId: string, isTyping: boolean) => void;
  setOnline: (userId: string, online: boolean) => void;
  setRedFlagAlert: (alert: RedFlagAlert) => void;
  dismissRedFlag: (matchId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: {},
  typingUsers: {},
  onlineUsers: new Set(),
  redFlagAlerts: {},
  hasMore: {},

  setMessages: (matchId, messages, hasMore) =>
    set((s) => ({
      messages: { ...s.messages, [matchId]: messages },
      hasMore: { ...s.hasMore, [matchId]: hasMore },
    })),

  prependMessages: (matchId, older, hasMore) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [matchId]: [...older, ...(s.messages[matchId] ?? [])],
      },
      hasMore: { ...s.hasMore, [matchId]: hasMore },
    })),

  addMessage: (message) =>
    set((s) => {
      const existing = s.messages[message.matchId] ?? [];
      if (existing.some((m) => m.id === message.id)) return s;
      // Replace matching optimistic temp message with the real server one
      const tempIdx = existing.findIndex(
        (m) =>
          m.id.startsWith('temp_') &&
          m.senderId === message.senderId &&
          m.content === message.content,
      );
      if (tempIdx !== -1) {
        const updated = [...existing];
        updated[tempIdx] = message;
        return { messages: { ...s.messages, [message.matchId]: updated } };
      }
      return { messages: { ...s.messages, [message.matchId]: [...existing, message] } };
    }),

  markRead: (matchId, _readBy) =>
    set((s) => {
      const msgs = s.messages[matchId];
      if (!msgs) return s;
      return {
        messages: {
          ...s.messages,
          [matchId]: msgs.map((m) =>
            m.readAt ? m : { ...m, readAt: new Date().toISOString() },
          ),
        },
      };
    }),

  setTyping: (matchId, userId, isTyping) =>
    set((s) => {
      const current = new Set(s.typingUsers[matchId] ?? []);
      isTyping ? current.add(userId) : current.delete(userId);
      return { typingUsers: { ...s.typingUsers, [matchId]: current } };
    }),

  setOnline: (userId, online) =>
    set((s) => {
      const next = new Set(s.onlineUsers);
      online ? next.add(userId) : next.delete(userId);
      return { onlineUsers: next };
    }),

  setRedFlagAlert: (alert) =>
    set((s) => ({ redFlagAlerts: { ...s.redFlagAlerts, [alert.matchId]: alert } })),

  dismissRedFlag: (matchId) =>
    set((s) => {
      const next = { ...s.redFlagAlerts };
      delete next[matchId];
      return { redFlagAlerts: next };
    }),
}));
