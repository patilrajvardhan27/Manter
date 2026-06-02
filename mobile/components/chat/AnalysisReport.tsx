import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { ConversationAnalysis, ConversationHealth, FlagPattern } from '../../../shared/types';
import { RED_FLAG_LABELS, RED_FLAG_DESCRIPTIONS } from '../../constants/redFlags';

interface Props {
  analysis: ConversationAnalysis;
  otherName: string;
}

export function AnalysisReport({ analysis, otherName }: Props) {
  const { health, overallScore, summary, patterns, greenFlags, recommendation } = analysis;

  return (
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* Overall health badge */}
      <View style={[styles.healthCard, healthCardStyle(health)]}>
        <Text style={styles.healthEmoji}>{healthEmoji(health)}</Text>
        <View style={styles.healthText}>
          <Text style={[styles.healthLabel, healthLabelStyle(health)]}>
            {healthTitle(health)}
          </Text>
          <Text style={styles.healthSub}>
            AI confidence score: {Math.round(overallScore * 100)}%
          </Text>
        </View>
        <ScoreArc score={overallScore} health={health} />
      </View>

      {/* Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <Text style={styles.summaryText}>{summary}</Text>
      </View>

      {/* Red flag patterns */}
      {patterns.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {patterns.length} Pattern{patterns.length !== 1 ? 's' : ''} Detected
          </Text>
          <View style={styles.patternList}>
            {patterns.map((p, i) => (
              <PatternCard key={i} pattern={p} />
            ))}
          </View>
        </View>
      )}

      {/* Green flags */}
      {greenFlags.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Green Flags ✓</Text>
          <View style={styles.greenList}>
            {greenFlags.map((g, i) => (
              <View key={i} style={styles.greenItem}>
                <View style={styles.greenDot} />
                <Text style={styles.greenText}>{g}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Recommendation */}
      <View style={[styles.section, styles.recommendationCard]}>
        <Text style={styles.recommendationTitle}>💡 Our suggestion</Text>
        <Text style={styles.recommendationText}>{recommendation}</Text>
      </View>

      {/* Disclaimer */}
      <Text style={styles.disclaimer}>
        This analysis is AI-generated and not a definitive verdict. Use it as one input
        alongside your own instincts. Trust yourself.
      </Text>
    </ScrollView>
  );
}

function PatternCard({ pattern }: { pattern: FlagPattern }) {
  const sevColor = { mild: '#fef3c7', moderate: '#ffedd5', severe: '#fee2e2' };
  const sevBorder = { mild: '#fcd34d', moderate: '#fb923c', severe: '#f87171' };
  const sevLabel = { mild: 'Mild', moderate: 'Moderate', severe: 'Severe' };

  return (
    <View style={[
      patternStyles.card,
      { backgroundColor: sevColor[pattern.severity], borderColor: sevBorder[pattern.severity] },
    ]}>
      <View style={patternStyles.header}>
        <Text style={patternStyles.label}>
          {RED_FLAG_LABELS[pattern.category] ?? pattern.category}
        </Text>
        <View style={[patternStyles.sevBadge, { borderColor: sevBorder[pattern.severity] }]}>
          <Text style={[patternStyles.sevText, { color: sevBorder[pattern.severity] }]}>
            {sevLabel[pattern.severity]}
          </Text>
        </View>
      </View>

      <Text style={patternStyles.explanation}>{pattern.explanation}</Text>

      {pattern.excerpt && (
        <View style={patternStyles.excerptWrap}>
          <Text style={patternStyles.excerptQuote}>❝</Text>
          <Text style={patternStyles.excerptText}>{pattern.excerpt}</Text>
        </View>
      )}

      {pattern.count > 1 && (
        <Text style={patternStyles.count}>Observed {pattern.count} times</Text>
      )}
    </View>
  );
}

function ScoreArc({ score, health }: { score: number; health: ConversationHealth }) {
  const size = 52;
  const pct = Math.round(score * 100);
  return (
    <View style={[arcStyles.wrap, { width: size, height: size }]}>
      <View style={[arcStyles.circle, { borderColor: healthColor(health) }]}>
        <Text style={arcStyles.text}>{pct}</Text>
        <Text style={arcStyles.sub}>%</Text>
      </View>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function healthEmoji(h: ConversationHealth) {
  return h === 'healthy' ? '✅' : h === 'caution' ? '⚠️' : '🚩';
}

function healthTitle(h: ConversationHealth) {
  return h === 'healthy' ? 'Conversation looks healthy'
    : h === 'caution' ? 'A few things to watch'
    : 'Concerning patterns found';
}

function healthColor(h: ConversationHealth) {
  return h === 'healthy' ? '#10b981' : h === 'caution' ? '#f59e0b' : '#ef4444';
}

function healthCardStyle(h: ConversationHealth) {
  return h === 'healthy'
    ? { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }
    : h === 'caution'
    ? { backgroundColor: '#fffbeb', borderColor: '#fde68a' }
    : { backgroundColor: '#fff1f2', borderColor: '#fecaca' };
}

function healthLabelStyle(h: ConversationHealth) {
  return {
    color: h === 'healthy' ? '#065f46' : h === 'caution' ? '#78350f' : '#7f1d1d',
  };
}

const arcStyles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  circle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  text: { fontSize: 15, fontWeight: '800', color: '#111827', lineHeight: 18 },
  sub: { fontSize: 9, color: '#6b7280', lineHeight: 11 },
});

const patternStyles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', flex: 1 },
  sevBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  sevText: { fontSize: 10, fontWeight: '700' },
  explanation: { fontSize: 13, color: '#374151', lineHeight: 19 },
  excerptWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 8,
    padding: 10,
  },
  excerptQuote: { fontSize: 16, color: '#9ca3af', lineHeight: 20 },
  excerptText: {
    flex: 1,
    fontSize: 12,
    color: '#374151',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  count: { fontSize: 11, color: '#6b7280' },
});

const styles = StyleSheet.create({
  scroll: { flex: 1 },

  healthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  healthEmoji: { fontSize: 28 },
  healthText: { flex: 1 },
  healthLabel: { fontSize: 15, fontWeight: '700' },
  healthSub: { fontSize: 11, color: '#6b7280', marginTop: 3 },

  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  summaryText: { fontSize: 14, color: '#374151', lineHeight: 22 },

  patternList: { gap: 10 },

  greenList: { gap: 8 },
  greenItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginTop: 5,
    flexShrink: 0,
  },
  greenText: { flex: 1, fontSize: 14, color: '#374151', lineHeight: 20 },

  recommendationCard: {
    backgroundColor: '#f5f3ff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  recommendationTitle: { fontSize: 13, fontWeight: '700', color: '#6d28d9', marginBottom: 8 },
  recommendationText: { fontSize: 14, color: '#374151', lineHeight: 22 },

  disclaimer: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 32,
    fontStyle: 'italic',
  },
});
