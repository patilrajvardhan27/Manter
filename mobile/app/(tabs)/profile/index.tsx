import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../store/auth.store';

export default function MyProfileScreen() {
  const { user, logout } = useAuthStore();

  async function handleLogout() {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.meta}>{user?.age} · {user?.role === 'WOMAN' ? 'Woman' : 'Man'}</Text>
        {user?.city ? <Text style={styles.city}>{user.city}</Text> : null}

        <View style={styles.spacer} />

        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 48 },

  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: { fontSize: 36, fontWeight: '700', color: '#7c3aed' },

  name: { fontSize: 24, fontWeight: '800', color: '#111827' },
  meta: { fontSize: 15, color: '#6b7280', marginTop: 6 },
  city: { fontSize: 14, color: '#9ca3af', marginTop: 4 },

  spacer: { flex: 1 },

  logoutBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#fee2e2',
    alignItems: 'center',
    marginBottom: 32,
  },
  logoutText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
});
