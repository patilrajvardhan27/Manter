import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnalysisReport } from '../../components/chat/AnalysisReport';
import { api } from '../../lib/api';
import { ConversationAnalysis } from '../../../shared/types';

export default function AnalysisScreen() {
  const { matchId, otherName } = useLocalSearchParams<{
    matchId: string;
    otherName: string;
  }>();

  const [analysis, setAnalysis] = useState<ConversationAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .post(`/ai/analyze/${matchId}`)
      .then(({ data }) => setAnalysis(data))
      .catch((err) => {
        const msg = err?.response?.data?.error ?? 'Analysis failed. Please try again.';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [matchId]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>AI Safety Analysis</Text>
          <Text style={styles.subtitle}>Your conversation with {otherName}</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.body}>
        {loading && (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#7c3aed" />
            <Text style={styles.loadingTitle}>Analyzing conversation...</Text>
            <Text style={styles.loadingSubtitle}>
              Claude is reading your conversation for patterns.{'\n'}This takes a few seconds.
            </Text>
          </View>
        )}

        {error && (
          <View style={styles.errorState}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorTitle}>Could not complete analysis</Text>
            <Text style={styles.errorBody}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={() => router.back()}>
              <Text style={styles.retryBtnText}>Go back</Text>
            </Pressable>
          </View>
        )}

        {analysis && !loading && (
          <AnalysisReport analysis={analysis} otherName={otherName} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 8,
  },
  backText: { color: '#7c3aed', fontSize: 15, fontWeight: '500', width: 60 },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  body: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },

  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  loadingTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  loadingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },

  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  errorEmoji: { fontSize: 48 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  errorBody: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  retryBtn: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 28,
    backgroundColor: '#7c3aed',
    borderRadius: 12,
  },
  retryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
