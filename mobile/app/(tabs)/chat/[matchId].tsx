import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { MessageBubble } from '../../../components/chat/MessageBubble';
import { ChatInput } from '../../../components/chat/ChatInput';
import { RedFlagBanner } from '../../../components/chat/RedFlagBanner';
import { useChatStore, ChatMessage } from '../../../store/chat.store';
import { useSocket, emitSocket } from '../../../hooks/useSocket';
import { useAuthStore } from '../../../store/auth.store';
import { api } from '../../../lib/api';

interface OtherUser {
  id: string;
  name: string;
  photos: string[];
  isVerified: boolean;
}

// Minimum gap in ms between two messages before we show a timestamp header
const TIMESTAMP_GAP_MS = 5 * 60 * 1000;

export default function ChatRoomScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { user } = useAuthStore();
  const socketRef = useSocket();

  const { messages, hasMore, typingUsers, onlineUsers, redFlagAlerts, setMessages,
    prependMessages, addMessage, dismissRedFlag } = useChatStore();

  // Prevent screenshots in chat for privacy
  usePreventScreenCapture();

  const roomMessages = messages[matchId] ?? [];
  const roomTyping = typingUsers[matchId] ?? new Set<string>();
  const redFlagAlert = redFlagAlerts[matchId];

  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const oldestMessageId = roomMessages[0]?.id;

  // Load initial history and join match socket room
  useEffect(() => {
    let active = true;

    api.get(`/chat/history/${matchId}`).then(({ data }) => {
      if (!active) return;
      setMessages(matchId, data.messages, data.hasMore);
      setOtherUser(data.otherUser);
      setLoading(false);
    }).catch(() => setLoading(false));

    // Join match room for read receipts
    const join = () => emitSocket(socketRef, 'chat:join', matchId);
    if (socketRef.current?.connected) {
      join();
    } else {
      socketRef.current?.once('connect', join);
    }

    // Mark existing messages as read
    emitSocket(socketRef, 'message:read', { matchId });

    return () => {
      active = false;
      emitSocket(socketRef, 'chat:leave', matchId);
    };
  }, [matchId]);

  // Mark newly arrived messages as read while screen is open
  useEffect(() => {
    if (roomMessages.length > 0) {
      emitSocket(socketRef, 'message:read', { matchId });
    }
  }, [roomMessages.length]);

  const loadOlderMessages = useCallback(async () => {
    if (!hasMore[matchId] || loadingOlder || !oldestMessageId) return;
    setLoadingOlder(true);
    try {
      const { data } = await api.get(
        `/chat/history/${matchId}?cursor=${oldestMessageId}`,
      );
      prependMessages(matchId, data.messages, data.hasMore);
    } finally {
      setLoadingOlder(false);
    }
  }, [matchId, hasMore, loadingOlder, oldestMessageId]);

  function sendMessage(text: string) {
    // Optimistic: show message immediately without waiting for server echo
    addMessage({
      id: `temp_${Date.now()}`,
      matchId,
      senderId: user!.id,
      content: text,
      createdAt: new Date().toISOString(),
      readAt: null,
    });
    emitSocket(socketRef, 'message:send', { matchId, content: text });
  }

  function handleTypingStart() {
    emitSocket(socketRef, 'typing:start', { matchId });
  }

  function handleTypingStop() {
    emitSocket(socketRef, 'typing:stop', { matchId });
  }

  const isOtherOnline = otherUser ? onlineUsers.has(otherUser.id) : false;
  const isOtherTyping = otherUser ? roomTyping.has(otherUser.id) : false;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#7c3aed" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Text style={styles.backText}>←</Text>
          </Pressable>

          <Pressable
            style={styles.headerCenter}
            onPress={() => otherUser && router.push({
              pathname: '/profile/[userId]',
              params: { userId: otherUser.id },
            })}
          >
            {otherUser?.photos[0] ? (
              <Image source={{ uri: otherUser.photos[0] }} style={styles.headerAvatar} />
            ) : (
              <View style={styles.headerAvatarFallback}>
                <Text style={styles.headerAvatarLetter}>
                  {otherUser?.name[0]?.toUpperCase()}
                </Text>
              </View>
            )}
            <View>
              <Text style={styles.headerName}>{otherUser?.name}</Text>
              <Text style={[styles.headerStatus, isOtherOnline && styles.headerStatusOnline]}>
                {isOtherTyping ? 'typing...' : isOtherOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
          </Pressable>

          {/* AI Shield button — only for women */}
          {user?.role === 'WOMAN' && roomMessages.length >= 3 ? (
            <Pressable
              style={styles.shieldBtn}
              hitSlop={8}
              onPress={() =>
                router.push({
                  pathname: '/analysis/[matchId]',
                  params: { matchId, otherName: otherUser?.name ?? '' },
                })
              }
            >
              <Text style={styles.shieldText}>🛡</Text>
            </Pressable>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={roomMessages}
          keyExtractor={(m) => m.id}
          inverted
          // Inverted FlatList: data index 0 = newest (bottom of screen)
          // But our store is oldest-first, so we need to reverse for display
          renderItem={({ item, index }) => {
            const reversed = [...roomMessages].reverse();
            const msg = reversed[index];
            const prevMsg = reversed[index + 1];
            const showTimestamp =
              !prevMsg ||
              new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() >
                TIMESTAMP_GAP_MS;

            return (
              <MessageBubble
                message={msg}
                isMe={msg.senderId === user?.id}
                showTimestamp={showTimestamp}
              />
            );
          }}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onEndReached={loadOlderMessages}
          onEndReachedThreshold={0.2}
          ListFooterComponent={
            loadingOlder ? (
              <ActivityIndicator color="#7c3aed" style={styles.loadingOlder} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>
                Say hello to {otherUser?.name} 👋
              </Text>
              <Text style={styles.emptyChatSub}>
                Be genuine, be yourself.
              </Text>
            </View>
          }
        />

        {/* Typing indicator */}
        {isOtherTyping && (
          <View style={styles.typingBubble}>
            <Text style={styles.typingDots}>• • •</Text>
            <Text style={styles.typingLabel}>{otherUser?.name} is typing</Text>
          </View>
        )}

        {/* Red flag banner */}
        {redFlagAlert && (
          <RedFlagBanner
            alert={redFlagAlert}
            onDismiss={() => dismissRedFlag(matchId)}
          />
        )}

        {/* Input */}
        <ChatInput
          onSend={sendMessage}
          onTypingStart={handleTypingStart}
          onTypingStop={handleTypingStop}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  kav: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 8,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  backText: { fontSize: 22, color: '#7c3aed', fontWeight: '600' },

  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: { width: 38, height: 38, borderRadius: 19 },
  headerAvatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarLetter: { fontSize: 16, fontWeight: '800', color: '#7c3aed' },
  headerName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  headerStatus: { fontSize: 11, color: '#9ca3af' },
  headerStatusOnline: { color: '#10b981' },

  messageList: { paddingTop: 12, paddingBottom: 4, flexGrow: 1, justifyContent: 'flex-end' },

  loadingOlder: { marginVertical: 12 },

  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 6, minHeight: 300 },
  emptyChatText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  emptyChatSub: { fontSize: 13, color: '#9ca3af' },

  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  typingDots: { fontSize: 16, color: '#9ca3af', letterSpacing: 3 },
  typingLabel: { fontSize: 12, color: '#9ca3af' },

  shieldBtn: {
    width: 40,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shieldText: { fontSize: 20 },
});
