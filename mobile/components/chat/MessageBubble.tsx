import { View, Text, StyleSheet } from 'react-native';
import { ChatMessage } from '../../store/chat.store';
import { RED_FLAG_LABELS } from '../../constants/redFlags';

interface Props {
  message: ChatMessage;
  isMe: boolean;
  showTimestamp: boolean;
}

export function MessageBubble({ message, isMe, showTimestamp }: Props) {
  const hasFlag = (message.redFlagScore ?? 0) >= 0.5;
  const flagColor = (message.redFlagScore ?? 0) >= 0.7 ? '#fee2e2' : '#fef3c7';

  return (
    <View style={[styles.row, isMe ? styles.rowRight : styles.rowLeft]}>
      <View style={styles.column}>
        {showTimestamp && (
          <Text style={styles.timestamp}>{formatTime(message.createdAt)}</Text>
        )}

        <View
          style={[
            styles.bubble,
            isMe ? styles.bubbleMe : styles.bubbleThem,
            hasFlag && !isMe && { borderWidth: 1, borderColor: flagColor === '#fee2e2' ? '#fca5a5' : '#fcd34d' },
          ]}
        >
          <Text style={[styles.text, isMe ? styles.textMe : styles.textThem]}>
            {message.content}
          </Text>

          {/* Red flag micro-badge */}
          {hasFlag && !isMe && (
            <View style={[styles.flagBadge, { backgroundColor: flagColor }]}>
              <Text style={styles.flagBadgeText}>⚠</Text>
            </View>
          )}
        </View>

        {/* Read receipt for my messages */}
        {isMe && (
          <Text style={styles.receipt}>
            {message.readAt ? '✓✓' : '✓'}
          </Text>
        )}
      </View>
    </View>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginVertical: 2, paddingHorizontal: 12 },
  rowRight: { justifyContent: 'flex-end' },
  rowLeft: { justifyContent: 'flex-start' },

  column: { maxWidth: '75%', gap: 2 },

  timestamp: {
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'center',
    alignSelf: 'center',
    marginBottom: 4,
    marginTop: 8,
  },

  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
    position: 'relative',
  },
  bubbleMe: {
    backgroundColor: '#7c3aed',
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: '#f3f4f6',
    borderBottomLeftRadius: 4,
  },

  text: { fontSize: 15, lineHeight: 21 },
  textMe: { color: '#fff' },
  textThem: { color: '#111827' },

  flagBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  flagBadgeText: { fontSize: 9 },

  receipt: {
    fontSize: 10,
    color: '#a78bfa',
    textAlign: 'right',
    marginRight: 2,
  },
});
