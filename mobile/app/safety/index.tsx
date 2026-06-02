import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { useBiometricLock } from '../../hooks/useBiometricLock';

interface ActiveCheckin {
  id: string;
  scheduledAt: string;
  confirmedAt: string | null;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  relation: string;
}

export default function SafetyHubScreen() {
  const { isEnabled, isSupported, toggleEnabled } = useBiometricLock();
  const [checkin, setCheckin] = useState<ActiveCheckin | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    api.get('/safety/checkin/active').then((r) => setCheckin(r.data)).catch(() => null);
    api.get('/safety/contacts').then((r) => setContacts(r.data)).catch(() => null);
  }, []);

  const msUntilAlert = checkin
    ? Math.max(0, new Date(checkin.scheduledAt).getTime() - Date.now())
    : 0;
  const hoursLeft = Math.floor(msUntilAlert / (1000 * 60 * 60));
  const minutesLeft = Math.floor((msUntilAlert % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <Text style={styles.title}>Safety Hub</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Active check-in banner */}
        {checkin && (
          <Pressable
            style={styles.activeBanner}
            onPress={() => router.push('/safety/checkin')}
          >
            <Text style={styles.activeBannerIcon}>⏱</Text>
            <View style={styles.activeBannerText}>
              <Text style={styles.activeBannerTitle}>Check-in active</Text>
              <Text style={styles.activeBannerSub}>
                Alert fires in {hoursLeft > 0 ? `${hoursLeft}h ` : ''}{minutesLeft}m — tap to confirm you're safe
              </Text>
            </View>
            <Text style={styles.activeBannerArrow}>→</Text>
          </Pressable>
        )}

        {/* Feature cards */}
        <View style={styles.cards}>
          {/* Date check-in */}
          <FeatureCard
            icon="📍"
            title="Date Check-in"
            description={
              checkin
                ? `Active — ${hoursLeft}h ${minutesLeft}m remaining`
                : contacts.length === 0
                ? 'Add an emergency contact first'
                : 'Set a timer. If you don\'t confirm, your contacts are alerted.'
            }
            actionLabel={checkin ? 'View check-in' : 'Set check-in'}
            disabled={contacts.length === 0 && !checkin}
            accent="#7c3aed"
            onPress={() => router.push('/safety/checkin')}
          />

          {/* Emergency contacts */}
          <FeatureCard
            icon="📞"
            title="Emergency Contacts"
            description={
              contacts.length === 0
                ? 'Add up to 3 contacts who will be alerted if you miss a check-in.'
                : `${contacts.length} contact${contacts.length !== 1 ? 's' : ''} saved: ${contacts.map((c) => c.name).join(', ')}`
            }
            actionLabel={contacts.length === 0 ? 'Add contacts' : 'Manage contacts'}
            accent="#10b981"
            onPress={() => router.push('/safety/contacts')}
          />

          {/* Biometric lock */}
          <View style={[styles.featureCard, { borderColor: '#fde68a' }]}>
            <View style={styles.featureCardLeft}>
              <Text style={styles.featureIcon}>🔒</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Biometric App Lock</Text>
                <Text style={styles.featureSub}>
                  {isSupported
                    ? isEnabled
                      ? 'App locks when you leave and requires Face ID / fingerprint to reopen.'
                      : 'Lock the app with Face ID or fingerprint.'
                    : 'Face ID / fingerprint not set up on this device.'}
                </Text>
              </View>
            </View>
            <Switch
              value={isEnabled}
              onValueChange={toggleEnabled}
              disabled={!isSupported}
              trackColor={{ false: '#e5e7eb', true: '#a78bfa' }}
              thumbColor={isEnabled ? '#7c3aed' : '#f3f4f6'}
            />
          </View>

          {/* Screenshot info */}
          <View style={[styles.featureCard, { borderColor: '#bfdbfe' }]}>
            <View style={styles.featureCardLeft}>
              <Text style={styles.featureIcon}>🖼</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Chat Screenshot Prevention</Text>
                <Text style={styles.featureSub}>
                  Chat screens block screenshots on iOS and Android to protect your conversations.
                </Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: '#dbeafe' }]}>
              <Text style={[styles.statusBadgeText, { color: '#1d4ed8' }]}>On</Text>
            </View>
          </View>
        </View>

        {/* Safety tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Quick safety tips</Text>
          {[
            'Tell a friend where you\'re going before a first date.',
            'Meet in public places for the first few dates.',
            'Drive yourself or use a rideshare — don\'t accept rides from dates.',
            'Trust your instincts. If something feels off, leave.',
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={styles.tipDot}>•</Text>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureCard({
  icon, title, description, actionLabel, accent, disabled, onPress,
}: {
  icon: string;
  title: string;
  description: string;
  actionLabel: string;
  accent: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <View style={[styles.featureCard, { borderColor: accent + '40' }]}>
      <View style={styles.featureCardLeft}>
        <Text style={styles.featureIcon}>{icon}</Text>
        <View style={styles.featureText}>
          <Text style={styles.featureTitle}>{title}</Text>
          <Text style={styles.featureSub}>{description}</Text>
        </View>
      </View>
      <Pressable
        style={({ pressed }) => [
          styles.featureBtn,
          { backgroundColor: accent },
          disabled && { opacity: 0.4 },
          pressed && { opacity: 0.8 },
        ]}
        onPress={onPress}
        disabled={disabled}
      >
        <Text style={styles.featureBtnText}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backText: { color: '#7c3aed', fontSize: 22, fontWeight: '600', width: 32 },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#111827' },

  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    margin: 16,
    padding: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
  },
  activeBannerIcon: { fontSize: 24 },
  activeBannerText: { flex: 1 },
  activeBannerTitle: { fontSize: 14, fontWeight: '700', color: '#1d4ed8' },
  activeBannerSub: { fontSize: 12, color: '#3b82f6', marginTop: 2, lineHeight: 17 },
  activeBannerArrow: { fontSize: 18, color: '#3b82f6' },

  cards: { padding: 16, gap: 12 },

  featureCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
  },
  featureCardLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
  featureIcon: { fontSize: 26, marginTop: 2 },
  featureText: { flex: 1 },
  featureTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  featureSub: { fontSize: 12, color: '#6b7280', marginTop: 4, lineHeight: 18 },
  featureBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  featureBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  statusBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },

  tipsCard: {
    margin: 16,
    marginTop: 4,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    gap: 8,
  },
  tipsTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 4 },
  tipRow: { flexDirection: 'row', gap: 8 },
  tipDot: { color: '#9ca3af', fontSize: 14, marginTop: 1 },
  tipText: { flex: 1, fontSize: 13, color: '#4b5563', lineHeight: 19 },
});
