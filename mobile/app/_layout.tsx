import { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { useAuthStore } from '../store/auth.store';
import { useBiometricLock } from '../hooks/useBiometricLock';
import { usePushNotifications } from '../hooks/usePushNotifications';

export default function RootLayout() {
  const { user, isLoading, restore } = useAuthStore();
  const { isLocked, authenticating, authenticate } = useBiometricLock();
  usePushNotifications(!!user);

  useEffect(() => {
    restore();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      router.replace('/(tabs)/discover');
    } else {
      router.replace('/(auth)/welcome');
    }
  }, [user, isLoading]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile/[userId]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="rate/[userId]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="analysis/[matchId]" />
        <Stack.Screen name="safety/index" />
        <Stack.Screen name="safety/checkin" />
        <Stack.Screen name="safety/contacts" />
      </Stack>

      {/* Biometric lock overlay — sits above everything */}
      {isLocked && (
        <View style={lockStyles.overlay}>
          <View style={lockStyles.card}>
            <Text style={lockStyles.icon}>🔒</Text>
            <Text style={lockStyles.title}>Manter is locked</Text>
            <Text style={lockStyles.sub}>
              Authenticate to continue
            </Text>
            <Pressable
              style={lockStyles.btn}
              onPress={authenticate}
              disabled={authenticating}
            >
              {authenticating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={lockStyles.btnText}>Unlock</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}
    </>
  );
}

const lockStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,0,30,0.96)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  card: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  icon: { fontSize: 56, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '800', color: '#fff' },
  sub: { fontSize: 15, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  btn: {
    marginTop: 12,
    backgroundColor: '#7c3aed',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    minWidth: 160,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
