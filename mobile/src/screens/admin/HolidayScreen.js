import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal
} from 'react-native';
import { getHolidaysAPI, addHolidayAPI, deleteHolidayAPI } from '../../services/api';

export default function HolidayScreen({ navigation }) {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({ holiday_date: '', holiday_name: '' });

  useEffect(() => { loadHolidays(); }, []);

  const loadHolidays = async () => {
    try {
      const res = await getHolidaysAPI();
      setHolidays(res.data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load holidays');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!form.holiday_date || !form.holiday_name) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    try {
      await addHolidayAPI(form);
      Alert.alert('Success', 'Holiday added successfully');
      setModalVisible(false);
      setForm({ holiday_date: '', holiday_name: '' });
      loadHolidays();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to add holiday');
    }
  };

  const handleDelete = (holiday) => {
    Alert.alert(
      'Delete Holiday',
      `Delete ${holiday.holiday_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await deleteHolidayAPI(holiday.id);
              loadHolidays();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete holiday');
            }
          }
        }
      ]
    );
  };

  const formatDate = (date) => {
    if (!date) return '--';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const renderHoliday = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.holidayName}>{item.holiday_name}</Text>
        <Text style={styles.holidayDate}>{formatDate(item.holiday_date)}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => handleDelete(item)}
      >
        <Text style={styles.deleteBtnText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#1a237e" />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Holiday Management</Text>
      </View>

      {/* Add Button */}
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.addBtnText}>+ Add Holiday</Text>
      </TouchableOpacity>

      {/* List */}
      <FlatList
        data={holidays}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderHoliday}
        contentContainerStyle={{ paddingBottom: 30 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No holidays added yet</Text>
        }
      />

      {/* Add Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Holiday</Text>
            <TextInput
              style={styles.input}
              placeholder="Date (YYYY-MM-DD)"
              value={form.holiday_date}
              onChangeText={(t) => setForm({ ...form, holiday_date: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="Holiday Name (e.g. Diwali)"
              value={form.holiday_name}
              onChangeText={(t) => setForm({ ...form, holiday_name: t })}
            />
            <TouchableOpacity style={styles.submitBtn} onPress={handleAdd}>
              <Text style={styles.submitBtnText}>Add Holiday</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setModalVisible(false)}
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
  addBtn: {
    backgroundColor: '#1a237e', padding: 14,
    borderRadius: 12, alignItems: 'center', marginBottom: 16
  },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  card: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 14, marginBottom: 10, elevation: 3,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between'
  },
  cardInfo: { flex: 1 },
  holidayName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  holidayDate: { fontSize: 13, color: '#888', marginTop: 2 },
  deleteBtn: {
    backgroundColor: '#ffebee', padding: 8,
    borderRadius: 8, alignItems: 'center'
  },
  deleteBtnText: { color: '#c62828', fontWeight: 'bold', fontSize: 12 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 20
  },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 24, width: '100%'
  },
  modalTitle: {
    fontSize: 18, fontWeight: 'bold',
    color: '#1a237e', marginBottom: 16
  },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    padding: 12, fontSize: 14, marginBottom: 12, color: '#333'
  },
  submitBtn: {
    backgroundColor: '#1a237e', padding: 14,
    borderRadius: 10, alignItems: 'center', marginBottom: 8
  },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  cancelBtn: {
    backgroundColor: '#f5f5f5', padding: 14,
    borderRadius: 10, alignItems: 'center'
  },
  cancelBtnText: { color: '#666', fontWeight: 'bold' },
});