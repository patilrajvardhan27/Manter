import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  GestureHandlerRootView,
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { CandidateCard, Candidate, CARD_W, CARD_H } from '../../components/cards/CandidateCard';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

const { width: SCREEN_W } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_W * 0.3;
const VELOCITY_THRESHOLD = 800;

export default function DiscoverScreen() {
  const { user } = useAuthStore();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [matchModal, setMatchModal] = useState<Candidate | null>(null);

  const fetchCandidates = useCallback(async (p: number) => {
    try {
      const { data } = await api.get(`/discover?page=${p}`);
      setCandidates((prev) => (p === 1 ? data.data : [...prev, ...data.data]));
      setHasMore(data.hasMore);
    } catch {
      Alert.alert('Error', 'Could not load candidates.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCandidates(1); }, []);

  const handleLike = useCallback(async (candidate: Candidate) => {
    try {
      const { data } = await api.post(`/matches/like/${candidate.id}`);
      if (data.matched) setMatchModal(candidate);
    } catch {
      /* silent — card already gone from stack */
    }
    setCandidates((prev) => {
      const remaining = prev.slice(1);
      if (remaining.length <= 3 && hasMore) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchCandidates(nextPage);
      }
      return remaining;
    });
  }, [page, hasMore, fetchCandidates]);

  const handlePass = useCallback(async (candidate: Candidate) => {
    api.post(`/matches/pass/${candidate.id}`).catch(() => null);
    setCandidates((prev) => {
      const remaining = prev.slice(1);
      if (remaining.length <= 3 && hasMore) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchCandidates(nextPage);
      }
      return remaining;
    });
  }, [page, hasMore, fetchCandidates]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Discover</Text>
          <Text style={styles.subtitle}>
            {user?.role === 'WOMAN' ? 'Ranked by your priorities' : 'Women near you'}
          </Text>
        </View>

        {/* Card stack */}
        <View style={styles.stack}>
          {candidates.length === 0 ? (
            <EmptyState onRefresh={() => fetchCandidates(1)} />
          ) : (
            candidates.slice(0, 3).map((c, i) =>
              i === 0 ? (
                <SwipeableCard
                  key={c.id}
                  candidate={c}
                  onLike={() => handleLike(c)}
                  onPass={() => handlePass(c)}
                />
              ) : (
                <CandidateCard key={c.id} candidate={c} stackIndex={i} />
              ),
            )
          )}
        </View>

        {/* Action buttons */}
        {candidates.length > 0 && (
          <View style={styles.actions}>
            <ActionButton
              label="✕"
              color="#ef4444"
              bg="#fee2e2"
              onPress={() => handlePass(candidates[0])}
            />
            <Pressable
              style={styles.profilePeek}
              onPress={() => router.push({ pathname: '/profile/[userId]', params: { userId: candidates[0].id } })}
            >
              <Text style={styles.profilePeekText}>View full profile</Text>
            </Pressable>
            <ActionButton
              label="♥"
              color="#7c3aed"
              bg="#ede9fe"
              onPress={() => handleLike(candidates[0])}
            />
          </View>
        )}

        {/* Match modal */}
        {matchModal && (
          <MatchModal
            candidate={matchModal}
            onClose={() => setMatchModal(null)}
            onMessage={() => {
              setMatchModal(null);
              router.push('/(tabs)/chat');
            }}
          />
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// ─── Swipeable front card ─────────────────────────────────────────────────────

function SwipeableCard({
  candidate,
  onLike,
  onPass,
}: {
  candidate: Candidate;
  onLike: () => void;
  onPass: () => void;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onStart: (_, ctx: any) => {
      ctx.startX = translateX.value;
      ctx.startY = translateY.value;
    },
    onActive: (event, ctx: any) => {
      translateX.value = ctx.startX + event.translationX;
      translateY.value = ctx.startY + event.translationY * 0.3;
    },
    onEnd: (event) => {
      const shouldLike =
        translateX.value > SWIPE_THRESHOLD || event.velocityX > VELOCITY_THRESHOLD;
      const shouldPass =
        translateX.value < -SWIPE_THRESHOLD || event.velocityX < -VELOCITY_THRESHOLD;

      if (shouldLike) {
        translateX.value = withTiming(SCREEN_W * 1.5, { duration: 300 });
        translateY.value = withTiming(0, { duration: 300 });
        runOnJS(onLike)();
      } else if (shouldPass) {
        translateX.value = withTiming(-SCREEN_W * 1.5, { duration: 300 });
        translateY.value = withTiming(0, { duration: 300 });
        runOnJS(onPass)();
      } else {
        translateX.value = withSpring(0, { damping: 15, stiffness: 120 });
        translateY.value = withSpring(0, { damping: 15, stiffness: 120 });
      }
    },
  });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_W / 2, 0, SCREEN_W / 2],
      [-12, 0, 12],
      Extrapolate.CLAMP,
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  // Pass swipe progress to card for overlay rendering
  const swipeProgress = useSharedValue(0);
  const progressStyle = useAnimatedStyle(() => {
    swipeProgress.value = translateX.value / (SCREEN_W / 2);
    return {};
  });

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.swipeableCard, cardStyle]}>
        <Animated.View style={progressStyle} />
        <CandidateCard
          candidate={candidate}
          stackIndex={0}
          swipeProgress={translateX.value / (SCREEN_W / 2)}
        />
      </Animated.View>
    </PanGestureHandler>
  );
}

// ─── Action buttons ───────────────────────────────────────────────────────────

function ActionButton({
  label,
  color,
  bg,
  onPress,
}: {
  label: string;
  color: string;
  bg: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionBtn,
        { backgroundColor: bg },
        pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.actionBtnText, { color }]}>{label}</Text>
    </Pressable>
  );
}

// ─── Match modal ──────────────────────────────────────────────────────────────

function MatchModal({
  candidate,
  onClose,
  onMessage,
}: {
  candidate: Candidate;
  onClose: () => void;
  onMessage: () => void;
}) {
  return (
    <View style={modalStyles.backdrop}>
      <View style={modalStyles.card}>
        <Text style={modalStyles.emoji}>🎉</Text>
        <Text style={modalStyles.title}>It's a Match!</Text>
        <Text style={modalStyles.subtitle}>
          You and {candidate.name} liked each other.
        </Text>
        <Pressable style={modalStyles.primaryBtn} onPress={onMessage}>
          <Text style={modalStyles.primaryBtnText}>Send a message</Text>
        </Pressable>
        <Pressable style={modalStyles.secondaryBtn} onPress={onClose}>
          <Text style={modalStyles.secondaryBtnText}>Keep swiping</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🔍</Text>
      <Text style={styles.emptyTitle}>You've seen everyone nearby</Text>
      <Text style={styles.emptySub}>New members join every day. Check back soon.</Text>
      <Pressable style={styles.refreshBtn} onPress={onRefresh}>
        <Text style={styles.refreshBtnText}>Refresh</Text>
      </Pressable>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: '#9ca3af', marginTop: 2 },

  stack: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  swipeableCard: {
    position: 'absolute',
    zIndex: 10,
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 24,
    paddingHorizontal: 24,
    gap: 16,
  },
  actionBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnText: { fontSize: 26, fontWeight: '700' },

  profilePeek: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  profilePeekText: { fontSize: 13, color: '#7c3aed', fontWeight: '600' },

  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyIcon: { fontSize: 52, marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center' },
  emptySub: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  refreshBtn: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 28,
    backgroundColor: '#7c3aed',
    borderRadius: 12,
  },
  refreshBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    width: '85%',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
  },
  emoji: { fontSize: 52 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  primaryBtn: {
    marginTop: 12,
    width: '100%',
    backgroundColor: '#7c3aed',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryBtn: { width: '100%', paddingVertical: 12, alignItems: 'center' },
  secondaryBtnText: { color: '#6b7280', fontSize: 14 },
});
