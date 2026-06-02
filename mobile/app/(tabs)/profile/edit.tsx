import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormInput } from '../../../components/ui/FormInput';
import { Button } from '../../../components/ui/Button';
import { useAuthStore } from '../../../store/auth.store';
import { api } from '../../../lib/api';

export default function EditProfileScreen() {
  const { user, restore } = useAuthStore();

  const [name, setName] = useState(user?.name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }
    setLoading(true);
    try {
      await api.put('/users/me', { name: name.trim(), bio: bio.trim(), city: city.trim() });
      await restore();
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to save changes.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;

    setUploadingPhoto(true);
    try {
      const form = new FormData();
      form.append('photo', {
        uri: result.assets[0].uri,
        name: 'photo.jpg',
        type: 'image/jpeg',
      } as any);
      await api.post('/upload/photo', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await restore();
    } catch {
      Alert.alert('Error', 'Photo upload failed.');
    } finally {
      setUploadingPhoto(false);
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
            <Pressable onPress={() => router.back()}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
            <Text style={styles.title}>Edit Profile</Text>
            <View style={{ width: 52 }} />
          </View>

          {/* Photos */}
          <View style={styles.photosSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
              {(user?.photos ?? []).map((uri, i) => (
                <Image key={i} source={{ uri }} style={styles.photoThumb} />
              ))}
              {(user?.photos?.length ?? 0) < 6 && (
                <Pressable style={styles.addPhotoBtn} onPress={handleAddPhoto} disabled={uploadingPhoto}>
                  <Text style={styles.addPhotoIcon}>{uploadingPhoto ? '...' : '+'}</Text>
                </Pressable>
              )}
            </ScrollView>
            <Text style={styles.photoHint}>Add up to 6 photos</Text>
          </View>

          {/* Fields */}
          <View style={styles.form}>
            <FormInput
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
            />
            <FormInput
              label="City"
              value={city}
              onChangeText={setCity}
              placeholder="Where you're based"
            />
            <View>
              <Text style={styles.bioLabel}>Bio</Text>
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

          <Button label={loading ? 'Saving...' : 'Save Changes'} onPress={handleSave} loading={loading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  cancel: { color: '#7c3aed', fontSize: 15 },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },

  photosSection: { marginBottom: 24 },
  photoScroll: { flexDirection: 'row' },
  photoThumb: { width: 80, height: 80, borderRadius: 12, marginRight: 8 },
  addPhotoBtn: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  addPhotoIcon: { fontSize: 28, color: '#9ca3af' },
  photoHint: { fontSize: 12, color: '#9ca3af', marginTop: 8 },

  form: { gap: 18, marginBottom: 28 },
  bioLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  bioInput: { height: 96, textAlignVertical: 'top' },
});
