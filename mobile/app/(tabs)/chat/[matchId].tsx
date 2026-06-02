import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

// Phase 4: full real-time chat with AI red flag scanning
export default function ChatRoomScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.heading}>Chat</Text>
        <Text style={styles.sub}>Match: {matchId}</Text>
        <Text style={styles.sub}>Real-time chat coming in Phase 4</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  heading: { fontSize: 22, fontWeight: '700', color: '#111827' },
  sub: { fontSize: 14, color: '#9ca3af' },
});
