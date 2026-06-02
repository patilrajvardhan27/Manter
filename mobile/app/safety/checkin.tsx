import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../lib/api';

interface ActiveCheckin {
  id: string;
  scheduledAt: string;
  confirmedAt: string | null;
}

// Duration presets in minutes
const PRESETS = [
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '2 hours', minutes: 120 },
  { label: '3 hours', minutes: 180 },
];

export default function CheckinScreen() {
  const [checkin, setCheckin] = useState<ActiveCheckin | null | undefined>(undefined);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(60);
  const [countdown, setCountdown] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load active check-in
  useEffect(() => {
    api.get('/safety/checkin/active')
      .then((r) => setCheckin(r.data))
      .catch(() => setCheckin(null));
  }, []);

  // Live countdown when active
  useEffect(() => {
    if (!checkin) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    function tick() {
      const ms = new Date(checkin!.scheduledAt).getTime() - Date.now();
      if (ms <= 0) {
        setCountdown('00:00:00');
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      const s = Math.floor((ms % 60_000) / 1_000);
      setCountdown(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
      );
    }

    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [checkin]);

  const startCheckin = useCallback(async () => {
    if (!selectedPreset) return;
    setLoading(true);
    try {
      const scheduledAt = new Date(Date.now() + selectedPreset * 60_000).toISOString();
      const { data } = await api.post('/safety/checkin', { scheduledAt });
      setCheckin(data);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error ?? 'Could not start check-in.');
    } finally {
      setLoading(false);
    }
  }, [selectedPreset]);

  const confirmSafe = useCallback(async () => {
    if (!checkin) return;
    setConfirming(true);
    try {
      await api.post(`/safety/checkin/${checkin.id}/confirm`);
      Alert.alert('You\'re marked safe ✓', 'Your emergency contacts will not be alerted.', [
        { text: 'OK', onPress: () => { setCheckin(null); router.back(); } },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error ?? 'Could not confirm. Try again.');
    } finally {
      setConfirming(false);
    }
  }, [checkin]);

  const cancelCheckin = useCallback(() => {
    if (!checkin) return;
    Alert.alert(
      'Cancel check-in?',
      'Your emergency contacts won\'t be alerted, but the timer will be removed.',
      [
        { text: 'Keep timer', style: 'cancel' },
        {
          text: 'Cancel check-in',
          style: 'destructive',
          onPress: async () => {
            await api.delete(`/safety/checkin/${checkin.id}`).catch(() => null);
            setCheckin(null);
          },
        },
      ],
    );
  }, [checkin]);

  if (checkin === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#7c3aed" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Date Check-in</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {checkin ? (
          // ─── Active check-in view ─────────────────────────────────────────
          <View style={styles.activeView}>
            <View style={styles.clockCard}>
              <Text style={styles.clockLabel}>Alert fires in</Text>
              <Text style={styles.clockDisplay}>{countdown}</Text>
              <Text style={styles.clockSub}>
                {new Date(checkin.scheduledAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>

            <Text style={styles.activeHint}>
              If you don't confirm by then, your emergency contacts will receive an alert.
            </Text>

            <Pressable
              style={({ pressed }) => [styles.safeBtn, pressed && { opacity: 0.85 }]}
              onPress={confirmSafe}
              disabled={confirming}
            >
              {confirming ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.safeBtnIcon}>✓</Text>
                  <Text style={styles.safeBtnText}>I'm Safe</Text>
                </>
              )}
            </Pressable>

            <Pressable style={styles.cancelLink} onPress={cancelCheckin}>
              <Text style={styles.cancelLinkText}>Cancel check-in</Text>
            </Pressable>
          </View>
        ) : (
          // ─── Set new check-in view ────────────────────────────────────────
          <View style={styles.setupView}>
            <View style={styles.explainCard}>
              <Text style={styles.explainIcon}>📍</Text>
              <Text style={styles.explainTitle}>How it works</Text>
              <Text style={styles.explainText}>
                Set a timer before your date. If you don't tap "I'm Safe" in time,
                your emergency contacts automatically receive an alert.{'\n\n'}
                Works even if the app is closed — the alert is sent from our server.
              </Text>
            </View>

            <Text style={styles.presetLabel}>Alert me if I don't confirm within:</Text>
            <View style={styles.presets}>
              {PRESETS.map((p) => (
                <Pressable
                  key={p.minutes}
                  style={[
                    styles.preset,
                    selectedPreset === p.minutes && styles.presetSelected,
                  ]}
                  onPress={() => setSelectedPreset(p.minutes)}
                >
                  <Text
                    style={[
                      styles.presetText,
                      selectedPreset === p.minutes && styles.presetTextSelected,
                    ]}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.startBtn,
                !selectedPreset && { opacity: 0.4 },
                pressed && { opacity: 0.85 },
              ]}
              onPress={startCheckin}
              disabled={!selectedPreset || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.startBtnText}>Start Check-in Timer</Text>
              )}
            </Pressable>

            <Text style={styles.setupHint}>
              Make sure you have emergency contacts saved before starting.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backText: { color: '#7c3aed', fontSize: 22, fontWeight: '600', width: 32 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },

  body: { padding: 24, flexGrow: 1 },

  // Active state
  activeView: { alignItems: 'center', gap: 20 },
  clockCard: {
    width: '100%',
    backgroundColor: '#1a0a2e',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  clockLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '600', letterSpacing: 1 },
  clockDisplay: {
    fontSize: 54,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },
  clockSub: { fontSize: 14, color: 'rgba(255,255,255,0.4)' },
  activeHint: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 16,
  },
  safeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#10b981',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 40,
    width: '100%',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  safeBtnIcon: { fontSize: 24, color: '#fff' },
  safeBtnText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  cancelLink: { paddingVertical: 8 },
  cancelLinkText: { fontSize: 14, color: '#9ca3af' },

  // Setup state
  setupView: { gap: 20 },
  explainCard: {
    backgroundColor: '#faf5ff',
    borderRadius: 16,
    padding: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#ede9fe',
  },
  explainIcon: { fontSize: 28 },
  explainTitle: { fontSize: 16, fontWeight: '700', color: '#4c1d95' },
  explainText: { fontSize: 14, color: '#374151', lineHeight: 22 },

  presetLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  preset: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  presetSelected: { borderColor: '#7c3aed', backgroundColor: '#faf5ff' },
  presetText: { fontSize: 15, fontWeight: '600', color: '#6b7280' },
  presetTextSelected: { color: '#7c3aed' },

  startBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  setupHint: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 18,
  },
});
