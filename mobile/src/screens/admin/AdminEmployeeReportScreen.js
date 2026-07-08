import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, Modal,
} from 'react-native';
import DateField from '../../components/DateField';
import { getAdminAttendanceAPI } from '../../services/api';
import { getApiErrorMessage } from '../../utils/apiError';
import { formatCoords } from '../../utils/coordinates';
import { formatDisplayDate, formatDisplayTime, formatHours } from '../../utils/display';
import AttendanceSelfies from '../../components/AttendanceSelfies';
import { getDateRange, PRESET_LABELS } from '../../utils/dateRanges';
import { exportAttendanceExcel, exportAttendancePdf } from '../../utils/reportExport';

export default function AdminEmployeeReportScreen({ navigation, route }) {
  const employee = route.params?.employee;
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);
  const [activePreset, setActivePreset] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');

  const getRangeLabel = useCallback(() => {
    if (activePreset === 'custom') {
      if (customFrom && customTo) return `${customFrom} to ${customTo}`;
      if (customFrom) return `From ${customFrom}`;
      if (customTo) return `Until ${customTo}`;
      return 'Custom Range';
    }
    return PRESET_LABELS[activePreset] || 'All Time';
  }, [activePreset, customFrom, customTo]);

  const buildParams = useCallback((preset, from, to) => {
    const params = { employee_id: employee.id };
    if (preset === 'custom') {
      if (from) params.date_from = from;
      if (to) params.date_to = to;
    } else if (preset !== 'all') {
      const range = getDateRange(preset);
      params.date_from = range.date_from;
      params.date_to = range.date_to;
    }
    return params;
  }, [employee?.id]);

  const loadRecords = useCallback(async (preset = activePreset, from = customFrom, to = customTo) => {
    if (!employee?.id) return;
    setLoading(true);
    try {
      const res = await getAdminAttendanceAPI(buildParams(preset, from, to));
      setRecords(res.data);
    } catch (err) {
      Alert.alert('Error', getApiErrorMessage(err, 'Failed to load attendance'));
    } finally {
      setLoading(false);
    }
  }, [employee?.id, activePreset, customFrom, customTo, buildParams]);

  useEffect(() => {
    loadRecords(activePreset, customFrom, customTo);
  }, [employee?.id, activePreset]);

  const selectPreset = (preset) => {
    setActivePreset(preset);
  };

  const openCustomModal = () => {
    setDraftFrom(customFrom);
    setDraftTo(customTo);
    setCustomModalVisible(true);
  };

  const applyCustomModalRange = () => {
    if (!draftFrom && !draftTo) {
      Alert.alert('Error', 'Select at least one date');
      return;
    }
    if (draftFrom && draftTo && new Date(draftFrom) > new Date(draftTo)) {
      Alert.alert('Error', 'From date cannot be after To date');
      return;
    }
    setCustomFrom(draftFrom);
    setCustomTo(draftTo);
    setCustomModalVisible(false);
    setActivePreset('custom');
    loadRecords('custom', draftFrom, draftTo);
  };

  const handleExport = async (type) => {
    if (records.length === 0) {
      Alert.alert('No Data', 'No attendance records to export');
      return;
    }
    setExporting(type);
    try {
      const rangeLabel = getRangeLabel();
      if (type === 'pdf') {
        await exportAttendancePdf(employee.name, records, rangeLabel);
      } else {
        await exportAttendanceExcel(employee.name, records, rangeLabel);
      }
    } catch (err) {
      Alert.alert('Export Failed', err.message || 'Could not export report');
    } finally {
      setExporting(null);
    }
  };

  const renderRecord = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.date}>{formatDisplayDate(item.date)}</Text>
          <Text style={styles.projectText}>
            {item.project_code} — {item.project_name}
          </Text>
        </View>
        <Text style={styles.hours}>{formatHours(item.working_hours)}</Text>
      </View>
      <View style={styles.metaGrid}>
        <View style={styles.metaCard}>
          <Text style={styles.timeLabel}>Check-in</Text>
          <Text style={styles.timeValue}>{formatDisplayTime(item.checkin_time)}</Text>
          <Text style={styles.coordsText}>
            {formatCoords(item.checkin_latitude, item.checkin_longitude)}
          </Text>
        </View>
        <View style={styles.metaCard}>
          <Text style={styles.timeLabel}>Check-out</Text>
          <Text style={styles.timeValue}>{formatDisplayTime(item.checkout_time)}</Text>
          <Text style={styles.coordsText}>
            {formatCoords(item.checkout_latitude, item.checkout_longitude)}
          </Text>
        </View>
      </View>
      <View style={styles.selfieSection}>
        <Text style={styles.sectionCaption}>Selfies</Text>
        <AttendanceSelfies
          checkinUrl={item.checkin_selfie_url}
          checkoutUrl={item.checkout_selfie_url}
        />
      </View>
    </View>
  );

  if (!employee) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Employee not found</Text>
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
        <Text style={styles.subtitle}>{employee.mobile_number}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
        {['all', '7days', '15days', '30days'].map((preset) => (
          <TouchableOpacity
            key={preset}
            style={[styles.presetBtn, activePreset === preset && styles.presetBtnActive]}
            onPress={() => selectPreset(preset)}
          >
            <Text style={[styles.presetText, activePreset === preset && styles.presetTextActive]}>
              {PRESET_LABELS[preset]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.customOpenBtn} onPress={openCustomModal}>
        <Text style={styles.customOpenBtnText}>Select Custom Date Range</Text>
      </TouchableOpacity>

      <View style={styles.exportRow}>
        <TouchableOpacity
          style={styles.exportBtn}
          onPress={() => handleExport('pdf')}
          disabled={!!exporting}
        >
          {exporting === 'pdf'
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.exportBtnText}>📄 Download PDF</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.exportBtn, styles.excelBtn]}
          onPress={() => handleExport('excel')}
          disabled={!!exporting}
        >
          {exporting === 'excel'
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.exportBtnText}>📊 Download Excel</Text>}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1a237e" />
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderRecord}
          contentContainerStyle={{ paddingBottom: 30 }}
          ListHeaderComponent={
            <Text style={styles.countText}>
              {records.length} records · {getRangeLabel()}
            </Text>
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No attendance records for this period</Text>
          }
        />
      )}

      <Modal visible={customModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.customTitle}>Custom Date Range</Text>
            <DateField
              value={draftFrom}
              onChange={setDraftFrom}
              placeholder="Select From Date"
              style={styles.dateField}
            />
            <DateField
              value={draftTo}
              onChange={setDraftTo}
              placeholder="Select To Date"
              style={styles.dateField}
            />

            <TouchableOpacity style={styles.applyBtn} onPress={applyCustomModalRange}>
              <Text style={styles.applyBtnText}>Apply Custom Range</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setCustomModalVisible(false)}
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
  header: { marginTop: 50, marginBottom: 12 },
  back: { color: '#1a237e', fontSize: 16, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a237e' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 2 },
  presetScroll: { marginBottom: 12, maxHeight: 44 },
  presetBtn: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
    backgroundColor: '#fff', marginRight: 8, elevation: 2,
  },
  presetBtnActive: { backgroundColor: '#1a237e' },
  presetText: { fontSize: 12, fontWeight: 'bold', color: '#1a237e' },
  presetTextActive: { color: '#fff' },
  customOpenBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c5cae9',
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  customOpenBtnText: { color: '#1a237e', fontWeight: '700', fontSize: 13 },
  customTitle: { fontSize: 14, fontWeight: 'bold', color: '#1a237e', marginBottom: 10 },
  dateField: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    padding: 10, fontSize: 13, marginBottom: 8, color: '#333',
  },
  dateFieldValue: { color: '#333', fontSize: 13 },
  dateFieldPlaceholder: { color: '#999', fontSize: 13 },
  applyBtn: {
    backgroundColor: '#3949ab', padding: 10,
    borderRadius: 10, alignItems: 'center',
  },
  applyBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  cancelBtn: {
    marginTop: 8,
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#666', fontWeight: '700', fontSize: 13 },
  exportRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  exportBtn: {
    flex: 1, backgroundColor: '#c62828', padding: 12,
    borderRadius: 10, alignItems: 'center',
  },
  excelBtn: { backgroundColor: '#2e7d32' },
  exportBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  countText: { fontSize: 13, color: '#666', marginBottom: 10, textAlign: 'right' },
  card: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 16, marginBottom: 12, elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, gap: 12,
  },
  date: { fontSize: 15, fontWeight: 'bold', color: '#1a237e' },
  hours: {
    fontSize: 12, fontWeight: '700', color: '#2e7d32',
    backgroundColor: '#e8f5e9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    alignSelf: 'flex-start',
  },
  projectText: { fontSize: 12, color: '#666', marginTop: 4 },
  metaGrid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  metaCard: {
    flex: 1,
    backgroundColor: '#f8faff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  timeLabel: { fontSize: 11, color: '#888' },
  timeValue: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 4 },
  coordsText: { fontSize: 11, color: '#555', marginTop: 6, lineHeight: 16 },
  selfieSection: {
    borderTopWidth: 1,
    borderTopColor: '#eef2ff',
    paddingTop: 12,
  },
  sectionCaption: { fontSize: 12, color: '#667085', fontWeight: '700', marginBottom: 2 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },
});
