import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../../components/ui/Button';
import { QUIZ_QUESTIONS, QuizOption } from '../../../constants/quiz';
import { api } from '../../../lib/api';

interface SelectedAnswers {
  [questionId: string]: QuizOption;
}

export default function QuizScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<SelectedAnswers>({});
  const [loading, setLoading] = useState(false);

  const question = QUIZ_QUESTIONS[currentIndex];
  const totalQuestions = QUIZ_QUESTIONS.length;
  const isLast = currentIndex === totalQuestions - 1;
  const selectedOption = answers[question.id];
  const answeredCount = Object.keys(answers).length;

  function selectOption(option: QuizOption) {
    setAnswers((prev) => ({ ...prev, [question.id]: option }));
  }

  function goNext() {
    if (!selectedOption) {
      Alert.alert('Choose an answer', 'Please select one option before continuing.');
      return;
    }
    if (isLast) {
      submitQuiz();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }

  function goPrev() {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }

  async function submitQuiz() {
    setLoading(true);
    try {
      const answerPayload = QUIZ_QUESTIONS.map((q) => {
        const chosen = answers[q.id];
        return { questionId: q.id, optionId: chosen.id, scores: chosen.scores };
      });

      await api.post('/quiz/submit', { answers: answerPayload });
      router.replace('/(tabs)/discover');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error ?? 'Failed to submit quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const progressPercent = ((currentIndex + (selectedOption ? 1 : 0)) / totalQuestions) * 100;

  return (
    <SafeAreaView style={styles.safe}>
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

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>

          <Text style={styles.quizLabel}>Character Assessment</Text>
        </View>

        {/* Scenario + Question */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.scenarioCard}>
            <Text style={styles.scenarioLabel}>SCENARIO</Text>
            <Text style={styles.scenarioText}>{question.scenario}</Text>
          </View>

          <Text style={styles.questionText}>{question.question}</Text>

          <View style={styles.options}>
            {question.options.map((option) => {
              const isSelected = selectedOption?.id === option.id;
              return (
                <Pressable
                  key={option.id}
                  style={[styles.option, isSelected && styles.optionSelected]}
                  onPress={() => selectOption(option)}
                >
                  <View style={[styles.optionDot, isSelected && styles.optionDotSelected]}>
                    {isSelected && <View style={styles.optionDotInner} />}
                  </View>
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {option.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerHint}>
            {answeredCount} of {totalQuestions} answered
          </Text>
          <Button
            label={isLast ? (loading ? 'Submitting...' : 'Finish') : 'Next Question'}
            onPress={goNext}
            loading={loading && isLast}
            disabled={!selectedOption}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
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
  progressFill: {
    height: '100%',
    backgroundColor: '#7c3aed',
    borderRadius: 3,
  },

  quizLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7c3aed',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24, paddingTop: 8 },

  scenarioCard: {
    backgroundColor: '#faf5ff',
    borderLeftWidth: 3,
    borderLeftColor: '#7c3aed',
    borderRadius: 10,
    padding: 16,
    marginBottom: 24,
  },
  scenarioLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7c3aed',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  scenarioText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },

  questionText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 28,
    marginBottom: 24,
  },

  options: { gap: 12 },

  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  optionSelected: {
    borderColor: '#7c3aed',
    backgroundColor: '#faf5ff',
  },

  optionDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  optionDotSelected: { borderColor: '#7c3aed' },
  optionDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#7c3aed',
  },

  optionText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 21,
  },
  optionTextSelected: { color: '#4c1d95', fontWeight: '500' },

  footer: { paddingBottom: 32, gap: 10 },
  footerHint: {
    textAlign: 'center',
    fontSize: 13,
    color: '#9ca3af',
  },
});
