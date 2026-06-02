import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { useAuthStore } from '../store/auth.store';

export default function RootLayout() {
  const { user, isLoading, restore } = useAuthStore();

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
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="profile/[userId]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="rate/[userId]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="analysis/[matchId]" />
      <Stack.Screen name="safety/index" />
    </Stack>
  );
}
