import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator
} from 'react-native';
import { getUser, clearStorage } from '../../utils/storage';
import { getOverviewAPI, getTodayAttendanceSummaryAPI } from '../../services/api';
import TodayAttendanceSummary from '../../components/TodayAttendanceSummary';
import { isWeb } from '../../utils/platform';

export default function AdminDashboardScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [overview, setOverview] = useState(null);
  const [todaySummary, setTodaySummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const u = await getUser();
    setUser(u);
    try {
      const [overviewRes, todayRes] = await Promise.all([
        getOverviewAPI(),
        getTodayAttendanceSummaryAPI(),
      ]);
      setOverview(overviewRes.data);
      setTodaySummary(todayRes.data);
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
      <View style={[styles.content, isWeb && styles.webContent]}>
        <View style={[styles.heroCard, isWeb && styles.heroCardWeb]}>
          <View>
            <Text style={styles.greeting}>Admin workspace</Text>
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={styles.heroSub}>
              Monitor attendance, manage staff, and review project activity from one place.
            </Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.statsRow, isWeb && styles.statsRowWeb]}>
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <Text style={styles.statNumber}>{overview?.total_employees || 0}</Text>
            <Text style={styles.statLabel}>Employees</Text>
          </View>
          <View style={[styles.statCard, styles.statCardSecondary]}>
            <Text style={styles.statNumber}>{overview?.total_projects || 0}</Text>
            <Text style={styles.statLabel}>Projects</Text>
          </View>
          <View style={[styles.statCard, styles.statCardAccent]}>
            <Text style={styles.statNumber}>{overview?.today_attendance || 0}</Text>
            <Text style={styles.statLabel}>Checked In</Text>
          </View>
        </View>

        <TodayAttendanceSummary
          summary={todaySummary}
          onPressPresent={() => navigation.navigate('TodayAttendance', { type: 'present' })}
          onPressAbsent={() => navigation.navigate('TodayAttendance', { type: 'absent' })}
        />

        <Text style={styles.sectionTitle}>Reports & Management</Text>

        <View style={[styles.menuGrid, isWeb && styles.menuGridWeb]}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('AttendanceReport')}
          >
            <Text style={styles.menuIcon}>📊</Text>
            <View style={styles.menuBody}>
              <Text style={styles.menuTitle}>Attendance Reports</Text>
              <Text style={styles.menuSub}>Filter, view and export reports</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('ManageEmployees')}
          >
            <Text style={styles.menuIcon}>👥</Text>
            <View style={styles.menuBody}>
              <Text style={styles.menuTitle}>Manage Employees</Text>
              <Text style={styles.menuSub}>Create, edit, assign projects to employees</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('ManageProjects')}
          >
            <Text style={styles.menuIcon}>📁</Text>
            <View style={styles.menuBody}>
              <Text style={styles.menuTitle}>Manage Projects</Text>
              <Text style={styles.menuSub}>Create, edit and delete projects</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Holidays')}
          >
            <Text style={styles.menuIcon}>🗓️</Text>
            <View style={styles.menuBody}>
              <Text style={styles.menuTitle}>Holiday Management</Text>
              <Text style={styles.menuSub}>Add, view and delete holidays</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8faff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, paddingTop: 36, paddingBottom: 36 },
  webContent: { paddingHorizontal: 32, paddingTop: 32 },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#312e81',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
  },
  heroCardWeb: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  greeting: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  name: { fontSize: 32, fontWeight: '800', color: '#1e1b4b', marginTop: 6 },
  heroSub: { fontSize: 14, color: '#475569', marginTop: 10, maxWidth: 540, lineHeight: 21 },
  logoutBtn: { backgroundColor: '#ffebee', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  logoutText: { color: '#c62828', fontWeight: 'bold', fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statsRowWeb: { gap: 16 },
  statCard: {
    flex: 1,
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  statCardPrimary: { backgroundColor: '#312e81' },
  statCardSecondary: { backgroundColor: '#4338ca' },
  statCardAccent: { backgroundColor: '#1d4ed8' },
  statNumber: { fontSize: 34, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 12, color: '#dbeafe', marginTop: 6, fontWeight: '600' },
  sectionTitle: {
    fontSize: 18, fontWeight: 'bold', color: '#1e1b4b', marginBottom: 12
  },
  menuGrid: { gap: 12 },
  menuGridWeb: { gap: 16 },
  menuItem: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#312e81',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
  },
  menuIcon: { fontSize: 28, marginRight: 14 },
  menuBody: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
  menuSub: { fontSize: 13, color: '#64748b', marginTop: 4, lineHeight: 19 },
  arrow: { fontSize: 24, color: '#4338ca', marginLeft: 'auto' },
});