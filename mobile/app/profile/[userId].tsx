import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScoreBreakdown } from '../../components/cards/ScoreBreakdown';
import { api } from '../../lib/api';
import { QualityScores } from '../../../shared/types';
import { useAuthStore } from '../../store/auth.store';

const { width } = Dimensions.get('window');

interface PublicProfile {
  id: string;
  name: string;
  age: number;
  bio?: string;
  photos: string[];
  city?: string;
  isVerified: boolean;
  idVerified: boolean;
  role: 'WOMAN' | 'MAN';
  manProfile?: {
    communityScore: number;
    ratingCount: number;
    qualityScores: QualityScores;
  };
}

export default function ProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user: me } = useAuthStore();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showFullScore, setShowFullScore] = useState(false);

  useEffect(() => {
    api.get(`/users/${userId}`)
      .then((res) => setProfile(res.data))
      .catch(() => Alert.alert('Error', 'Could not load this profile.'))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#7c3aed" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Profile not found</Text>
      </View>
    );
  }

  const isMan = profile.role === 'MAN';
  const mp = profile.manProfile;

  function handleReport() {
    Alert.alert('Report', `Report ${profile!.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Report',
        style: 'destructive',
        onPress: () => {
          api.post('/safety/report', {
            reportedId: profile!.id,
            reason: 'OTHER',
          }).catch(() => null);
          Alert.alert('Reported', 'Thank you. Our team will review this.');
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} bounces>
        {/* Photo carousel */}
        {profile.photos.length > 0 ? (
          <View style={styles.photoWrap}>
            <Image
              source={{ uri: profile.photos[photoIndex] }}
              style={styles.photo}
              resizeMode="cover"
            />
            {profile.photos.length > 1 && (
              <View style={styles.dotRow}>
                {profile.photos.map((_, i) => (
                  <Pressable key={i} onPress={() => setPhotoIndex(i)}>
                    <View style={[styles.dot, i === photoIndex && styles.dotActive]} />
                  </Pressable>
                ))}
              </View>
            )}
            <Pressable style={styles.closeBtn} onPress={() => router.back()}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderText}>{profile.name[0]?.toUpperCase()}</Text>
            <Pressable style={styles.closeBtn} onPress={() => router.back()}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.body}>
          {/* Name + badges */}
          <View style={styles.nameRow}>
            <View style={styles.nameBlock}>
              <Text style={styles.name}>{profile.name}, {profile.age}</Text>
              {profile.city ? <Text style={styles.city}>{profile.city}</Text> : null}
            </View>
            <View style={styles.badges}>
              {profile.idVerified && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>✓ ID</Text>
                </View>
              )}
              {profile.isVerified && (
                <View style={[styles.badge, styles.verifiedBadge]}>
                  <Text style={styles.badgeText}>✓ Verified</Text>
                </View>
              )}
            </View>
          </View>

          {/* Bio */}
          {profile.bio ? (
            <Text style={styles.bio}>{profile.bio}</Text>
          ) : null}

          {/* Score section (men only) */}
          {isMan && mp && (
            <View style={styles.scoreSection}>
              <View style={styles.scoreSectionHeader}>
                <Text style={styles.sectionTitle}>Character Score</Text>
                <Pressable onPress={() => setShowFullScore((v) => !v)}>
                  <Text style={styles.toggleLink}>
                    {showFullScore ? 'Show less' : 'See all 23 qualities'}
                  </Text>
                </Pressable>
              </View>
              <ScoreBreakdown
                scores={mp.qualityScores}
                communityScore={mp.communityScore}
                ratingCount={mp.ratingCount}
                compact={!showFullScore}
              />
            </View>
          )}

          {/* Rate button (women can rate men they've dated) */}
          {me?.role === 'WOMAN' && isMan && (
            <Pressable
              style={styles.rateBtn}
              onPress={() => router.push({ pathname: '/rate/[userId]', params: { userId: profile.id } })}
            >
              <Text style={styles.rateBtnText}>Rate {profile.name}</Text>
              <Text style={styles.rateBtnSub}>Share your experience to help other women</Text>
            </Pressable>
          )}

          {/* Report */}
          <Pressable style={styles.reportBtn} onPress={handleReport}>
            <Text style={styles.reportBtnText}>Report this profile</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFound: { fontSize: 16, color: '#6b7280' },

  photoWrap: { position: 'relative' },
  photo: { width, height: width * 1.15 },
  photoPlaceholder: {
    width,
    height: width * 0.7,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: { fontSize: 72, fontWeight: '800', color: '#7c3aed' },

  dotRow: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#fff', width: 20 },

  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  body: { padding: 24, gap: 20 },

  nameRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  nameBlock: { flex: 1 },
  name: { fontSize: 26, fontWeight: '800', color: '#111827' },
  city: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  badges: { flexDirection: 'row', gap: 6, marginTop: 4 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#ede9fe',
  },
  verifiedBadge: { backgroundColor: '#d1fae5' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#4c1d95' },

  bio: { fontSize: 15, color: '#374151', lineHeight: 23 },

  scoreSection: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 18,
    gap: 14,
  },
  scoreSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  toggleLink: { fontSize: 13, color: '#7c3aed', fontWeight: '500' },

  rateBtn: {
    borderRadius: 14,
    padding: 18,
    backgroundColor: '#faf5ff',
    borderWidth: 1.5,
    borderColor: '#ede9fe',
    gap: 4,
  },
  rateBtnText: { fontSize: 15, fontWeight: '700', color: '#7c3aed' },
  rateBtnSub: { fontSize: 12, color: '#8b5cf6' },

  reportBtn: { paddingVertical: 8, alignItems: 'center' },
  reportBtnText: { fontSize: 13, color: '#9ca3af' },
});
