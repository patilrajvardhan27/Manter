import { useRef, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Text,
  Platform,
} from 'react-native';

interface Props {
  onSend: (text: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, onTypingStart, onTypingStop, disabled }: Props) {
  const [text, setText] = useState('');
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef(false);

  function handleChangeText(value: string) {
    setText(value);

    if (value.length > 0 && !isTyping.current) {
      isTyping.current = true;
      onTypingStart();
    }

    // Reset the stop-typing timer on every keystroke
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      if (isTyping.current) {
        isTyping.current = false;
        onTypingStop();
      }
    }, 1500);
  }

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    // Cancel any pending typing timer
    if (typingTimer.current) clearTimeout(typingTimer.current);
    if (isTyping.current) {
      isTyping.current = false;
      onTypingStop();
    }

    setText('');
    onSend(trimmed);
  }

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={handleChangeText}
        placeholder="Message..."
        placeholderTextColor="#9ca3af"
        multiline
        maxLength={1000}
        returnKeyType="default"
        enablesReturnKeyAutomatically={false}
        editable={!disabled}
        blurOnSubmit={false}
      />
      <Pressable
        style={[styles.sendBtn, canSend ? styles.sendBtnActive : styles.sendBtnInactive]}
        onPress={handleSend}
        disabled={!canSend}
      >
        <Text style={styles.sendBtnText}>↑</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    color: '#111827',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnActive: { backgroundColor: '#7c3aed' },
  sendBtnInactive: { backgroundColor: '#e5e7eb' },
  sendBtnText: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: -1 },
});
