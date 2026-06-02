import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../../components/ui/Button';

type Role = 'WOMAN' | 'MAN';

export default function RoleScreen() {
  const params = useLocalSearchParams<{ email: string; password: string }>();
  const [selected, setSelected] = useState<Role | null>(null);

  function handleNext() {
    if (!selected) return;
    router.push({
      pathname: '/(auth)/onboarding/profile',
      params: { ...params, role: selected },
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.step}>Step 2 of 3</Text>
          <Text style={styles.title}>I am joining as...</Text>
          <Text style={styles.subtitle}>
            This shapes your entire experience on Manter.
          </Text>
        </View>

        <View style={styles.cards}>
          <RoleCard
            role="WOMAN"
            title="A Woman"
            description="Browse candidates by character score, read community ratings from other women, and chat with AI-powered safety."
            icon="♀"
            selected={selected === 'WOMAN'}
            onPress={() => setSelected('WOMAN')}
          />
          <RoleCard
            role="MAN"
            title="A Man"
            description="Build your character profile, take the behavioral quiz, and let your actions — not just your looks — get you noticed."
            icon="♂"
            selected={selected === 'MAN'}
            onPress={() => setSelected('MAN')}
          />
        </View>

        <Button
          label="Continue"
          onPress={handleNext}
          disabled={!selected}
          style={styles.cta}
        />
      </View>
    </SafeAreaView>
  );
}

function RoleCard({
  title,
  description,
  icon,
  selected,
  onPress,
}: {
  role: Role;
  title: string;
  description: string;
  icon: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, selected && styles.cardSelected]}
    >
      <View style={[styles.cardIcon, selected && styles.cardIconSelected]}>
        <Text style={styles.cardIconText}>{icon}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, selected && styles.cardTitleSelected]}>
          {title}
        </Text>
        <Text style={styles.cardDesc}>{description}</Text>
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, paddingHorizontal: 24, paddingBottom: 32 },

  header: { paddingTop: 48, paddingBottom: 32 },
  step: { fontSize: 13, fontWeight: '600', color: '#7c3aed', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#6b7280', marginTop: 8, lineHeight: 22 },

  cards: { gap: 14, flex: 1 },

  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  cardSelected: {
    borderColor: '#7c3aed',
    backgroundColor: '#faf5ff',
  },

  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIconSelected: { backgroundColor: '#ede9fe' },
  cardIconText: { fontSize: 22 },

  cardBody: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 },
  cardTitleSelected: { color: '#6d28d9' },
  cardDesc: { fontSize: 13, color: '#6b7280', lineHeight: 20 },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  radioSelected: { borderColor: '#7c3aed' },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#7c3aed',
  },

  cta: { marginTop: 24 },
});
