import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { getTodayAttendanceSummaryAPI } from '../../services/api';

const formatTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

export default function TodayAttendanceScreen({ navigation, route }) {
  const listType = route.params?.type || 'present';
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    loadData();
  }, [listType]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getTodayAttendanceSummaryAPI();
      setDate(res.data.date);
      setEmployees(listType === 'present' ? res.data.present : res.data.absent);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const title = listType === 'present' ? 'Present Today' : 'Absent Today';
  const subtitle = listType === 'present'
    ? 'Employees who marked attendance today'
    : 'Employees who have not marked attendance yet';

  const renderPresent = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.mobile}>{item.mobile_number}</Text>
      <Text style={styles.detail}>
        {item.project_code} — {item.project_name}
      </Text>
      <View style={styles.row}>
        <Text style={styles.badgeGreen}>In: {formatTime(item.checkin_time)}</Text>
        <Text style={item.checkout_time ? styles.badgeBlue : styles.badgeGray}>
          Out: {formatTime(item.checkout_time)}
        </Text>
      </View>
      {item.working_hours != null && (
        <Text style={styles.hours}>{item.working_hours.toFixed(1)} hrs</Text>
      )}
    </View>
  );

  const renderAbsent = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.mobile}>{item.mobile_number}</Text>
      <Text style={styles.absentTag}>Not checked in</Text>
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
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.date}>{date} · {employees.length} employee{employees.length !== 1 ? 's' : ''}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <FlatList
        data={employees}
        keyExtractor={(item) => item.employee_id.toString()}
        renderItem={listType === 'present' ? renderPresent : renderAbsent}
        contentContainerStyle={{ paddingBottom: 30 }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {listType === 'present' ? 'No one has checked in yet today.' : 'Everyone has marked attendance today.'}
          </Text>
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
  date: { fontSize: 13, color: '#666', marginTop: 4 },
  subtitle: { fontSize: 12, color: '#888', marginTop: 4 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    marginBottom: 10, elevation: 2,
  },
  name: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  mobile: { fontSize: 13, color: '#888', marginTop: 2 },
  detail: { fontSize: 12, color: '#1a237e', marginTop: 6 },
  row: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  badgeGreen: {
    backgroundColor: '#e8f5e9', color: '#2e7d32',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, fontSize: 11, fontWeight: '600',
  },
  badgeBlue: {
    backgroundColor: '#e3f2fd', color: '#1565c0',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, fontSize: 11, fontWeight: '600',
  },
  badgeGray: {
    backgroundColor: '#f5f5f5', color: '#888',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, fontSize: 11, fontWeight: '600',
  },
  hours: { fontSize: 12, color: '#666', marginTop: 6 },
  absentTag: {
    marginTop: 8, fontSize: 12, color: '#c62828',
    backgroundColor: '#ffebee', alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, fontWeight: '600',
  },
  empty: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },
});
