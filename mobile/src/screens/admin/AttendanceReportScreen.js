import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { getAllEmployeesAPI } from '../../services/api';
import { getApiErrorMessage } from '../../utils/apiError';

export default function AttendanceReportScreen({ navigation }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const res = await getAllEmployeesAPI();
      const staff = res.data.filter((e) => e.role === 'employee');
      setEmployees(staff);
    } catch (err) {
      Alert.alert('Error', getApiErrorMessage(err, 'Failed to load employees'));
    } finally {
      setLoading(false);
    }
  };

  const renderEmployee = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('AdminEmployeeReport', { employee: item })}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.empName}>{item.name}</Text>
        <Text style={styles.empMobile}>{item.mobile_number}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
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
        <Text style={styles.title}>Attendance Reports</Text>
        <Text style={styles.subtitle}>Select an employee to view & export their report</Text>
      </View>

      <FlatList
        data={employees}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderEmployee}
        contentContainerStyle={{ paddingBottom: 30 }}
        ListHeaderComponent={
          <Text style={styles.countText}>{employees.length} employees</Text>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No employees found</Text>
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
  subtitle: { fontSize: 13, color: '#666', marginTop: 4 },
  countText: { fontSize: 13, color: '#666', marginBottom: 12 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', marginBottom: 10, elevation: 3,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#1a237e', justifyContent: 'center', alignItems: 'center',
    marginRight: 14,
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cardBody: { flex: 1 },
  empName: { fontSize: 16, fontWeight: 'bold', color: '#1a237e' },
  empMobile: { fontSize: 13, color: '#666', marginTop: 2 },
  arrow: { fontSize: 24, color: '#1a237e' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },
});
