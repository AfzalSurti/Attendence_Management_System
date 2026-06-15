import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, Alert, ScrollView,
} from 'react-native';
import { getAdminAttendanceAPI } from '../../services/api';
import { getApiErrorMessage } from '../../utils/apiError';
import { formatCoords } from '../../utils/coordinates';
import { getDateRange, PRESET_LABELS } from '../../utils/dateRanges';
import { exportAttendanceExcel, exportAttendancePdf } from '../../utils/reportExport';

const formatTime = (datetime) => {
  if (!datetime) return '--';
  return new Date(datetime).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit',
  });
};

const formatDate = (date) => {
  if (!date) return '--';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

export default function AdminEmployeeReportScreen({ navigation, route }) {
  const employee = route.params?.employee;
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);
  const [activePreset, setActivePreset] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

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

  const applyCustomRange = () => {
    if (!customFrom && !customTo) {
      Alert.alert('Error', 'Enter at least one date (YYYY-MM-DD)');
      return;
    }
    setActivePreset('custom');
    loadRecords('custom', customFrom, customTo);
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
        <Text style={styles.date}>{formatDate(item.date)}</Text>
        <Text style={styles.hours}>
          {item.working_hours != null ? `${item.working_hours}h` : '--'}
        </Text>
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
      </View>
      <View style={styles.coordsRow}>
        <Text style={styles.coordsText}>
          In: {formatCoords(item.checkin_latitude, item.checkin_longitude)}
        </Text>
        <Text style={styles.coordsText}>
          Out: {formatCoords(item.checkout_latitude, item.checkout_longitude)}
        </Text>
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

      <View style={styles.customCard}>
        <Text style={styles.customTitle}>Custom Date Range</Text>
        <TextInput
          style={styles.input}
          placeholder="From (YYYY-MM-DD)"
          value={customFrom}
          onChangeText={setCustomFrom}
        />
        <TextInput
          style={styles.input}
          placeholder="To (YYYY-MM-DD)"
          value={customTo}
          onChangeText={setCustomTo}
        />
        <TouchableOpacity style={styles.applyBtn} onPress={applyCustomRange}>
          <Text style={styles.applyBtnText}>Apply Custom Range</Text>
        </TouchableOpacity>
      </View>

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
  customCard: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 14, marginBottom: 12, elevation: 3,
  },
  customTitle: { fontSize: 14, fontWeight: 'bold', color: '#1a237e', marginBottom: 10 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    padding: 10, fontSize: 13, marginBottom: 8, color: '#333',
  },
  applyBtn: {
    backgroundColor: '#3949ab', padding: 10,
    borderRadius: 10, alignItems: 'center',
  },
  applyBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
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
    padding: 14, marginBottom: 10, elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4,
  },
  date: { fontSize: 15, fontWeight: 'bold', color: '#1a237e' },
  hours: { fontSize: 13, fontWeight: 'bold', color: '#2e7d32' },
  projectText: { fontSize: 12, color: '#666', marginBottom: 10 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  timeBlock: { alignItems: 'center' },
  timeLabel: { fontSize: 11, color: '#888' },
  timeValue: { fontSize: 13, fontWeight: 'bold', color: '#333', marginTop: 2 },
  coordsRow: { gap: 4 },
  coordsText: { fontSize: 11, color: '#555' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },
});
