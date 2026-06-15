import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { getAllProjectsAPI, getProjectDetailsAPI } from '../../services/api';
import { getApiErrorMessage } from '../../utils/apiError';

export default function AdminProjectsScreen({ navigation }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const res = await getAllProjectsAPI();
      const details = await Promise.all(
        res.data.map((p) => getProjectDetailsAPI(p.id).catch(() => null))
      );
      const enriched = res.data.map((p, i) => ({
        ...p,
        employee_count: details[i]?.data?.employee_count ?? 0,
      }));
      setProjects(enriched);
    } catch (err) {
      Alert.alert('Error', getApiErrorMessage(err, 'Failed to load projects'));
    } finally {
      setLoading(false);
    }
  };

  const renderProject = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ProjectDetails', { project: item, readOnly: true })}
    >
      <View style={styles.cardBody}>
        <Text style={styles.projectCode}>{item.project_number}</Text>
        <Text style={styles.projectName}>{item.project_name}</Text>
        <Text style={styles.empCount}>
          {item.employee_count} employee{item.employee_count !== 1 ? 's' : ''} assigned
        </Text>
        <Text style={styles.viewHint}>Tap to view details →</Text>
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
        <Text style={styles.title}>Projects</Text>
        <Text style={styles.subtitle}>View-only — tap a project for full details</Text>
      </View>

      <FlatList
        data={projects}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderProject}
        contentContainerStyle={{ paddingBottom: 30 }}
        ListHeaderComponent={
          <Text style={styles.countText}>{projects.length} projects</Text>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No projects found</Text>
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
  cardBody: { flex: 1 },
  projectCode: { fontSize: 13, fontWeight: 'bold', color: '#1a237e', marginBottom: 2 },
  projectName: { fontSize: 16, color: '#333', fontWeight: '600' },
  empCount: { fontSize: 12, color: '#5c6bc0', marginTop: 6, fontWeight: '600' },
  viewHint: { fontSize: 11, color: '#888', marginTop: 4 },
  arrow: { fontSize: 24, color: '#1a237e', marginLeft: 8 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },
});
