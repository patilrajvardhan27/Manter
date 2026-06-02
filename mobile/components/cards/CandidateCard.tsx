import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
export const CARD_W = SCREEN_W - 32;
export const CARD_H = SCREEN_H * 0.68;

export interface Candidate {
  id: string;
  name: string;
  age: number;
  bio?: string;
  photos: string[];
  city?: string;
  isVerified: boolean;
  idVerified: boolean;
  compatibilityScore: number;
  communityScore: number;
  ratingCount: number;
  topQualities: { key: string; label: string; score: number }[];
}

interface Props {
  candidate: Candidate;
  /** 0 = front card, 1 = second, 2 = third */
  stackIndex: number;
  /** -1 to 1 — used by the front card during drag to show like/pass overlay */
  swipeProgress?: number;
}

export function CandidateCard({ candidate, stackIndex, swipeProgress = 0 }: Props) {
  const scale = 1 - stackIndex * 0.04;
  const translateY = stackIndex * 10;
  const photo = candidate.photos[0];

  const likeOpacity = Math.max(0, Math.min(1, swipeProgress * 3));
  const passOpacity = Math.max(0, Math.min(1, -swipeProgress * 3));

  return (
    <View
      style={[
        styles.card,
        { transform: [{ scale }, { translateY }], zIndex: 10 - stackIndex },
      ]}
    >
      {/* Photo background */}
      {photo ? (
        <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
      ) : (
        <View style={styles.photoFallback}>
          <Text style={styles.photoFallbackLetter}>{candidate.name[0]?.toUpperCase()}</Text>
        </View>
      )}

      {/* Gradient overlay — fades photo into info section */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.75)', 'rgba(0,0,0,0.92)']}
        locations={[0, 0.35, 0.7, 1]}
        style={styles.gradient}
      />

      {/* Like overlay */}
      {likeOpacity > 0 && (
        <View style={[styles.swipeOverlay, { opacity: likeOpacity }]}>
          <View style={styles.likeOverlay}>
            <Text style={styles.overlayText}>LIKE</Text>
          </View>
        </View>
      )}

      {/* Pass overlay */}
      {passOpacity > 0 && (
        <View style={[styles.swipeOverlay, { opacity: passOpacity }]}>
          <View style={styles.passOverlay}>
            <Text style={styles.overlayText}>PASS</Text>
          </View>
        </View>
      )}

      {/* Score badge top-right */}
      <View style={styles.scoreBadge}>
        <Text style={styles.scoreBadgeText}>{Math.round(candidate.compatibilityScore)}</Text>
        <Text style={styles.scoreBadgeLabel}>match</Text>
      </View>

      {/* Verification badges top-left */}
      <View style={styles.badgeRow}>
        {candidate.idVerified && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>✓ ID</Text>
          </View>
        )}
        {candidate.isVerified && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>✓ Verified</Text>
          </View>
        )}
      </View>

      {/* Bottom info */}
      <View style={styles.info}>
        <Text style={styles.name}>
          {candidate.name}, {candidate.age}
        </Text>
        {candidate.city ? (
          <Text style={styles.city}>📍 {candidate.city}</Text>
        ) : null}
        {candidate.bio ? (
          <Text style={styles.bio} numberOfLines={2}>{candidate.bio}</Text>
        ) : null}

        {/* Top qualities pills */}
        {candidate.topQualities.length > 0 && (
          <View style={styles.qualityPills}>
            {candidate.topQualities.map((q) => (
              <View key={q.key} style={styles.pill}>
                <Text style={styles.pillText}>{q.label}</Text>
                <Text style={styles.pillScore}>{q.score}</Text>
              </View>
            ))}
            {candidate.ratingCount > 0 && (
              <View style={[styles.pill, styles.pillRating]}>
                <Text style={styles.pillText}>
                  {candidate.ratingCount} rating{candidate.ratingCount !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: CARD_W,
    height: CARD_H,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1f2937',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },

  photo: { position: 'absolute', width: '100%', height: '100%' },
  photoFallback: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#4c1d95',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoFallbackLetter: { fontSize: 96, fontWeight: '800', color: 'rgba(255,255,255,0.4)' },

  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '65%',
  },

  swipeOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeOverlay: {
    borderWidth: 4,
    borderColor: '#10b981',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    transform: [{ rotate: '-20deg' }],
  },
  passOverlay: {
    borderWidth: 4,
    borderColor: '#ef4444',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    transform: [{ rotate: '20deg' }],
  },
  overlayText: {
    fontSize: 40,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 4,
  },

  scoreBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  scoreBadgeText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  scoreBadgeLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: -1 },

  badgeRow: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    backgroundColor: 'rgba(124,58,237,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  info: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 24,
    gap: 4,
  },
  name: { fontSize: 26, fontWeight: '800', color: '#fff' },
  city: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  bio: { fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 19, marginTop: 2 },

  qualityPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillRating: { backgroundColor: 'rgba(124,58,237,0.55)' },
  pillText: { fontSize: 11, color: '#fff', fontWeight: '500' },
  pillScore: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '700' },
});
