import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  LayoutAnimation,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { FormInput } from '../../components/ui/FormInput';
import { QUALITIES, QUALITY_CATEGORIES } from '../../constants/qualities';
import { QualityKey } from '../../../shared/types';
import { api } from '../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type UiScores = Record<QualityKey, number>; // 1–5

const QUALITY_KEYS = QUALITIES.map((q) => q.key);

const DEFAULT_SCORES = Object.fromEntries(
  QUALITY_KEYS.map((k) => [k, 3]),
) as UiScores;

// Build ordered steps: one per category + final review step
const CATEGORY_STEPS = Object.entries(QUALITY_CATEGORIES).map(([cat, title]) => ({
  cat,
  title,
  qualities: QUALITIES.filter((q) => q.category === cat),
}));

const TOTAL_STEPS = CATEGORY_STEPS.length + 1; // categories + review

// ─── Score labels ──────────────────────────────────────────────────────────────

const SCORE_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Below avg',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
};

const SCORE_COLORS: Record<number, string> = {
  1: '#ef4444',
  2: '#f97316',
  3: '#f59e0b',
  4: '#10b981',
  5: '#7c3aed',
};

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function RateUserScreen() {
  const { userId, name } = useLocalSearchParams<{ userId: string; name: string }>();

  const [step, setStep] = useState(0); // 0..TOTAL_STEPS-1
  const [scores, setScores] = useState<UiScores>(DEFAULT_SCORES);
  const [reviewText, setReviewText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isReviewStep = step === TOTAL_STEPS - 1;
  const currentStep = CATEGORY_STEPS[step];

  function setScore(key: QualityKey, value: number) {
    setScores((prev) => ({ ...prev, [key]: value }));
  }

  function goNext() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }

  function goPrev() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await api.post(`/ratings/${userId}`, {
        qualityScores: scores,
        reviewText: reviewText.trim() || undefined,
        isAnonymous,
      });
      Alert.alert(
        'Thank you',
        `Your rating of ${name ?? 'this man'} has been submitted. It helps other women make better decisions.`,
        [{ text: 'Done', onPress: () => router.back() }],
      );
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error ?? 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => (step === 0 ? router.back() : goPrev())} hitSlop={8}>
          <Text style={styles.backText}>{step === 0 ? '✕' : '←'}</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Rate {name}</Text>
          <Text style={styles.headerSub}>
            Step {step + 1} of {TOTAL_STEPS}
          </Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((step + 1) / TOTAL_STEPS) * 100}%` }]} />
      </View>

      {isReviewStep ? (
        <ReviewStep
          reviewText={reviewText}
          setReviewText={setReviewText}
          isAnonymous={isAnonymous}
          setIsAnonymous={setIsAnonymous}
          scores={scores}
          submitting={submitting}
          onSubmit={handleSubmit}
          onBack={goPrev}
        />
      ) : (
        <CategoryStep
          title={currentStep.title}
          qualities={currentStep.qualities}
          scores={scores}
          setScore={setScore}
          onNext={goNext}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Category step ────────────────────────────────────────────────────────────

function CategoryStep({
  title,
  qualities,
  scores,
  setScore,
  onNext,
}: {
  title: string;
  qualities: typeof QUALITIES;
  scores: UiScores;
  setScore: (key: QualityKey, value: number) => void;
  onNext: () => void;
}) {
  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.categoryTitle}>{title}</Text>
        <Text style={styles.categoryHint}>
          Rate each quality based on your real experience with him.
        </Text>

        <View style={styles.qualityList}>
          {qualities.map((q) => (
            <QualityRow
              key={q.key}
              label={q.label}
              description={q.description}
              value={scores[q.key]}
              onChange={(v) => setScore(q.key, v)}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Next →" onPress={onNext} />
      </View>
    </View>
  );
}

// ─── Individual quality row ───────────────────────────────────────────────────

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
      <View style={rowStyles.textWrap}>
        <Text style={rowStyles.label}>{label}</Text>
        <Text style={rowStyles.desc} numberOfLines={2}>{description}</Text>
      </View>

      <View style={rowStyles.dots}>
        {[1, 2, 3, 4, 5].map((v) => (
          <Pressable key={v} onPress={() => onChange(v)} hitSlop={4}>
            <View
              style={[
                rowStyles.dot,
                {
                  backgroundColor: v <= value ? SCORE_COLORS[value] : '#e5e7eb',
                  transform: [{ scale: v === value ? 1.2 : 1 }],
                },
              ]}
            />
          </Pressable>
        ))}
      </View>

      <Text style={[rowStyles.scoreLabel, { color: SCORE_COLORS[value] }]}>
        {SCORE_LABELS[value]}
      </Text>
    </View>
  );
}

// ─── Review step ──────────────────────────────────────────────────────────────

function ReviewStep({
  reviewText,
  setReviewText,
  isAnonymous,
  setIsAnonymous,
  scores,
  submitting,
  onSubmit,
  onBack,
}: {
  reviewText: string;
  setReviewText: (t: string) => void;
  isAnonymous: boolean;
  setIsAnonymous: (v: boolean) => void;
  scores: UiScores;
  submitting: boolean;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length;
  const avgLabel = avgScore >= 4.5 ? 'Excellent' : avgScore >= 3.5 ? 'Good' : avgScore >= 2.5 ? 'Average' : avgScore >= 1.5 ? 'Below avg' : 'Poor';
  const avgColor = SCORE_COLORS[Math.round(avgScore)] ?? '#9ca3af';

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Summary card */}
      <View style={reviewStyles.summaryCard}>
        <Text style={reviewStyles.summaryTitle}>Your overall rating</Text>
        <View style={reviewStyles.summaryScore}>
          <Text style={[reviewStyles.scoreNum, { color: avgColor }]}>
            {avgScore.toFixed(1)}
          </Text>
          <Text style={[reviewStyles.scoreLabel, { color: avgColor }]}>{avgLabel}</Text>
        </View>
        <Text style={reviewStyles.summaryHint}>
          Average across all 23 qualities
        </Text>
      </View>

      {/* Top qualities */}
      <View style={reviewStyles.topSection}>
        <Text style={reviewStyles.topTitle}>Highest-rated qualities</Text>
        {QUALITIES.map((q) => ({ ...q, score: scores[q.key] }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map((q) => (
            <View key={q.key} style={reviewStyles.topRow}>
              <View style={[reviewStyles.topDot, { backgroundColor: SCORE_COLORS[q.score] }]} />
              <Text style={reviewStyles.topLabel}>{q.label}</Text>
              <Text style={[reviewStyles.topScore, { color: SCORE_COLORS[q.score] }]}>
                {SCORE_LABELS[q.score]}
              </Text>
            </View>
          ))}
      </View>

      {/* Review text */}
      <View style={reviewStyles.section}>
        <Text style={reviewStyles.sectionTitle}>Write a review (optional)</Text>
        <Text style={reviewStyles.sectionHint}>
          Help other women by sharing what stood out — good or bad.
        </Text>
        <FormInput
          label=""
          value={reviewText}
          onChangeText={setReviewText}
          multiline
          numberOfLines={4}
          placeholder="Describe your experience with him..."
          style={reviewStyles.textArea}
          maxLength={500}
        />
        <Text style={reviewStyles.charCount}>{reviewText.length}/500</Text>
      </View>

      {/* Anonymous toggle */}
      <Pressable style={reviewStyles.anonRow} onPress={() => setIsAnonymous(!isAnonymous)}>
        <View style={[reviewStyles.checkbox, isAnonymous && reviewStyles.checkboxOn]}>
          {isAnonymous && <Text style={reviewStyles.checkmark}>✓</Text>}
        </View>
        <View style={reviewStyles.anonText}>
          <Text style={reviewStyles.anonLabel}>Submit anonymously</Text>
          <Text style={reviewStyles.anonHint}>
            He won't see your name. Only aggregate scores are shown publicly.
          </Text>
        </View>
      </Pressable>

      {/* Actions */}
      <View style={reviewStyles.actions}>
        <Button label={submitting ? 'Submitting...' : 'Submit Rating'} onPress={onSubmit} loading={submitting} />
        <Pressable onPress={onBack} style={reviewStyles.backLink}>
          <Text style={reviewStyles.backLinkText}>← Review my scores</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backText: { fontSize: 20, color: '#7c3aed', width: 32 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 12, color: '#6b7280', marginTop: 1 },

  progressTrack: {
    height: 3,
    backgroundColor: '#f3f4f6',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7c3aed',
  },

  scrollContent: { padding: 24, paddingBottom: 40 },

  categoryTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 6 },
  categoryHint: { fontSize: 13, color: '#6b7280', marginBottom: 24, lineHeight: 19 },

  qualityList: { gap: 20 },

  footer: { padding: 20, paddingBottom: 32, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
});

const rowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textWrap: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: '#111827' },
  desc: { fontSize: 11, color: '#9ca3af', lineHeight: 16, marginTop: 2 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '700',
    width: 58,
    textAlign: 'right',
  },
});

const reviewStyles = StyleSheet.create({
  summaryCard: {
    backgroundColor: '#faf5ff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ede9fe',
    marginBottom: 24,
    gap: 6,
  },
  summaryTitle: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  summaryScore: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  scoreNum: { fontSize: 48, fontWeight: '900' },
  scoreLabel: { fontSize: 18, fontWeight: '600' },
  summaryHint: { fontSize: 11, color: '#9ca3af' },

  topSection: { marginBottom: 24, gap: 8 },
  topTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 4 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  topLabel: { flex: 1, fontSize: 14, color: '#374151' },
  topScore: { fontSize: 12, fontWeight: '700' },

  section: { marginBottom: 20, gap: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  sectionHint: { fontSize: 12, color: '#6b7280', marginBottom: 8, lineHeight: 18 },
  textArea: { height: 100, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: '#9ca3af', textAlign: 'right' },

  anonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 28,
    padding: 14,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxOn: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '800' },
  anonText: { flex: 1 },
  anonLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  anonHint: { fontSize: 12, color: '#6b7280', marginTop: 2, lineHeight: 17 },

  actions: { gap: 10 },
  backLink: { alignItems: 'center', paddingVertical: 8 },
  backLinkText: { color: '#7c3aed', fontSize: 13, fontWeight: '500' },
});
