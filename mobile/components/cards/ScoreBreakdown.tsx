import { View, Text, StyleSheet } from 'react-native';
import { QUALITIES, QUALITY_CATEGORIES } from '../../constants/qualities';
import { QualityKey, QualityScores } from '../../../shared/types';

interface ScoreBreakdownProps {
  scores: Partial<QualityScores>;
  ratingCount: number;
  communityScore: number;
  compact?: boolean;
}

export function ScoreBreakdown({
  scores,
  ratingCount,
  communityScore,
  compact,
}: ScoreBreakdownProps) {
  const categories = Object.entries(QUALITY_CATEGORIES) as [string, string][];

  if (compact) {
    return <CompactView scores={scores} communityScore={communityScore} ratingCount={ratingCount} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.overallRow}>
        <ScoreBadge score={communityScore} size="large" />
        <View style={styles.overallText}>
          <Text style={styles.overallLabel}>Overall Score</Text>
          <Text style={styles.overallSub}>
            {ratingCount > 0
              ? `Based on ${ratingCount} rating${ratingCount !== 1 ? 's' : ''} from women`
              : 'Self-assessed — no community ratings yet'}
          </Text>
        </View>
      </View>

      {categories.map(([cat, title]) => {
        const catQualities = QUALITIES.filter((q) => q.category === cat);
        return (
          <View key={cat} style={styles.category}>
            <Text style={styles.categoryTitle}>{title}</Text>
            {catQualities.map((q) => {
              const score = scores[q.key] ?? 5;
              return <QualityBar key={q.key} label={q.label} score={score} />;
            })}
          </View>
        );
      })}
    </View>
  );
}

function CompactView({
  scores,
  communityScore,
  ratingCount,
}: {
  scores: Partial<QualityScores>;
  communityScore: number;
  ratingCount: number;
}) {
  const topQualities = QUALITIES.map((q) => ({
    ...q,
    score: scores[q.key] ?? 5,
  }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return (
    <View style={styles.compact}>
      <View style={styles.compactHeader}>
        <ScoreBadge score={communityScore} size="medium" />
        <Text style={styles.compactLabel}>
          {ratingCount > 0 ? `${ratingCount} rating${ratingCount !== 1 ? 's' : ''}` : 'Self-assessed'}
        </Text>
      </View>
      <View style={styles.topList}>
        {topQualities.map((q) => (
          <View key={q.key} style={styles.topItem}>
            <View style={[styles.topDot, { backgroundColor: scoreColor(q.score) }]} />
            <Text style={styles.topLabel} numberOfLines={1}>{q.label}</Text>
            <Text style={styles.topScore}>{q.score}/10</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function QualityBar({ label, score }: { label: string; score: number }) {
  return (
    <View style={barStyles.row}>
      <Text style={barStyles.label} numberOfLines={1}>{label}</Text>
      <View style={barStyles.track}>
        <View
          style={[
            barStyles.fill,
            { width: `${score * 10}%`, backgroundColor: scoreColor(score) },
          ]}
        />
      </View>
      <Text style={barStyles.score}>{score}</Text>
    </View>
  );
}

function ScoreBadge({ score, size }: { score: number; size: 'large' | 'medium' }) {
  const dim = size === 'large' ? 64 : 48;
  const fontSize = size === 'large' ? 22 : 16;
  return (
    <View
      style={[
        badgeStyles.circle,
        { width: dim, height: dim, borderRadius: dim / 2, borderColor: scoreColor(score / 10) },
      ]}
    >
      <Text style={[badgeStyles.text, { fontSize }]}>{Math.round(score)}</Text>
    </View>
  );
}

function scoreColor(normalizedScore: number): string {
  // normalizedScore: 0–10 for bar, 0–100 for badge
  const s = normalizedScore > 10 ? normalizedScore / 10 : normalizedScore;
  if (s >= 8) return '#10b981';  // green
  if (s >= 6) return '#f59e0b';  // amber
  if (s >= 4) return '#f97316';  // orange
  return '#ef4444';               // red
}

const barStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  label: { width: 130, fontSize: 12, color: '#374151' },
  track: {
    flex: 1,
    height: 7,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 4 },
  score: { width: 22, fontSize: 12, fontWeight: '600', color: '#6b7280', textAlign: 'right' },
});

const badgeStyles = StyleSheet.create({
  circle: {
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: { fontWeight: '800', color: '#111827' },
});

const styles = StyleSheet.create({
  container: { gap: 20 },

  overallRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  overallText: { flex: 1 },
  overallLabel: { fontSize: 16, fontWeight: '700', color: '#111827' },
  overallSub: { fontSize: 12, color: '#6b7280', marginTop: 3, lineHeight: 17 },

  category: { gap: 4 },
  categoryTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },

  compact: { gap: 10 },
  compactHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  compactLabel: { fontSize: 12, color: '#6b7280' },
  topList: { gap: 6 },
  topItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topDot: { width: 8, height: 8, borderRadius: 4 },
  topLabel: { flex: 1, fontSize: 13, color: '#374151' },
  topScore: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
});
