import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Alert, ScrollView
} from 'react-native';
import { getAdminAttendanceAPI, updateAttendanceAPI } from '../../services/api';
import { getApiErrorMessage } from '../../utils/apiError';
import { formatCoords, coordsToForm, parseCoord } from '../../utils/coordinates';

const formatDate = (dateStr) => {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const formatTime = (datetime) => {
  if (!datetime) return '--';
  return new Date(datetime).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit',
  });
};

const toTimeInput = (datetime) => {
  if (!datetime) return '';
  const d = new Date(datetime);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

const buildDateTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  const d = new Date(dateStr);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
};

const calcWorkingHours = (checkinIso, checkoutIso) => {
  if (!checkinIso || !checkoutIso) return '';
  const diff = (new Date(checkoutIso) - new Date(checkinIso)) / (1000 * 60 * 60);
  if (diff < 0) return '';
  return String(Math.round(diff * 100) / 100);
};

export default function EmployeeAttendanceScreen({ navigation, route }) {
  const employee = route.params?.employee;
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [form, setForm] = useState({
    checkin_time: '',
    checkout_time: '',
    working_hours: '',
    checkin_latitude: '',
    checkin_longitude: '',
    checkout_latitude: '',
    checkout_longitude: '',
  });

  const loadRecords = useCallback(async () => {
    if (!employee?.id) return;
    setLoading(true);
    try {
      const res = await getAdminAttendanceAPI({ employee_id: employee.id });
      setRecords(res.data);
    } catch (err) {
      Alert.alert('Error', getApiErrorMessage(err, 'Failed to load attendance'));
    } finally {
      setLoading(false);
    }
  }, [employee?.id]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const openEditModal = (record) => {
    setSelectedRecord(record);
    const checkinIso = record.checkin_time ? new Date(record.checkin_time).toISOString() : null;
    const checkoutIso = record.checkout_time ? new Date(record.checkout_time).toISOString() : null;
    setForm({
      checkin_time: toTimeInput(record.checkin_time),
      checkout_time: toTimeInput(record.checkout_time),
      working_hours: record.working_hours != null
        ? String(record.working_hours)
        : calcWorkingHours(checkinIso, checkoutIso),
      checkin_latitude: coordsToForm(record.checkin_latitude, record.checkin_longitude).latitude,
      checkin_longitude: coordsToForm(record.checkin_latitude, record.checkin_longitude).longitude,
      checkout_latitude: coordsToForm(record.checkout_latitude, record.checkout_longitude).latitude,
      checkout_longitude: coordsToForm(record.checkout_latitude, record.checkout_longitude).longitude,
    });
    setModalVisible(true);
  };

  const updateForm = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if ((field === 'checkin_time' || field === 'checkout_time') && selectedRecord) {
        const checkinIso = buildDateTime(selectedRecord.date, field === 'checkin_time' ? value : next.checkin_time);
        const checkoutIso = buildDateTime(selectedRecord.date, field === 'checkout_time' ? value : next.checkout_time);
        const auto = calcWorkingHours(checkinIso, checkoutIso);
        if (auto) next.working_hours = auto;
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedRecord) return;

    const checkinIso = buildDateTime(selectedRecord.date, form.checkin_time);
    const checkoutIso = buildDateTime(selectedRecord.date, form.checkout_time);

    const payload = {};
    if (form.checkin_time) payload.checkin_time = checkinIso;
    if (form.checkout_time) payload.checkout_time = checkoutIso;
    if (form.working_hours !== '') payload.working_hours = parseFloat(form.working_hours);
    if (form.checkin_latitude !== '') payload.checkin_latitude = parseCoord(form.checkin_latitude);
    if (form.checkin_longitude !== '') payload.checkin_longitude = parseCoord(form.checkin_longitude);
    if (form.checkout_latitude !== '') payload.checkout_latitude = parseCoord(form.checkout_latitude);
    if (form.checkout_longitude !== '') payload.checkout_longitude = parseCoord(form.checkout_longitude);

    setSaving(true);
    try {
      await updateAttendanceAPI(selectedRecord.id, payload);
      Alert.alert('Success', 'Attendance updated successfully');
      setModalVisible(false);
      loadRecords();
    } catch (err) {
      Alert.alert('Error', getApiErrorMessage(err, 'Failed to update attendance'));
    } finally {
      setSaving(false);
    }
  };

  const renderRecord = ({ item }) => {
    const status = item.checkin_time && item.checkout_time ? 'Complete' : 'Incomplete';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.dateText}>{formatDate(item.date)}</Text>
          <View style={[styles.statusBadge, status === 'Complete' ? styles.completeBadge : styles.incompleteBadge]}>
            <Text style={[styles.statusText, status === 'Complete' ? styles.completeText : styles.incompleteText]}>
              {status}
            </Text>
          </View>
        </View>
        <Text style={styles.projectText}>
          {item.project_code} — {item.project_name}
        </Text>
        <View style={styles.timeRow}>
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>Check-in</Text>
            <Text style={styles.timeValue}>{formatTime(item.checkin_time)}</Text>
          </View>
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>Check-out</Text>
            <Text style={styles.timeValue}>{formatTime(item.checkout_time)}</Text>
          </View>
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>Hours</Text>
            <Text style={styles.timeValue}>
              {item.working_hours != null ? `${item.working_hours}h` : '--'}
            </Text>
          </View>
        </View>
        <View style={styles.coordsSection}>
          <Text style={styles.coordsLabel}>Check-in: {formatCoords(item.checkin_latitude, item.checkin_longitude)}</Text>
          <Text style={styles.coordsLabel}>Check-out: {formatCoords(item.checkout_latitude, item.checkout_longitude)}</Text>
        </View>
        <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (!employee) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Employee not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
        <Text style={styles.title}>{employee.name}</Text>
        <Text style={styles.subtitle}>Attendance Records</Text>
      </View>

      <FlatList
        data={records}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderRecord}
        contentContainerStyle={{ paddingBottom: 30 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No attendance records found</Text>
        }
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Attendance</Text>
            <Text style={styles.modalDate}>{formatDate(selectedRecord?.date)}</Text>

            <Text style={styles.inputLabel}>Check-in Time (HH:MM)</Text>
            <TextInput
              style={styles.input}
              placeholder="09:00"
              value={form.checkin_time}
              onChangeText={(t) => updateForm('checkin_time', t)}
            />

            <Text style={styles.inputLabel}>Check-out Time (HH:MM)</Text>
            <TextInput
              style={styles.input}
              placeholder="18:00"
              value={form.checkout_time}
              onChangeText={(t) => updateForm('checkout_time', t)}
            />

            <Text style={styles.inputLabel}>Working Hours</Text>
            <TextInput
              style={styles.input}
              placeholder="8.5"
              keyboardType="decimal-pad"
              value={form.working_hours}
              onChangeText={(t) => updateForm('working_hours', t)}
            />

            <Text style={styles.sectionTitle}>Check-in Location</Text>
            <Text style={styles.inputLabel}>Latitude</Text>
            <TextInput
              style={styles.input}
              placeholder="22.31123"
              keyboardType="decimal-pad"
              value={form.checkin_latitude}
              onChangeText={(t) => updateForm('checkin_latitude', t)}
            />
            <Text style={styles.inputLabel}>Longitude</Text>
            <TextInput
              style={styles.input}
              placeholder="73.23250"
              keyboardType="decimal-pad"
              value={form.checkin_longitude}
              onChangeText={(t) => updateForm('checkin_longitude', t)}
            />

            <Text style={styles.sectionTitle}>Check-out Location</Text>
            <Text style={styles.inputLabel}>Latitude</Text>
            <TextInput
              style={styles.input}
              placeholder="22.31123"
              keyboardType="decimal-pad"
              value={form.checkout_latitude}
              onChangeText={(t) => updateForm('checkout_latitude', t)}
            />
            <Text style={styles.inputLabel}>Longitude</Text>
            <TextInput
              style={styles.input}
              placeholder="73.23250"
              keyboardType="decimal-pad"
              value={form.checkout_longitude}
              onChangeText={(t) => updateForm('checkout_longitude', t)}
            />

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>Save</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2ff', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2ff' },
  header: { marginTop: 50, marginBottom: 16 },
  back: { color: '#1a237e', fontSize: 16, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a237e' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  card: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 14, marginBottom: 10, elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6,
  },
  dateText: { fontSize: 15, fontWeight: 'bold', color: '#1a237e' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  completeBadge: { backgroundColor: '#e8f5e9' },
  incompleteBadge: { backgroundColor: '#fff3e0' },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  completeText: { color: '#2e7d32' },
  incompleteText: { color: '#e65100' },
  projectText: { fontSize: 13, color: '#666', marginBottom: 10 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  timeBlock: { alignItems: 'center', flex: 1 },
  timeLabel: { fontSize: 11, color: '#888' },
  timeValue: { fontSize: 13, fontWeight: 'bold', color: '#333', marginTop: 2 },
  coordsSection: { marginBottom: 12, gap: 4 },
  coordsLabel: { fontSize: 12, color: '#555' },
  editBtn: {
    backgroundColor: '#e8eaf6', padding: 10,
    borderRadius: 8, alignItems: 'center',
  },
  editBtnText: { color: '#1a237e', fontWeight: 'bold', fontSize: 13 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },
  errorText: { fontSize: 16, color: '#666', marginBottom: 16 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', padding: 20,
  },
  modalScroll: { flexGrow: 1, justifyContent: 'center' },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 24, width: '100%',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a237e', marginBottom: 4 },
  modalDate: { fontSize: 13, color: '#888', marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#1a237e', marginBottom: 8, marginTop: 4 },
  inputLabel: { fontSize: 13, color: '#1a237e', fontWeight: 'bold', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    padding: 12, fontSize: 14, marginBottom: 12, color: '#333',
  },
  saveBtn: {
    backgroundColor: '#1a237e', padding: 14,
    borderRadius: 10, alignItems: 'center', marginBottom: 8,
  },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  cancelBtn: {
    backgroundColor: '#f5f5f5', padding: 14,
    borderRadius: 10, alignItems: 'center',
  },
  cancelBtnText: { color: '#666', fontWeight: 'bold' },
});
