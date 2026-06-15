import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, TouchableOpacity
} from 'react-native';
import { getMyHistoryAPI } from '../../services/api';
import { formatCoords } from '../../utils/coordinates';

export default function HistoryScreen({ navigation }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await getMyHistoryAPI();
      setHistory(res.data);
    } catch (err) {
      setHistory([]);
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

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.date}>{formatDate(item.date)}</Text>
        <Text style={[
          styles.status,
          item.checkout_time ? styles.statusDone : styles.statusPending
        ]}>
          {item.checkout_time ? 'Complete' : 'Incomplete'}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Check-in</Text>
        <Text style={styles.value}>{formatTime(item.checkin_time)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Check-out</Text>
        <Text style={styles.value}>{formatTime(item.checkout_time)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Working Hours</Text>
        <Text style={styles.value}>
          {item.working_hours ? `${item.working_hours} hrs` : '--'}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Check-in Location</Text>
        <Text style={styles.value}>
          {formatCoords(item.checkin_latitude, item.checkin_longitude)}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Check-out Location</Text>
        <Text style={styles.value}>
          {formatCoords(item.checkout_latitude, item.checkout_longitude)}
        </Text>
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
        <Text style={styles.title}>Attendance History</Text>
      </View>

      {history.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No attendance records found</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 30 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2ff', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginTop: 50, marginBottom: 24 },
  back: { color: '#1a237e', fontSize: 16, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a237e' },
  card: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 16, marginBottom: 12, elevation: 3
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12
  },
  date: { fontSize: 15, fontWeight: 'bold', color: '#1a237e' },
  status: { fontSize: 12, fontWeight: 'bold', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusDone: { backgroundColor: '#e8f5e9', color: '#2e7d32' },
  statusPending: { backgroundColor: '#fff3e0', color: '#e65100' },
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: '#eee'
  },
  label: { fontSize: 13, color: '#666' },
  value: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  emptyText: { fontSize: 15, color: '#999' },
});