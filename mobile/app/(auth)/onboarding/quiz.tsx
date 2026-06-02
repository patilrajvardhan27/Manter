import { useState, useRef } from 'react';
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
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';

const MIN_CHARS = 60;

export default function QuizScreen() {
  const { setQuizCompleted } = useAuthStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

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

      await api.post('/quiz/submit', { answers: answerPayload });
      setQuizCompleted();
      router.replace('/(tabs)/discover');
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

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <View style={styles.container}>
          {/* Header */}
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
            {/* Scenario card */}
            <View style={styles.scenarioCard}>
              <Text style={styles.scenarioLabel}>SCENARIO</Text>
              <Text style={styles.scenarioText}>{question.scenario}</Text>
            </View>

            <Text style={styles.questionText}>{question.question}</Text>

            {/* Notice */}
            <View style={styles.noticeRow}>
              <Text style={styles.noticeIcon}>✍️</Text>
              <Text style={styles.noticeText}>
                Write your genuine response. There are no right answers — we evaluate
                honesty, self-awareness, and depth of thought.
              </Text>
            </View>

            {/* Free-text input */}
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

            {/* Character counter */}
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

          {/* Footer */}
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

  questionText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 28,
  },

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

  charRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
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
