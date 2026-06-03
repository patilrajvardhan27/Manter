import { View, Text, StyleSheet, Pressable, Alert, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../store/auth.store';
import { ScoreBreakdown } from '../../../components/cards/ScoreBreakdown';

export default function MyProfileScreen() {
  const { user, logout } = useAuthStore();

  async function handleLogout() {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  }

  if (!user) return null;

  const mp = (user as any).manProfile;
  const wp = (user as any).womanProfile;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header bar */}
        <View style={styles.topBar}>
          <Text style={styles.screenTitle}>My Profile</Text>
          <Pressable onPress={() => router.push('/(tabs)/profile/edit')} style={styles.editBtn}>
            <Text style={styles.editBtnText}>Edit</Text>
          </Pressable>
        </View>

        {/* Avatar + info */}
        <View style={styles.hero}>
          {user.photos?.[0] ? (
            <Image source={{ uri: user.photos[0] }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarLetter}>{user.name[0]?.toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.name}>{user.name}, {user.age}</Text>
          {user.city ? <Text style={styles.city}>{user.city}</Text> : null}
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {user.role === 'WOMAN' ? '♀ Woman' : '♂ Man'}
            </Text>
          </View>
        </View>

        {/* Bio */}
        {user.bio ? (
          <View style={styles.bioSection}>
            <Text style={styles.bio}>{user.bio}</Text>
          </View>
        ) : (
          <Pressable style={styles.bioEmpty} onPress={() => router.push('/(tabs)/profile/edit')}>
            <Text style={styles.bioEmptyText}>+ Add a bio</Text>
          </Pressable>
        )}

        {/* Man: score breakdown */}
        {user.role === 'MAN' && mp && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Character Score</Text>
            <Text style={styles.sectionSub}>
              This is how you appear to women on Manter.
            </Text>
            <View style={styles.scoreCard}>
              <ScoreBreakdown
                scores={mp.qualityScores}
                communityScore={
                  mp.ratingCount > 0
                    ? mp.communityScore
                    : Object.values(mp.qualityScores as Record<string, number>).reduce((a, b) => a + b, 0) /
                      Object.values(mp.qualityScores as Record<string, number>).length
                }
                ratingCount={mp.ratingCount}
              />
            </View>
          </View>
        )}

        {/* Man: quiz nudge if no profile yet */}
        {user.role === 'MAN' && !mp && (
          <Pressable
            style={styles.quizNudge}
            onPress={() => router.push('/(auth)/onboarding/quiz')}
          >
            <Text style={styles.quizNudgeTitle}>Complete your character quiz</Text>
            <Text style={styles.quizNudgeSub}>
              6 scenario questions that show women who you really are.
            </Text>
          </Pressable>
        )}

        {/* Woman: weights nudge if no profile yet */}
        {user.role === 'WOMAN' && !wp && (
          <Pressable
            style={styles.quizNudge}
            onPress={() => router.push('/(auth)/onboarding/weights')}
          >
            <Text style={styles.quizNudgeTitle}>Set your priorities</Text>
            <Text style={styles.quizNudgeSub}>
              Tell us what matters most to you in a partner.
            </Text>
          </Pressable>
        )}

        {/* Safety hub shortcut */}
        <Pressable style={styles.safetyBtn} onPress={() => router.push('/safety')}>
          <Text style={styles.safetyIcon}>🛡</Text>
          <View>
            <Text style={styles.safetyTitle}>Safety Hub</Text>
            <Text style={styles.safetySub}>Date check-in · Emergency contacts</Text>
          </View>
        </Pressable>

        {/* Log out */}
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  screenTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  editBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
  },
  editBtnText: { fontSize: 14, fontWeight: '600', color: '#374151' },

  hero: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: { fontSize: 40, fontWeight: '800', color: '#7c3aed' },
  name: { fontSize: 22, fontWeight: '800', color: '#111827' },
  city: { fontSize: 14, color: '#6b7280' },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#ede9fe',
  },
  roleBadgeText: { fontSize: 12, fontWeight: '600', color: '#7c3aed' },

  bioSection: { paddingHorizontal: 24, marginBottom: 8 },
  bio: { fontSize: 15, color: '#374151', lineHeight: 22, textAlign: 'center' },
  bioEmpty: { alignItems: 'center', paddingVertical: 8 },
  bioEmptyText: { fontSize: 14, color: '#7c3aed', fontWeight: '500' },

  section: { paddingHorizontal: 24, paddingTop: 16, gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  sectionSub: { fontSize: 13, color: '#6b7280' },
  scoreCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 18,
    marginTop: 4,
  },

  quizNudge: {
    margin: 24,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#faf5ff',
    borderWidth: 1.5,
    borderColor: '#ede9fe',
    gap: 6,
  },
  quizNudgeTitle: { fontSize: 15, fontWeight: '700', color: '#7c3aed' },
  quizNudgeSub: { fontSize: 13, color: '#6b7280', lineHeight: 19 },

  safetyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 24,
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  safetyIcon: { fontSize: 22 },
  safetyTitle: { fontSize: 14, fontWeight: '700', color: '#166534' },
  safetySub: { fontSize: 12, color: '#4ade80' },

  logoutBtn: {
    margin: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#fee2e2',
    alignItems: 'center',
    marginTop: 20,
  },
  logoutText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
});
