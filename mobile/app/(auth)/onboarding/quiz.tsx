import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../../components/ui/Button';
import { QUIZ_QUESTIONS } from '../../../constants/quiz';
import { QUALITIES } from '../../../constants/qualities';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';
import { QualityScores } from '../../../../shared/types';

const MIN_CHARS = 60;

const CATEGORY_COLORS: Record<string, string> = {
  respect: '#7c3aed',
  emotional: '#2563eb',
  character: '#059669',
  practical: '#d97706',
  safety: '#dc2626',
};

const CATEGORY_LABELS: Record<string, string> = {
  respect: 'Respect',
  emotional: 'Emotional',
  character: 'Character',
  practical: 'Practical',
  safety: 'Safety',
};

export default function QuizScreen() {
  const { setQuizCompleted, restore, user } = useAuthStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<QualityScores | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (user?.role === 'MAN' && user?.quizCompleted) {
      router.replace('/(tabs)/discover');
    }
  }, [user?.quizCompleted]);

  const question = QUIZ_QUESTIONS[currentIndex];
  const totalQuestions = QUIZ_QUESTIONS.length;
  const isLast = currentIndex === totalQuestions - 1;
  const currentAnswer = answers[question.id] ?? '';
  const isSufficient = currentAnswer.trim().length >= MIN_CHARS;
  const progressPercent = ((currentIndex + (isSufficient ? 1 : 0)) / totalQuestions) * 100;

  function setAnswer(text: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: text }));
  }

  function goNext() {
    if (!isSufficient) {
      Alert.alert(
        'More detail needed',
        `Please write at least ${MIN_CHARS} characters — we evaluate depth of thought, not just what sounds right.`,
      );
      return;
    }
    if (isLast) {
      submitQuiz();
    } else {
      setCurrentIndex((i) => i + 1);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function goPrev() {
    setCurrentIndex((i) => Math.max(0, i - 1));
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  async function submitQuiz() {
    setLoading(true);
    try {
      const answerPayload = QUIZ_QUESTIONS.map((q) => ({
        questionId: q.id,
        scenario: q.scenario,
        question: q.question,
        answer: answers[q.id] ?? '',
      }));

      const { data } = await api.post('/quiz/submit', { answers: answerPayload });
      setResults(data.qualityScores);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error ?? 'Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.evaluating}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={styles.evaluatingTitle}>Evaluating your responses</Text>
          <Text style={styles.evaluatingSub}>
            We read every word carefully. This takes about 10 seconds.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  async function handleContinue() {
    try {
      await restore(); // fetches /users/me → store gets manProfile + quizCompleted:true → layout routes to discover
    } catch {
      setQuizCompleted();
      router.replace('/(tabs)/discover');
    }
  }

  if (results) {
    return <ResultsScreen scores={results} onContinue={handleContinue} />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.topRow}>
              {currentIndex > 0 && (
                <Pressable onPress={goPrev} style={styles.backBtn}>
                  <Text style={styles.backText}>← Back</Text>
                </Pressable>
              )}
              <Text style={styles.counter}>
                {currentIndex + 1} / {totalQuestions}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.quizLabel}>Character Assessment</Text>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.scenarioCard}>
              <Text style={styles.scenarioLabel}>SCENARIO</Text>
              <Text style={styles.scenarioText}>{question.scenario}</Text>
            </View>

            <Text style={styles.questionText}>{question.question}</Text>

            <View style={styles.noticeRow}>
              <Text style={styles.noticeIcon}>✍️</Text>
              <Text style={styles.noticeText}>
                Write your genuine response. There are no right answers — we evaluate
                honesty, self-awareness, and depth of thought.
              </Text>
            </View>

            <TextInput
              ref={inputRef}
              style={styles.textInput}
              multiline
              value={currentAnswer}
              onChangeText={setAnswer}
              placeholder={question.hint}
              placeholderTextColor="#9ca3af"
              textAlignVertical="top"
              autoFocus={currentIndex === 0}
            />

            <View style={styles.charRow}>
              <Text style={[
                styles.charCount,
                isSufficient ? styles.charCountOk : styles.charCountNeeded,
              ]}>
                {currentAnswer.trim().length} / {MIN_CHARS} min
              </Text>
              {!isSufficient && (
                <Text style={styles.charHint}>
                  {MIN_CHARS - currentAnswer.trim().length} more characters needed
                </Text>
              )}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              label={isLast ? 'Submit for evaluation' : 'Next Question →'}
              onPress={goNext}
              disabled={!isSufficient}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Results screen ───────────────────────────────────────────────────────────

function ResultsScreen({
  scores,
  onContinue,
}: {
  scores: QualityScores;
  onContinue: () => void;
}) {
  const overall = Math.round(
    Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length,
  );

  const byCategory = QUALITIES.reduce<Record<string, { label: string; score: number }[]>>(
    (acc, q) => {
      if (!acc[q.category]) acc[q.category] = [];
      acc[q.category].push({ label: q.label, score: scores[q.key] ?? 5 });
      return acc;
    },
    {},
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={result.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={result.hero}>
          <View style={result.overallRing}>
            <Text style={result.overallScore}>{overall}</Text>
            <Text style={result.overallLabel}>/ 10</Text>
          </View>
          <Text style={result.heroTitle}>Your Character Score</Text>
          <Text style={result.heroSub}>
            {overall >= 8
              ? 'Excellent — your responses show strong character and self-awareness.'
              : overall >= 6
              ? 'Good — your responses reflect genuine thought and honesty.'
              : 'Your profile is live. As women rate you from real dates, your scores become more accurate.'}
          </Text>
        </View>

        {/* Per-category breakdown */}
        {Object.entries(byCategory).map(([cat, items]) => {
          const catAvg = Math.round(items.reduce((a, b) => a + b.score, 0) / items.length);
          const color = CATEGORY_COLORS[cat] ?? '#7c3aed';
          return (
            <View key={cat} style={result.categoryBlock}>
              <View style={result.categoryHeader}>
                <View style={[result.categoryDot, { backgroundColor: color }]} />
                <Text style={result.categoryTitle}>{CATEGORY_LABELS[cat]}</Text>
                <Text style={[result.categoryAvg, { color }]}>{catAvg}/10</Text>
              </View>
              {items.map((item) => (
                <View key={item.label} style={result.row}>
                  <Text style={result.rowLabel} numberOfLines={1}>{item.label}</Text>
                  <View style={result.barTrack}>
                    <View
                      style={[
                        result.barFill,
                        { width: `${item.score * 10}%`, backgroundColor: color },
                      ]}
                    />
                  </View>
                  <Text style={[result.rowScore, { color }]}>{item.score}</Text>
                </View>
              ))}
            </View>
          );
        })}

        <View style={result.notice}>
          <Text style={result.noticeText}>
            These scores are your starting point. As women rate you after real dates, your
            community score replaces these and becomes more accurate over time.
          </Text>
        </View>

        <View style={result.footer}>
          <Button label="Start discovering →" onPress={onContinue} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  kav: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24 },

  header: { paddingTop: 16, paddingBottom: 8 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  backBtn: { paddingVertical: 4 },
  backText: { color: '#7c3aed', fontSize: 14, fontWeight: '500' },
  counter: { fontSize: 13, fontWeight: '600', color: '#9ca3af', marginLeft: 'auto' },

  progressTrack: {
    height: 5,
    backgroundColor: '#f3f4f6',
    borderRadius: 3,
    marginBottom: 14,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#7c3aed', borderRadius: 3 },
  quizLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7c3aed',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24, paddingTop: 8, gap: 16 },

  scenarioCard: {
    backgroundColor: '#faf5ff',
    borderLeftWidth: 3,
    borderLeftColor: '#7c3aed',
    borderRadius: 10,
    padding: 16,
  },
  scenarioLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7c3aed',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  scenarioText: { fontSize: 14, color: '#374151', lineHeight: 22 },
  questionText: { fontSize: 20, fontWeight: '700', color: '#111827', lineHeight: 28 },

  noticeRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    alignItems: 'flex-start',
  },
  noticeIcon: { fontSize: 16, marginTop: 1 },
  noticeText: { flex: 1, fontSize: 12, color: '#6b7280', lineHeight: 18 },

  textInput: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    color: '#111827',
    lineHeight: 24,
    minHeight: 160,
    backgroundColor: '#fff',
  },

  charRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  charCount: { fontSize: 12, fontWeight: '600' },
  charCountOk: { color: '#10b981' },
  charCountNeeded: { color: '#9ca3af' },
  charHint: { fontSize: 12, color: '#9ca3af' },

  footer: { paddingBottom: 32, paddingTop: 8 },

  evaluating: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  evaluatingTitle: { fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center' },
  evaluatingSub: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
});

const result = StyleSheet.create({
  scroll: { paddingBottom: 48 },

  hero: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 32,
    paddingHorizontal: 24,
    gap: 12,
    backgroundColor: '#faf5ff',
  },
  overallRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
    marginBottom: 4,
  },
  overallScore: { fontSize: 36, fontWeight: '900', color: '#7c3aed' },
  overallLabel: { fontSize: 16, fontWeight: '600', color: '#a78bfa', alignSelf: 'flex-end', paddingBottom: 6 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  heroSub: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 21, paddingHorizontal: 8 },

  categoryBlock: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  categoryDot: { width: 10, height: 10, borderRadius: 5 },
  categoryTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.8 },
  categoryAvg: { fontSize: 14, fontWeight: '800' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  rowLabel: { width: 140, fontSize: 12, color: '#4b5563', fontWeight: '500' },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
  rowScore: { width: 20, fontSize: 12, fontWeight: '700', textAlign: 'right' },

  notice: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
  },
  noticeText: { fontSize: 12, color: '#6b7280', lineHeight: 19, textAlign: 'center' },

  footer: { paddingHorizontal: 16, marginTop: 24 },
});
