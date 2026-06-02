import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, LayoutAnimation } from 'react-native';
import { RedFlagAlert } from '../../store/chat.store';
import { RED_FLAG_LABELS, RED_FLAG_DESCRIPTIONS } from '../../constants/redFlags';
import { RedFlagCategory } from '../../../shared/types';

interface Props {
  alert: RedFlagAlert;
  onDismiss: () => void;
}

export function RedFlagBanner({ alert, onDismiss }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isHigh = alert.score >= 0.7;

  function toggleExpand() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  }

  return (
    <View style={[styles.banner, isHigh ? styles.bannerHigh : styles.bannerMed]}>
      <View style={styles.row}>
        <Text style={styles.icon}>{isHigh ? '🚩' : '⚠️'}</Text>
        <View style={styles.textBlock}>
          <Text style={[styles.title, isHigh ? styles.titleHigh : styles.titleMed]}>
            {isHigh ? 'Red flag detected' : 'Caution'}
          </Text>
          <Text style={styles.explanation} numberOfLines={expanded ? undefined : 2}>
            {alert.explanation}
          </Text>
        </View>
        <View style={styles.actions}>
          <Pressable onPress={toggleExpand} hitSlop={8}>
            <Text style={styles.actionText}>{expanded ? '▲' : '▼'}</Text>
          </Pressable>
          <Pressable onPress={onDismiss} hitSlop={8}>
            <Text style={styles.actionText}>✕</Text>
          </Pressable>
        </View>
      </View>

      {expanded && alert.flags.length > 0 && (
        <View style={styles.flagList}>
          {alert.flags.map((flag) => (
            <View key={flag} style={styles.flagItem}>
              <Text style={styles.flagLabel}>
                {RED_FLAG_LABELS[flag as RedFlagCategory] ?? flag}
              </Text>
              <Text style={styles.flagDesc}>
                {RED_FLAG_DESCRIPTIONS[flag as RedFlagCategory]}
              </Text>
            </View>
          ))}
          <Text style={styles.disclaimer}>
            This is an AI-powered signal, not a definitive verdict. Trust your instincts.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 10,
    marginBottom: 6,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  bannerHigh: { backgroundColor: '#fff1f2', borderColor: '#fca5a5' },
  bannerMed: { backgroundColor: '#fffbeb', borderColor: '#fcd34d' },

  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  icon: { fontSize: 18, marginTop: 1 },

  textBlock: { flex: 1 },
  title: { fontSize: 13, fontWeight: '700', marginBottom: 3 },
  titleHigh: { color: '#b91c1c' },
  titleMed: { color: '#92400e' },
  explanation: { fontSize: 12, color: '#374151', lineHeight: 17 },

  actions: { flexDirection: 'row', gap: 10, marginTop: 1 },
  actionText: { fontSize: 14, color: '#6b7280', fontWeight: '600' },

  flagList: { marginTop: 10, gap: 8 },
  flagItem: { gap: 2 },
  flagLabel: { fontSize: 12, fontWeight: '700', color: '#374151' },
  flagDesc: { fontSize: 11, color: '#6b7280', lineHeight: 16 },
  disclaimer: {
    fontSize: 11,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 16,
  },
});
