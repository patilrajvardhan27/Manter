import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

interface MatchUser {
  id: string;
  name: string;
  age: number;
  photos: string[];
  city?: string;
  isVerified: boolean;
  manProfile?: { communityScore: number; ratingCount: number };
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

export default function MatchesScreen() {
  const { user } = useAuthStore();
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMatches = useCallback(async () => {
    try {
      const { data } = await api.get('/matches');
      setMatches(data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchMatches(); }, [fetchMatches]));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Matches</Text>
        {matches.length > 0 && (
          <Text style={styles.count}>
            {matches.length} match{matches.length !== 1 ? 'es' : ''}
          </Text>
        )}
      </View>

      <FlatList
        data={matches}
        keyExtractor={(item) => item.matchId}
        contentContainerStyle={matches.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchMatches(); }}
            tintColor="#7c3aed"
          />
        }
        ListEmptyComponent={<EmptyState />}
        renderItem={({ item }) => (
          <MatchRow
            match={item}
            myId={user?.id ?? ''}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/chat/[matchId]',
                params: { matchId: item.matchId },
              })
            }
            onProfilePress={() =>
              router.push({
                pathname: '/profile/[userId]',
                params: { userId: item.otherUser.id },
              })
            }
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

function MatchRow({
  match,
  myId,
  onPress,
  onProfilePress,
}: {
  match: MatchItem;
  myId: string;
  onPress: () => void;
  onProfilePress: () => void;
}) {
  const { otherUser, lastMessage, unread, compatibilityScore } = match;
  const photo = otherUser.photos[0];

  const lastText = lastMessage
    ? lastMessage.senderId === myId
      ? `You: ${lastMessage.content}`
      : lastMessage.content
    : 'Say hello 👋';

  const matchedAt = new Date(match.createdAt);
  const isToday = new Date().toDateString() === matchedAt.toDateString();
  const timeLabel = isToday
    ? matchedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : matchedAt.toLocaleDateString([], { month: 'short', day: 'numeric' });

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
    >
      <Pressable onPress={onProfilePress} style={styles.avatarWrap}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarLetter}>{otherUser.name[0]?.toUpperCase()}</Text>
          </View>
        )}
        <View style={[styles.scoreRing, { borderColor: scoreColor(compatibilityScore) }]}>
          <Text style={styles.scoreRingText}>{Math.round(compatibilityScore)}</Text>
        </View>
      </Pressable>

      <View style={styles.rowText}>
        <View style={styles.rowTop}>
          <Text style={[styles.rowName, unread && styles.rowNameUnread]}>
            {otherUser.name}, {otherUser.age}
          </Text>
          <Text style={styles.rowTime}>{timeLabel}</Text>
        </View>
        <Text
          style={[styles.rowMessage, unread && styles.rowMessageUnread]}
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
      <Text style={styles.emptyIcon}>💜</Text>
      <Text style={styles.emptyTitle}>No matches yet</Text>
      <Text style={styles.emptySub}>
        Start swiping in Discover. When someone likes you back, they'll appear here.
      </Text>
      <Pressable
        style={styles.discoverBtn}
        onPress={() => router.push('/(tabs)/discover')}
      >
        <Text style={styles.discoverBtnText}>Go to Discover</Text>
      </Pressable>
    </View>
  );
}

function scoreColor(score: number): string {
  if (score >= 75) return '#10b981';
  if (score >= 55) return '#f59e0b';
  return '#9ca3af';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#111827' },
  count: { fontSize: 13, color: '#9ca3af' },

  list: { paddingTop: 4 },
  emptyList: { flex: 1, justifyContent: 'center' },
  separator: { height: 1, backgroundColor: '#f3f4f6', marginLeft: 86 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 14,
  },
  rowPressed: { backgroundColor: '#f9fafb' },

  avatarWrap: { position: 'relative' },
  avatar: { width: 58, height: 58, borderRadius: 29 },
  avatarFallback: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: { fontSize: 22, fontWeight: '800', color: '#7c3aed' },

  scoreRing: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreRingText: { fontSize: 9, fontWeight: '800', color: '#111827' },

  rowText: { flex: 1, gap: 3 },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  rowNameUnread: { fontWeight: '800' },
  rowTime: { fontSize: 12, color: '#9ca3af' },
  rowMessage: { fontSize: 13, color: '#9ca3af' },
  rowMessageUnread: { color: '#374151', fontWeight: '600' },

  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7c3aed',
  },

  empty: { alignItems: 'center', paddingHorizontal: 40, gap: 10 },
  emptyIcon: { fontSize: 52, marginBottom: 8 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  emptySub: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  discoverBtn: {
    marginTop: 16,
    paddingVertical: 13,
    paddingHorizontal: 28,
    backgroundColor: '#7c3aed',
    borderRadius: 14,
  },
  discoverBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
