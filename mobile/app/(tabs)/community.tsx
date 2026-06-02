import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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

interface RatedUser {
  id: string;
  name: string;
  age: number;
  photos: string[];
  city?: string;
  isVerified: boolean;
  communityScore: number;
  ratingCount: number;
}

interface RecentActivity {
  ratedUser: RatedUser & { manProfile?: { communityScore: number; ratingCount: number } };
  overallScore: number;
  createdAt: string;
}

interface FeedData {
  topRated: RatedUser[];
  recentActivity: RecentActivity[];
  hasMore: boolean;
}

export default function CommunityScreen() {
  const { user } = useAuthStore();
  const [feed, setFeed] = useState<FeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeed = useCallback(async () => {
    try {
      const { data } = await api.get('/ratings/feed');
      setFeed(data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchFeed(); }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  const hasTopRated = (feed?.topRated?.length ?? 0) > 0;
  const hasActivity = (feed?.recentActivity?.length ?? 0) > 0;
  const isEmpty = !hasTopRated && !hasActivity;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchFeed(); }}
            tintColor="#7c3aed"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Community</Text>
          <Text style={styles.subtitle}>
            Real ratings from real women
          </Text>
        </View>

        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoIcon}>🛡</Text>
          <Text style={styles.infoText}>
            All ratings are based on real dating experiences. Rater identities stay anonymous.
          </Text>
        </View>

        {isEmpty && <EmptyState />}

        {/* Top rated section */}
        {hasTopRated && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Rated Men</Text>
              <Text style={styles.sectionSub}>Ranked by community score</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.topRatedScroll}
            >
              {feed!.topRated.map((u) => (
                <TopRatedCard
                  key={u.id}
                  user={u}
                  onPress={() =>
                    router.push({ pathname: '/profile/[userId]', params: { userId: u.id } })
                  }
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Recent activity */}
        {hasActivity && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Ratings</Text>
              <Text style={styles.sectionSub}>Activity this week</Text>
            </View>
            <View style={styles.activityList}>
              {feed!.recentActivity.map((item, i) => (
                <ActivityRow
                  key={`${item.ratedUser.id}-${i}`}
                  item={item}
                  onPress={() =>
                    router.push({
                      pathname: '/profile/[userId]',
                      params: { userId: item.ratedUser.id },
                    })
                  }
                />
              ))}
            </View>
          </View>
        )}

        {/* Rate prompt for women */}
        {user?.role === 'WOMAN' && (
          <View style={styles.ratePrompt}>
            <Text style={styles.ratePromptIcon}>⭐</Text>
            <View style={styles.ratePromptText}>
              <Text style={styles.ratePromptTitle}>Rated someone recently?</Text>
              <Text style={styles.ratePromptSub}>
                Your rating helps women in the community make safer choices.
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Top rated card (horizontal) ──────────────────────────────────────────────

function TopRatedCard({ user, onPress }: { user: RatedUser; onPress: () => void }) {
  const photo = user.photos[0];
  const score = user.communityScore;

  return (
    <Pressable
      style={({ pressed }) => [cardStyles.wrap, pressed && { opacity: 0.85 }]}
      onPress={onPress}
    >
      {photo ? (
        <Image source={{ uri: photo }} style={cardStyles.photo} />
      ) : (
        <View style={cardStyles.photoFallback}>
          <Text style={cardStyles.photoLetter}>{user.name[0]?.toUpperCase()}</Text>
        </View>
      )}

      {/* Score badge */}
      <View style={[cardStyles.scoreBadge, { borderColor: scoreColor(score) }]}>
        <Text style={[cardStyles.scoreNum, { color: scoreColor(score) }]}>
          {score.toFixed(1)}
        </Text>
      </View>

      <View style={cardStyles.info}>
        <Text style={cardStyles.name} numberOfLines={1}>
          {user.name}, {user.age}
        </Text>
        {user.city ? (
          <Text style={cardStyles.city} numberOfLines={1}>{user.city}</Text>
        ) : null}
        <Text style={cardStyles.ratings}>
          {user.ratingCount} rating{user.ratingCount !== 1 ? 's' : ''}
        </Text>
      </View>
    </Pressable>
  );
}

// ─── Recent activity row ──────────────────────────────────────────────────────

function ActivityRow({ item, onPress }: { item: RecentActivity; onPress: () => void }) {
  const { ratedUser, overallScore, createdAt } = item;
  const score = ratedUser.manProfile?.communityScore ?? overallScore;
  const photo = ratedUser.photos[0];
  const timeAgo = getTimeAgo(new Date(createdAt));
  const sentiment = overallScore >= 4 ? 'highly' : overallScore >= 3 ? 'positively' : 'critically';

  return (
    <Pressable
      style={({ pressed }) => [activityStyles.row, pressed && activityStyles.rowPressed]}
      onPress={onPress}
    >
      {photo ? (
        <Image source={{ uri: photo }} style={activityStyles.avatar} />
      ) : (
        <View style={activityStyles.avatarFallback}>
          <Text style={activityStyles.avatarLetter}>{ratedUser.name[0]?.toUpperCase()}</Text>
        </View>
      )}

      <View style={activityStyles.text}>
        <Text style={activityStyles.headline} numberOfLines={2}>
          <Text style={activityStyles.bold}>A woman</Text> rated{' '}
          <Text style={activityStyles.bold}>{ratedUser.name}</Text>{' '}
          <Text style={{ color: sentimentColor(overallScore) }}>{sentiment}</Text>
        </Text>
        <Text style={activityStyles.meta}>
          {ratedUser.city ? `${ratedUser.city} · ` : ''}{timeAgo}
        </Text>
      </View>

      <View style={[activityStyles.scoreChip, { borderColor: scoreColor(score) }]}>
        <Text style={[activityStyles.scoreChipText, { color: scoreColor(score) }]}>
          {score.toFixed(1)}
        </Text>
      </View>
    </Pressable>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>🌱</Text>
      <Text style={styles.emptyTitle}>Building the community</Text>
      <Text style={styles.emptySub}>
        As more women share their experiences, the community feed will grow.
        Be one of the first to rate.
      </Text>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 8) return '#10b981';
  if (score >= 6) return '#f59e0b';
  if (score >= 4) return '#f97316';
  return '#ef4444';
}

function sentimentColor(score: number): string {
  if (score >= 4) return '#10b981';
  if (score >= 3) return '#f59e0b';
  return '#ef4444';
}

function getTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: '#9ca3af', marginTop: 2 },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  infoIcon: { fontSize: 16 },
  infoText: { flex: 1, fontSize: 12, color: '#166534', lineHeight: 18 },

  section: { marginBottom: 24 },
  sectionHeader: { paddingHorizontal: 24, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  sectionSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },

  topRatedScroll: { paddingHorizontal: 20, gap: 12 },

  activityList: { paddingHorizontal: 20, gap: 1 },

  ratePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 20,
    padding: 16,
    backgroundColor: '#faf5ff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#ede9fe',
  },
  ratePromptIcon: { fontSize: 24 },
  ratePromptText: { flex: 1 },
  ratePromptTitle: { fontSize: 14, fontWeight: '700', color: '#7c3aed' },
  ratePromptSub: { fontSize: 12, color: '#6b7280', marginTop: 3, lineHeight: 17 },

  empty: {
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  emptyIcon: { fontSize: 48, marginBottom: 4 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  emptySub: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
});

const cardStyles = StyleSheet.create({
  wrap: {
    width: 150,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  photo: { width: '100%', height: 160 },
  photoFallback: {
    width: '100%',
    height: 160,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoLetter: { fontSize: 52, fontWeight: '800', color: '#7c3aed' },

  scoreBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  scoreNum: { fontSize: 14, fontWeight: '800' },

  info: { padding: 10, gap: 2 },
  name: { fontSize: 13, fontWeight: '700', color: '#111827' },
  city: { fontSize: 11, color: '#6b7280' },
  ratings: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
});

const activityStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  rowPressed: { backgroundColor: '#f9fafb' },

  avatar: { width: 46, height: 46, borderRadius: 23 },
  avatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: { fontSize: 18, fontWeight: '800', color: '#7c3aed' },

  text: { flex: 1 },
  headline: { fontSize: 13, color: '#374151', lineHeight: 19 },
  bold: { fontWeight: '700', color: '#111827' },
  meta: { fontSize: 11, color: '#9ca3af', marginTop: 2 },

  scoreChip: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#fff',
  },
  scoreChipText: { fontSize: 13, fontWeight: '800' },
});
