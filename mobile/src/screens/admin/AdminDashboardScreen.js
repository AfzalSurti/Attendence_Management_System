import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator
} from 'react-native';
import { getUser, clearStorage } from '../../utils/storage';
import { getOverviewAPI } from '../../services/api';

export default function AdminDashboardScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const u = await getUser();
    setUser(u);
    try {
      const res = await getOverviewAPI();
      setOverview(res.data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await clearStorage();
    navigation.replace('Login');
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#1a237e" />
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Admin Panel 🛡️</Text>
          <Text style={styles.name}>{user?.name}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{overview?.total_employees || 0}</Text>
          <Text style={styles.statLabel}>Employees</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{overview?.total_projects || 0}</Text>
          <Text style={styles.statLabel}>Projects</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{overview?.today_attendance || 0}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
      </View>

      {/* Menu */}
      <Text style={styles.sectionTitle}>Reports & Management</Text>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate('AttendanceReport')}
      >
        <Text style={styles.menuIcon}>📊</Text>
        <View>
          <Text style={styles.menuTitle}>Attendance Reports</Text>
          <Text style={styles.menuSub}>Filter, view and export reports</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate('Holidays')}
      >
        <Text style={styles.menuIcon}>🗓️</Text>
        <View>
          <Text style={styles.menuTitle}>Holiday Management</Text>
          <Text style={styles.menuSub}>Add, view and delete holidays</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2ff', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 50, marginBottom: 24
  },
  greeting: { fontSize: 14, color: '#666' },
  name: { fontSize: 22, fontWeight: 'bold', color: '#1a237e' },
  logoutBtn: { backgroundColor: '#ffebee', padding: 8, borderRadius: 8 },
  logoutText: { color: '#c62828', fontWeight: 'bold', fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: '#1a237e', borderRadius: 16,
    padding: 16, alignItems: 'center'
  },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  statLabel: { fontSize: 11, color: '#c5cae9', marginTop: 4 },
  sectionTitle: {
    fontSize: 16, fontWeight: 'bold', color: '#1a237e', marginBottom: 12
  },
  menuItem: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', marginBottom: 12, elevation: 3
  },
  menuIcon: { fontSize: 28, marginRight: 14 },
  menuTitle: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  menuSub: { fontSize: 12, color: '#888', marginTop: 2 },
  arrow: { fontSize: 24, color: '#1a237e', marginLeft: 'auto' },
});