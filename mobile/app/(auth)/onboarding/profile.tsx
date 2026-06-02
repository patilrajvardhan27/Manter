import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormInput } from '../../../components/ui/FormInput';
import { Button } from '../../../components/ui/Button';
import { useAuthStore } from '../../../store/auth.store';
import { api } from '../../../lib/api';

interface Errors {
  name?: string;
  age?: string;
}

export default function ProfileScreen() {
  const { register } = useAuthStore();
  const params = useLocalSearchParams<{
    email: string;
    password: string;
    role: 'WOMAN' | 'MAN';
  }>();

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  function validate() {
    const e: Errors = {};
    if (!name.trim() || name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    const ageNum = parseInt(age, 10);
    if (!age || isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
      e.age = 'Must be between 18 and 100';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  }

  async function handleFinish() {
    if (!validate()) return;
    setLoading(true);
    try {
      await register({
        email: params.email,
        password: params.password,
        role: params.role,
        name: name.trim(),
        age: parseInt(age, 10),
        bio: bio.trim() || undefined,
        city: city.trim() || undefined,
      });

      // Upload photo if selected
      if (photo) {
        const form = new FormData();
        form.append('photo', { uri: photo, name: 'photo.jpg', type: 'image/jpeg' } as any);
        await api.post('/upload/photo', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // Redirect based on role: men go to quiz, women to weights — Phase 2
      // For now both land on the main tabs
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Registration failed. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.step}>Step 3 of 3</Text>
            <Text style={styles.title}>Your profile</Text>
            <Text style={styles.subtitle}>
              This is what {params.role === 'WOMAN' ? 'men' : 'women'} will see.
            </Text>
          </View>

          {/* Photo picker */}
          <Pressable style={styles.photoPicker} onPress={pickPhoto}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.photoPreview} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoIcon}>📷</Text>
                <Text style={styles.photoText}>Add photo</Text>
              </View>
            )}
          </Pressable>

          <View style={styles.form}>
            <FormInput
              label="Full Name"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              error={errors.name}
            />
            <FormInput
              label="Age"
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
              placeholder="Your age"
              error={errors.age}
              containerStyle={styles.halfField}
            />
            <FormInput
              label="City (optional)"
              value={city}
              onChangeText={setCity}
              placeholder="Where you're based"
            />
            <View>
              <Text style={styles.bioLabel}>Bio (optional)</Text>
              <FormInput
                label=""
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={4}
                placeholder="Tell people a little about yourself..."
                style={styles.bioInput}
              />
            </View>
          </View>

          <Button
            label={loading ? 'Creating your account...' : 'Finish'}
            onPress={handleFinish}
            loading={loading}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingBottom: 48 },

  header: { paddingTop: 48, paddingBottom: 24 },
  step: { fontSize: 13, fontWeight: '600', color: '#7c3aed', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#6b7280', marginTop: 6 },

  photoPicker: { alignSelf: 'center', marginBottom: 32 },
  photoPreview: { width: 100, height: 100, borderRadius: 50 },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  photoIcon: { fontSize: 24 },
  photoText: { fontSize: 12, color: '#9ca3af', fontWeight: '500' },

  form: { gap: 18, marginBottom: 28 },
  halfField: { maxWidth: 160 },

  bioLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  bioInput: { height: 96, textAlignVertical: 'top' },
});
