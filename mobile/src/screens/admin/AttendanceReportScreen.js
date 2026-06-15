import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, Alert
} from 'react-native';
import {
  getAdminAttendanceAPI, get30DayReportAPI,
  getAllEmployeesAPI, getAllProjectsAPI
} from '../../services/api';

export default function AttendanceReportScreen({ navigation }) {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    employee_id: '',
    project_id: '',
    date_from: '',
    date_to: '',
  });
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [empRes, projRes, recRes] = await Promise.all([
        getAllEmployeesAPI(),
        getAllProjectsAPI(),
        getAdminAttendanceAPI({})
      ]);
      setEmployees(empRes.data);
      setProjects(projRes.data);
      setRecords(recRes.data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.employee_id) params.employee_id = parseInt(filters.employee_id);
      if (filters.project_id) params.project_id = parseInt(filters.project_id);
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      const res = await getAdminAttendanceAPI(params);
      setRecords(res.data);
      setActiveFilter('filtered');
    } catch (err) {
      Alert.alert('Error', 'Failed to filter');
    } finally {
      setLoading(false);
    }
  };

  const handle30Days = async () => {
    setLoading(true);
    try {
      const res = await get30DayReportAPI();
      setRecords(res.data);
      setActiveFilter('30days');
    } catch (err) {
      Alert.alert('Error', 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleAll = async () => {
    setLoading(true);
    try {
      const res = await getAdminAttendanceAPI({});
      setRecords(res.data);
      setActiveFilter('all');
    } catch (err) {
      Alert.alert('Error', 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (datetime) => {
    if (!datetime) return '--';
    return new Date(datetime).toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatDate = (date) => {
    if (!date) return '--';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const renderRecord = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.empName}>{item.employee_name}</Text>
        <Text style={styles.date}>{formatDate(item.date)}</Text>
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
            {item.working_hours ? `${item.working_hours}h` : '--'}
          </Text>
        </View>
      </View>
    </View>
  );

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#1a237e" />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Attendance Reports</Text>
      </View>

      <FlatList
        data={records}
        keyExtractor={(item, index) => String(item.id ?? index)}
        renderItem={renderRecord}
        ListHeaderComponent={
          <>
            <View style={styles.quickFilters}>
              <TouchableOpacity
                style={[styles.quickBtn, activeFilter === 'all' && styles.quickBtnActive]}
                onPress={handleAll}
              >
                <Text style={[styles.quickBtnText, activeFilter === 'all' && styles.quickBtnTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickBtn, activeFilter === '30days' && styles.quickBtnActive]}
                onPress={handle30Days}
              >
                <Text style={[styles.quickBtnText, activeFilter === '30days' && styles.quickBtnTextActive]}>
                  Last 30 Days
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.filterCard}>
              <Text style={styles.filterTitle}>Filter Records</Text>
              <TextInput
                style={styles.input}
                placeholder="Employee ID"
                keyboardType="number-pad"
                value={filters.employee_id}
                onChangeText={(t) => setFilters({ ...filters, employee_id: t })}
              />
              <TextInput
                style={styles.input}
                placeholder="Project ID"
                keyboardType="number-pad"
                value={filters.project_id}
                onChangeText={(t) => setFilters({ ...filters, project_id: t })}
              />
              <TextInput
                style={styles.input}
                placeholder="Date From (YYYY-MM-DD)"
                value={filters.date_from}
                onChangeText={(t) => setFilters({ ...filters, date_from: t })}
              />
              <TextInput
                style={styles.input}
                placeholder="Date To (YYYY-MM-DD)"
                value={filters.date_to}
                onChangeText={(t) => setFilters({ ...filters, date_to: t })}
              />
              <TouchableOpacity style={styles.filterBtn} onPress={handleFilter}>
                <Text style={styles.filterBtnText}>Apply Filter</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.countText}>{records.length} records found</Text>
          </>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No records found</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2ff', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginTop: 50, marginBottom: 16 },
  back: { color: '#1a237e', fontSize: 16, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a237e' },
  quickFilters: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  quickBtn: {
    flex: 1, padding: 10, borderRadius: 10,
    backgroundColor: '#fff', alignItems: 'center', elevation: 2
  },
  quickBtnActive: { backgroundColor: '#1a237e' },
  quickBtnText: { color: '#1a237e', fontWeight: 'bold', fontSize: 13 },
  quickBtnTextActive: { color: '#fff' },
  filterCard: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 16, marginBottom: 16, elevation: 3
  },
  filterTitle: {
    fontSize: 15, fontWeight: 'bold',
    color: '#1a237e', marginBottom: 12
  },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    padding: 10, fontSize: 13, marginBottom: 10, color: '#333'
  },
  filterBtn: {
    backgroundColor: '#1a237e', padding: 12,
    borderRadius: 10, alignItems: 'center'
  },
  filterBtnText: { color: '#fff', fontWeight: 'bold' },
  countText: {
    fontSize: 13, color: '#666',
    marginBottom: 10, textAlign: 'right'
  },
  card: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 14, marginBottom: 10, elevation: 3
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: 4
  },
  empName: { fontSize: 15, fontWeight: 'bold', color: '#1a237e' },
  date: { fontSize: 12, color: '#888' },
  projectText: { fontSize: 12, color: '#666', marginBottom: 10 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  timeBlock: { alignItems: 'center' },
  timeLabel: { fontSize: 11, color: '#888' },
  timeValue: { fontSize: 13, fontWeight: 'bold', color: '#333', marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },
});