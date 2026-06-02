import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Pressable,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../../components/ui/Button';
import { QUALITIES, QUALITY_CATEGORIES } from '../../../constants/qualities';
import { QualityKey, QualityScores } from '../../../../shared/types';
import { api } from '../../../lib/api';

type Weights = Record<QualityKey, number>;

const DEFAULT_WEIGHTS = Object.fromEntries(
  QUALITIES.map((q) => [q.key, 3]),
) as Weights;

const PRIORITY_LABELS = ['', 'Low', 'Somewhat', 'Important', 'Very', 'Must-Have'];
const PRIORITY_COLORS = ['', '#d1d5db', '#93c5fd', '#6ee7b7', '#fbbf24', '#f87171'];

// Group qualities by category for section list
const SECTIONS = Object.entries(QUALITY_CATEGORIES).map(([cat, title]) => ({
  category: cat,
  title,
  data: QUALITIES.filter((q) => q.category === cat),
}));

export default function WeightsScreen() {
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [loading, setLoading] = useState(false);

  function setWeight(key: QualityKey, value: number) {
    setWeights((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setLoading(true);
    try {
      await api.post('/users/me/weights', { qualityWeights: weights });
      router.replace('/(tabs)/discover');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error ?? 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const mustHaveCount = Object.values(weights).filter((v) => v === 5).length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Static header */}
        <View style={styles.header}>
          <Text style={styles.title}>What matters most to you?</Text>
          <Text style={styles.subtitle}>
            Set how important each quality is. Your rankings shape who you see first.
          </Text>
          <View style={styles.legend}>
            {[1, 2, 3, 4, 5].map((v) => (
              <View key={v} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: PRIORITY_COLORS[v] }]} />
                <Text style={styles.legendText}>{PRIORITY_LABELS[v]}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Scrollable list */}
        <SectionList
          sections={SECTIONS}
          keyExtractor={(item) => item.key}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <QualityRow
              label={item.label}
              description={item.description}
              value={weights[item.key]}
              onChange={(v) => setWeight(item.key, v)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        {/* Save footer */}
        <View style={styles.footer}>
          {mustHaveCount > 0 && (
            <Text style={styles.mustHaveCount}>
              {mustHaveCount} must-have{mustHaveCount !== 1 ? 's' : ''} selected
            </Text>
          )}
          <Button
            label={loading ? 'Saving...' : 'Save My Priorities'}
            onPress={handleSave}
            loading={loading}
          />
          <Pressable onPress={() => router.replace('/(tabs)/discover')}>
            <Text style={styles.skipText}>Skip for now — use defaults</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function QualityRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={rowStyles.container}>
      <View style={rowStyles.text}>
        <Text style={rowStyles.label}>{label}</Text>
        <Text style={rowStyles.description} numberOfLines={2}>
          {description}
        </Text>
      </View>
      <View style={rowStyles.dots}>
        {[1, 2, 3, 4, 5].map((v) => (
          <Pressable
            key={v}
            onPress={() => onChange(v)}
            hitSlop={6}
            style={[
              rowStyles.dot,
              { backgroundColor: v <= value ? PRIORITY_COLORS[value] : '#e5e7eb' },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  text: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: '#111827' },
  description: { fontSize: 12, color: '#6b7280', marginTop: 2, lineHeight: 17 },
  dots: { flexDirection: 'row', gap: 5 },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1 },

  header: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 6, lineHeight: 20 },

  legend: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: '#6b7280' },

  listContent: { paddingHorizontal: 24, paddingBottom: 16 },

  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 4,
  },
  separator: {
    height: 1,
    backgroundColor: '#f3f4f6',
  },

  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  mustHaveCount: {
    textAlign: 'center',
    fontSize: 13,
    color: '#f87171',
    fontWeight: '600',
  },
  skipText: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 13,
    paddingVertical: 4,
  },
});
