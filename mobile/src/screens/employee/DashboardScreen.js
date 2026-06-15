import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView
} from 'react-native';
import { getUser, clearStorage } from '../../utils/storage';
import { getTodayAttendanceAPI } from '../../services/api';
import { formatCoords } from '../../utils/coordinates';
import AttendanceSelfies from '../../components/AttendanceSelfies';

export default function DashboardScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const u = await getUser();
    setUser(u);
    try {
      const res = await getTodayAttendanceAPI();
      setTodayAttendance(res.data);
    } catch (err) {
      setTodayAttendance(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await clearStorage();
    navigation.replace('Login');
  };

  const formatTime = (datetime) => {
    if (!datetime) return '--';
    return new Date(datetime).toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit'
    });
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
          <Text style={styles.greeting}>Hello 👋</Text>
          <Text style={styles.name}>{user?.name}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Today Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Attendance</Text>
        {todayAttendance ? (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Check-in</Text>
              <Text style={styles.value}>{formatTime(todayAttendance.checkin_time)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Check-out</Text>
              <Text style={styles.value}>{formatTime(todayAttendance.checkout_time)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Working Hours</Text>
              <Text style={styles.value}>
                {todayAttendance.working_hours ? `${todayAttendance.working_hours} hrs` : '--'}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Check-in Location</Text>
              <Text style={styles.value}>
                {formatCoords(todayAttendance.checkin_latitude, todayAttendance.checkin_longitude)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Check-out Location</Text>
              <Text style={styles.value}>
                {formatCoords(todayAttendance.checkout_latitude, todayAttendance.checkout_longitude)}
              </Text>
            </View>
            <AttendanceSelfies
              checkinUrl={todayAttendance.checkin_selfie_url}
              checkoutUrl={todayAttendance.checkout_selfie_url}
            />
          </>
        ) : (
          <Text style={styles.noAttendance}>No attendance marked today</Text>
        )}
      </View>

      {/* Buttons */}
      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => navigation.navigate('Attendance')}
      >
        <Text style={styles.primaryBtnText}>
          {todayAttendance?.checkin_time && !todayAttendance?.checkout_time
            ? '📍 Mark Check-out'
            : todayAttendance?.checkout_time
            ? '✅ Attendance Done'
            : '📍 Mark Attendance'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => navigation.navigate('History')}
      >
        <Text style={styles.secondaryBtnText}>📋 View History</Text>
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
  card: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 20, marginBottom: 16, elevation: 3
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a237e', marginBottom: 14 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#eee'
  },
  label: { fontSize: 14, color: '#666' },
  value: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  noAttendance: { fontSize: 14, color: '#999', textAlign: 'center', paddingVertical: 10 },
  primaryBtn: {
    backgroundColor: '#1a237e', padding: 16,
    borderRadius: 12, alignItems: 'center', marginBottom: 12
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  secondaryBtn: {
    backgroundColor: '#fff', padding: 16,
    borderRadius: 12, alignItems: 'center', elevation: 2
  },
  secondaryBtnText: { color: '#1a237e', fontSize: 16, fontWeight: 'bold' },
});