import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#7c3aed',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { borderTopColor: '#f3f4f6' },
      }}
    >
      <Tabs.Screen name="discover" options={{ title: 'Discover', tabBarLabel: 'Discover' }} />
      <Tabs.Screen name="matches" options={{ title: 'Matches', tabBarLabel: 'Matches' }} />
      <Tabs.Screen
        name="chat/index"
        options={{ title: 'Chat', tabBarLabel: 'Chat' }}
      />
      <Tabs.Screen
        name="chat/[matchId]"
        options={{ href: null }} // not a tab — navigated to from Matches
      />
      <Tabs.Screen name="community" options={{ title: 'Community', tabBarLabel: 'Community' }} />
      <Tabs.Screen
        name="profile/index"
        options={{ title: 'Profile', tabBarLabel: 'Profile' }}
      />
      <Tabs.Screen name="profile/edit" options={{ href: null }} />
    </Tabs>
  );
}
