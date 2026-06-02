import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
  RefreshControl,
  SectionList,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';
import { useChatStore } from '../../../store/chat.store';
import { useSocket } from '../../../hooks/useSocket';

interface MatchUser {
  id: string;
  name: string;
  age: number;
  photos: string[];
  isVerified: boolean;
}

interface MatchItem {
  matchId: string;
  compatibilityScore: number;
  createdAt: string;
  otherUser: MatchUser;
  lastMessage: {
    content: string;
    createdAt: string;
    senderId: string;
    readAt: string | null;
  } | null;
  unread: boolean;
}

export default function ChatListScreen() {
  const { user } = useAuthStore();
  const { messages, redFlagAlerts } = useChatStore();
  useSocket(); // ensure socket is connected globally

  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMatches = useCallback(async () => {
    try {
      const { data } = await api.get('/matches');
      setMatches(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchMatches(); }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  // Split into: active conversations (have last message) vs new matches
  const conversations = matches.filter((m) => m.lastMessage);
  const newMatches = matches.filter((m) => !m.lastMessage);

  // Merge real-time unread state from chat store
  const enriched = conversations.map((m) => {
    const storeMessages = messages[m.matchId];
    const lastStoreMsg = storeMessages?.[storeMessages.length - 1];
    const hasRedFlag = !!redFlagAlerts[m.matchId];
    return { ...m, hasRedFlag, lastStoreMsg };
  });

  const sections = [
    ...(newMatches.length > 0
      ? [{ title: 'New Matches', data: newMatches, isNew: true }]
      : []),
    ...(enriched.length > 0
      ? [{ title: 'Messages', data: enriched, isNew: false }]
      : []),
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>

      {matches.length === 0 ? (
        <EmptyState />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.matchId}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchMatches(); }}
              tintColor="#7c3aed"
            />
          }
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item, section }) =>
            (section as any).isNew ? (
              <NewMatchBubble
                match={item}
                onPress={() =>
                  router.push({ pathname: '/(tabs)/chat/[matchId]', params: { matchId: item.matchId } })
                }
              />
            ) : (
              <ConversationRow
                match={item as any}
                myId={user?.id ?? ''}
                onPress={() =>
                  router.push({ pathname: '/(tabs)/chat/[matchId]', params: { matchId: item.matchId } })
                }
              />
            )
          }
          SectionSeparatorComponent={() => <View style={{ height: 8 }} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
        />
      )}
    </SafeAreaView>
  );
}

// ─── New match bubble (horizontal scroll row) ─────────────────────────────────

function NewMatchBubble({ match, onPress }: { match: MatchItem; onPress: () => void }) {
  const photo = match.otherUser.photos[0];
  return (
    <Pressable
      style={({ pressed }) => [bubbleStyles.wrap, pressed && { opacity: 0.8 }]}
      onPress={onPress}
    >
      {photo ? (
        <Image source={{ uri: photo }} style={bubbleStyles.avatar} />
      ) : (
        <View style={bubbleStyles.avatarFallback}>
          <Text style={bubbleStyles.avatarLetter}>
            {match.otherUser.name[0]?.toUpperCase()}
          </Text>
        </View>
      )}
      <View style={bubbleStyles.newDot} />
      <Text style={bubbleStyles.name} numberOfLines={1}>{match.otherUser.name}</Text>
    </Pressable>
  );
}

// ─── Conversation row ─────────────────────────────────────────────────────────

function ConversationRow({
  match,
  myId,
  onPress,
}: {
  match: MatchItem & { hasRedFlag?: boolean };
  myId: string;
  onPress: () => void;
}) {
  const { otherUser, lastMessage, unread, hasRedFlag } = match;
  const photo = otherUser.photos[0];

  const lastText = lastMessage
    ? lastMessage.senderId === myId
      ? `You: ${lastMessage.content}`
      : lastMessage.content
    : 'Say hello 👋';

  const time = lastMessage
    ? formatTime(lastMessage.createdAt)
    : formatTime(match.createdAt);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
    >
      {photo ? (
        <Image source={{ uri: photo }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarLetter}>{otherUser.name[0]?.toUpperCase()}</Text>
        </View>
      )}

      <View style={styles.rowText}>
        <View style={styles.rowTop}>
          <Text style={[styles.rowName, unread && styles.rowNameBold]}>
            {otherUser.name}
          </Text>
          <View style={styles.rowMeta}>
            {hasRedFlag && <Text style={styles.flagIndicator}>🚩</Text>}
            <Text style={styles.rowTime}>{time}</Text>
          </View>
        </View>
        <Text
          style={[styles.rowMsg, unread && styles.rowMsgBold]}
          numberOfLines={1}
        >
          {lastText}
        </Text>
      </View>

      {unread && <View style={styles.unreadDot} />}
    </Pressable>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>💬</Text>
      <Text style={styles.emptyTitle}>No messages yet</Text>
      <Text style={styles.emptySub}>
        Match with someone in Discover, then start a conversation.
      </Text>
      <Pressable style={styles.cta} onPress={() => router.push('/(tabs)/discover')}>
        <Text style={styles.ctaText}>Go to Discover</Text>
      </Pressable>
    </View>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const bubbleStyles = StyleSheet.create({
  wrap: { alignItems: 'center', width: 72, position: 'relative', paddingVertical: 4 },
  avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: '#7c3aed' },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ede9fe',
    borderWidth: 2,
    borderColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: { fontSize: 20, fontWeight: '800', color: '#7c3aed' },
  newDot: {
    position: 'absolute',
    top: 4,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#7c3aed',
    borderWidth: 2,
    borderColor: '#fff',
  },
  name: { fontSize: 11, color: '#374151', marginTop: 4, textAlign: 'center', maxWidth: 64 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827' },

  listContent: { paddingBottom: 24 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  separator: { height: 1, backgroundColor: '#f3f4f6', marginLeft: 82 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  rowPressed: { backgroundColor: '#f9fafb' },

  avatar: { width: 54, height: 54, borderRadius: 27 },
  avatarFallback: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: { fontSize: 20, fontWeight: '800', color: '#7c3aed' },

  rowText: { flex: 1, gap: 3 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowName: { fontSize: 15, fontWeight: '500', color: '#111827' },
  rowNameBold: { fontWeight: '800' },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flagIndicator: { fontSize: 12 },
  rowTime: { fontSize: 12, color: '#9ca3af' },
  rowMsg: { fontSize: 13, color: '#9ca3af' },
  rowMsgBold: { color: '#111827', fontWeight: '600' },

  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#7c3aed' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, padding: 40 },
  emptyIcon: { fontSize: 52, marginBottom: 4 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  emptySub: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  cta: {
    marginTop: 12,
    backgroundColor: '#7c3aed',
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  ctaText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
