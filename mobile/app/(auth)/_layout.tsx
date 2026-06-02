import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="onboarding/role" />
      <Stack.Screen name="onboarding/profile" />
      <Stack.Screen name="onboarding/quiz" />
      <Stack.Screen name="onboarding/weights" />
    </Stack>
  );
}
