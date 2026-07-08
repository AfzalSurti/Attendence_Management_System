import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { isWeb } from '../utils/platform';

export default function TodayAttendanceSummary({ summary, onPressPresent, onPressAbsent }) {
  const present = summary?.present_count ?? 0;
  const absent = summary?.absent_count ?? 0;
  const total = summary?.total_employees ?? 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.heading}>{"Today's Attendance"}</Text>
          <Text style={styles.sub}>
            {present} of {total} employees checked in
          </Text>
        </View>
        <View style={styles.totalPill}>
          <Text style={styles.totalPillText}>{total} Total</Text>
        </View>
      </View>
      <View style={[styles.row, isWeb && styles.rowWeb]}>
        <TouchableOpacity style={[styles.card, styles.presentCard]} onPress={onPressPresent}>
          <Text style={styles.number}>{present}</Text>
          <Text style={styles.label}>Present</Text>
          <Text style={styles.tap}>Open employee list ›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.card, styles.absentCard]} onPress={onPressAbsent}>
          <Text style={styles.number}>{absent}</Text>
          <Text style={styles.label}>Remaining</Text>
          <Text style={styles.tap}>Open employee list ›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#312e81',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  heading: { fontSize: 18, fontWeight: 'bold', color: '#1e1b4b', marginBottom: 4 },
  sub: { fontSize: 13, color: '#64748b' },
  totalPill: {
    backgroundColor: '#eef2ff',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  totalPillText: { color: '#3730a3', fontWeight: '700', fontSize: 12 },
  row: { flexDirection: 'row', gap: 12 },
  rowWeb: { gap: 16 },
  card: {
    flex: 1,
    borderRadius: 22,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    minHeight: 150,
    justifyContent: 'center',
  },
  presentCard: { backgroundColor: '#15803d' },
  absentCard: { backgroundColor: '#dc2626' },
  number: { fontSize: 40, fontWeight: '800', color: '#fff' },
  label: { fontSize: 15, color: '#fff', marginTop: 6, fontWeight: '700' },
  tap: { fontSize: 12, color: 'rgba(255,255,255,0.88)', marginTop: 10 },
});
