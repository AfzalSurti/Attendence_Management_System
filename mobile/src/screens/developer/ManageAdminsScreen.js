import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { createAdminAPI, getAdminsAPI } from '../../services/api';

const emptyForm = {
  name: '',
  mobile_number: '',
  password: '',
  admin_permission: 'full',
};

export default function ManageAdminsScreen({ navigation }) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      const res = await getAdminsAPI();
      setAdmins(res.data);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => setForm(emptyForm);

  const handleCreate = async () => {
    const cleanName = form.name.trim();
    const cleanMobile = form.mobile_number.trim();

    if (!cleanName || !cleanMobile || !form.password) {
      Alert.alert('Error', 'Name, mobile number, and password are required');
      return;
    }
    if (!/^\d{10}$/.test(cleanMobile)) {
      Alert.alert('Error', 'Mobile number must be exactly 10 digits');
      return;
    }
    if (form.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setSaving(true);
    try {
      await createAdminAPI({
        name: cleanName,
        mobile_number: cleanMobile,
        password: form.password,
        admin_permission: form.admin_permission,
      });
      Alert.alert('Success', 'Admin account created');
      setModalVisible(false);
      resetForm();
      loadAdmins();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to create admin');
    } finally {
      setSaving(false);
    }
  };

  const renderAdmin = ({ item }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.mobile}>{item.mobile_number}</Text>
      </View>
      <View style={[styles.badge, item.admin_permission === 'read_only' ? styles.badgeMuted : styles.badgeStrong]}>
        <Text style={styles.badgeText}>
          {item.admin_permission === 'read_only' ? 'Read Only' : 'Full Access'}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a237e" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Manage Admins</Text>
        <Text style={styles.subtitle}>Create multiple admin accounts and assign their access level.</Text>
      </View>

      <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
        <Text style={styles.addBtnText}>+ Create Admin</Text>
      </TouchableOpacity>

      <FlatList
        data={admins}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderAdmin}
        contentContainerStyle={{ paddingBottom: 30 }}
        ListHeaderComponent={<Text style={styles.countText}>{admins.length} admin accounts</Text>}
        ListEmptyComponent={<Text style={styles.emptyText}>No admin accounts found</Text>}
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Admin</Text>
            <TextInput
              style={styles.input}
              placeholder="Admin Name"
              placeholderTextColor="#999"
              value={form.name}
              onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Mobile Number"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              maxLength={10}
              value={form.mobile_number}
              onChangeText={(value) => setForm((prev) => ({ ...prev, mobile_number: value.replace(/\D/g, '') }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              secureTextEntry
              value={form.password}
              onChangeText={(value) => setForm((prev) => ({ ...prev, password: value }))}
            />

            <Text style={styles.sectionLabel}>Access Level</Text>
            <View style={styles.permissionRow}>
              {[
                { id: 'full', label: 'Full Access' },
                { id: 'read_only', label: 'Read Only' },
              ].map((option) => {
                const active = form.admin_permission === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.permissionChip, active && styles.permissionChipActive]}
                    onPress={() => setForm((prev) => ({ ...prev, admin_permission: option.id }))}
                  >
                    <Text style={[styles.permissionChipText, active && styles.permissionChipTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitBtnText}>Create Admin</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                setModalVisible(false);
                resetForm();
              }}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2ff', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginTop: 50, marginBottom: 16 },
  back: { color: '#1a237e', fontSize: 16, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a237e' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4 },
  addBtn: {
    backgroundColor: '#1a237e', padding: 14,
    borderRadius: 12, alignItems: 'center', marginBottom: 16,
  },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  countText: { fontSize: 13, color: '#666', marginBottom: 12 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 10, elevation: 3, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  name: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  mobile: { fontSize: 13, color: '#666', marginTop: 4 },
  badge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  badgeStrong: { backgroundColor: '#e8f5e9' },
  badgeMuted: { backgroundColor: '#fff3e0' },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#374151' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 24, width: '100%',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a237e', marginBottom: 16 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    padding: 12, fontSize: 14, marginBottom: 12, color: '#333',
  },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#1a237e', marginBottom: 8 },
  permissionRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  permissionChip: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  permissionChipActive: {
    backgroundColor: '#1a237e',
    borderColor: '#1a237e',
  },
  permissionChipText: { color: '#1f2937', fontWeight: '700', fontSize: 13 },
  permissionChipTextActive: { color: '#fff' },
  submitBtn: {
    backgroundColor: '#1a237e', padding: 14,
    borderRadius: 10, alignItems: 'center', marginBottom: 8,
  },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  cancelBtn: {
    backgroundColor: '#f5f5f5', padding: 14,
    borderRadius: 10, alignItems: 'center',
  },
  cancelBtnText: { color: '#666', fontWeight: 'bold' },
});
