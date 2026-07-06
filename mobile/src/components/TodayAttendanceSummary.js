import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function TodayAttendanceSummary({ summary, onPressPresent, onPressAbsent }) {
  const present = summary?.present_count ?? 0;
  const absent = summary?.absent_count ?? 0;
  const total = summary?.total_employees ?? 0;

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>{"Today's Attendance"}</Text>
      <Text style={styles.sub}>
        {present} of {total} employees checked in
      </Text>
      <View style={styles.row}>
        <TouchableOpacity style={styles.presentCard} onPress={onPressPresent}>
          <Text style={styles.number}>{present}</Text>
          <Text style={styles.label}>Present</Text>
          <Text style={styles.tap}>Tap for details ›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.absentCard} onPress={onPressAbsent}>
          <Text style={styles.number}>{absent}</Text>
          <Text style={styles.label}>Remaining</Text>
          <Text style={styles.tap}>Tap for details ›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 24 },
  heading: { fontSize: 16, fontWeight: 'bold', color: '#1a237e', marginBottom: 4 },
  sub: { fontSize: 12, color: '#666', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10 },
  presentCard: {
    flex: 1, backgroundColor: '#2e7d32', borderRadius: 16,
    padding: 16, alignItems: 'center',
  },
  absentCard: {
    flex: 1, backgroundColor: '#c62828', borderRadius: 16,
    padding: 16, alignItems: 'center',
  },
  number: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  label: { fontSize: 13, color: '#fff', marginTop: 4, fontWeight: '600' },
  tap: { fontSize: 10, color: 'rgba(255,255,255,0.85)', marginTop: 6 },
});
