import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../lib/api';

interface Contact {
  id: string;
  name: string;
  phone: string;
  relation: string;
}

interface ContactForm {
  name: string;
  phone: string;
  relation: string;
}

const EMPTY_FORM: ContactForm = { name: '', phone: '', relation: '' };

const RELATION_OPTIONS = ['Parent', 'Sibling', 'Friend', 'Partner', 'Colleague', 'Other'];

export default function ContactsScreen() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState<ContactForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchContacts = useCallback(async () => {
    try {
      const { data } = await api.get('/safety/contacts');
      setContacts(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchContacts(); }, []);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  }

  function openEdit(c: Contact) {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone, relation: c.relation });
    setModalVisible(true);
  }

  function validateForm(): string | null {
    if (!form.name.trim()) return 'Name is required';
    if (!form.phone.trim() || form.phone.trim().length < 7) return 'Enter a valid phone number';
    if (!form.relation.trim()) return 'Relation is required';
    return null;
  }

  async function handleSave() {
    const err = validateForm();
    if (err) { Alert.alert('Missing info', err); return; }

    setSaving(true);
    try {
      if (editing) {
        const { data } = await api.put(`/safety/contacts/${editing.id}`, form);
        setContacts((prev) => prev.map((c) => (c.id === editing.id ? data : c)));
      } else {
        const { data } = await api.post('/safety/contacts', form);
        setContacts((prev) => [...prev, data]);
      }
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error ?? 'Could not save contact.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(contact: Contact) {
    Alert.alert(
      `Remove ${contact.name}?`,
      'They will no longer receive safety alerts.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await api.delete(`/safety/contacts/${contact.id}`).catch(() => null);
            setContacts((prev) => prev.filter((c) => c.id !== contact.id));
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Emergency Contacts</Text>
        {contacts.length < 3 ? (
          <Pressable onPress={openAdd} hitSlop={8}>
            <Text style={styles.addBtn}>+ Add</Text>
          </Pressable>
        ) : (
          <View style={{ width: 48 }} />
        )}
      </View>

      {/* Info bar */}
      <View style={styles.infoBar}>
        <Text style={styles.infoText}>
          {contacts.length === 0
            ? 'Add up to 3 contacts. They will be alerted if you miss a date check-in.'
            : `${contacts.length}/3 contacts saved`}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#7c3aed" />
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(c) => c.id}
          contentContainerStyle={contacts.length === 0 ? styles.emptyList : styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📞</Text>
              <Text style={styles.emptyTitle}>No contacts yet</Text>
              <Text style={styles.emptySub}>
                Add someone you trust to receive alerts if you're ever unsafe.
              </Text>
              <Pressable style={styles.emptyBtn} onPress={openAdd}>
                <Text style={styles.emptyBtnText}>Add first contact</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <ContactCard
              contact={item}
              onEdit={() => openEdit(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* Add/edit modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKav}
          >
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </Pressable>
              <Text style={styles.modalTitle}>
                {editing ? 'Edit contact' : 'Add contact'}
              </Text>
              <Pressable onPress={handleSave} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#7c3aed" />
                  : <Text style={styles.modalSave}>Save</Text>}
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <Field
                label="Full Name"
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                placeholder="e.g. Sarah Johnson"
              />
              <Field
                label="Phone Number"
                value={form.phone}
                onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
                placeholder="e.g. +1 555 000 0000"
                keyboardType="phone-pad"
              />

              <Text style={styles.fieldLabel}>Relation</Text>
              <View style={styles.relationGrid}>
                {RELATION_OPTIONS.map((r) => (
                  <Pressable
                    key={r}
                    style={[
                      styles.relationChip,
                      form.relation === r && styles.relationChipSelected,
                    ]}
                    onPress={() => setForm((f) => ({ ...f, relation: r }))}
                  >
                    <Text
                      style={[
                        styles.relationChipText,
                        form.relation === r && styles.relationChipTextSelected,
                      ]}
                    >
                      {r}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function ContactCard({
  contact,
  onEdit,
  onDelete,
}: {
  contact: Contact;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={cardStyles.wrap}>
      <View style={cardStyles.avatar}>
        <Text style={cardStyles.avatarLetter}>{contact.name[0]?.toUpperCase()}</Text>
      </View>
      <View style={cardStyles.info}>
        <Text style={cardStyles.name}>{contact.name}</Text>
        <Text style={cardStyles.phone}>{contact.phone}</Text>
        <View style={cardStyles.badge}>
          <Text style={cardStyles.badgeText}>{contact.relation}</Text>
        </View>
      </View>
      <View style={cardStyles.actions}>
        <Pressable onPress={onEdit} hitSlop={8} style={cardStyles.actionBtn}>
          <Text style={cardStyles.editText}>Edit</Text>
        </Pressable>
        <Pressable onPress={onDelete} hitSlop={8} style={cardStyles.actionBtn}>
          <Text style={cardStyles.deleteText}>Remove</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'phone-pad' | 'default';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="words"
      />
    </View>
  );
}

const cardStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarLetter: { fontSize: 20, fontWeight: '800', color: '#7c3aed' },
  info: { flex: 1, gap: 3 },
  name: { fontSize: 15, fontWeight: '700', color: '#111827' },
  phone: { fontSize: 13, color: '#6b7280' },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 11, color: '#374151', fontWeight: '500' },
  actions: { gap: 6, alignItems: 'flex-end' },
  actionBtn: { paddingVertical: 2 },
  editText: { fontSize: 13, color: '#7c3aed', fontWeight: '600' },
  deleteText: { fontSize: 13, color: '#ef4444', fontWeight: '500' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backText: { color: '#7c3aed', fontSize: 22, fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  addBtn: { fontSize: 15, color: '#7c3aed', fontWeight: '700' },

  infoBar: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f0fdf4',
    borderBottomWidth: 1,
    borderBottomColor: '#bbf7d0',
  },
  infoText: { fontSize: 13, color: '#166534' },

  list: { paddingTop: 8 },
  emptyList: { flex: 1 },
  separator: { height: 1, backgroundColor: '#f3f4f6', marginLeft: 74 },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 10,
  },
  emptyIcon: { fontSize: 52, marginBottom: 4 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  emptySub: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  emptyBtn: {
    marginTop: 12,
    backgroundColor: '#7c3aed',
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  modal: { flex: 1, backgroundColor: '#fff' },
  modalKav: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalCancel: { fontSize: 15, color: '#6b7280' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  modalSave: { fontSize: 15, fontWeight: '700', color: '#7c3aed' },

  modalBody: { padding: 24, gap: 20 },

  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  fieldInput: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },

  relationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  relationChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  relationChipSelected: { borderColor: '#7c3aed', backgroundColor: '#faf5ff' },
  relationChipText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  relationChipTextSelected: { color: '#7c3aed', fontWeight: '700' },
});
