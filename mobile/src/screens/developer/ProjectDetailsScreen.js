import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { getProjectDetailsAPI } from '../../services/api';
import { getApiErrorMessage } from '../../utils/apiError';

export default function ProjectDetailsScreen({ navigation, route }) {
  const project = route.params?.project;
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDetails = useCallback(async () => {
    if (!project?.id) return;
    setLoading(true);
    try {
      const res = await getProjectDetailsAPI(project.id);
      setDetails(res.data);
    } catch (err) {
      Alert.alert('Error', getApiErrorMessage(err, 'Failed to load project details'));
    } finally {
      setLoading(false);
    }
  }, [project?.id]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const renderEmployee = ({ item }) => (
    <View style={styles.employeeCard}>
      <Text style={styles.empName}>{item.name}</Text>
      <Text style={styles.empMobile}>{item.mobile_number}</Text>
    </View>
  );

  if (!project) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Project not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
        <Text style={styles.title}>{details?.project_name || project.project_name}</Text>
        <Text style={styles.subtitle}>{details?.project_number || project.project_number}</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Project Code</Text>
        <Text style={styles.infoValue}>{details?.project_number}</Text>
        <Text style={styles.infoLabel}>Project Name</Text>
        <Text style={styles.infoValue}>{details?.project_name}</Text>
        <View style={styles.countBox}>
          <Text style={styles.countNumber}>{details?.employee_count ?? 0}</Text>
          <Text style={styles.countLabel}>Employees Assigned</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Assigned Employees</Text>
      <FlatList
        data={details?.employees || []}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderEmployee}
        contentContainerStyle={{ paddingBottom: 30 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No employees assigned to this project</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2ff', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2ff' },
  header: { marginTop: 50, marginBottom: 16 },
  back: { color: '#1a237e', fontSize: 16, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a237e' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  infoCard: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 20, marginBottom: 16, elevation: 3,
  },
  infoLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  infoValue: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 14 },
  countBox: {
    backgroundColor: '#e8eaf6', borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 4,
  },
  countNumber: { fontSize: 32, fontWeight: 'bold', color: '#1a237e' },
  countLabel: { fontSize: 13, color: '#5c6bc0', marginTop: 4 },
  sectionTitle: {
    fontSize: 16, fontWeight: 'bold', color: '#1a237e', marginBottom: 12,
  },
  employeeCard: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 14, marginBottom: 8, elevation: 2,
  },
  empName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  empMobile: { fontSize: 13, color: '#888', marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 20, fontSize: 14 },
  errorText: { fontSize: 16, color: '#666', marginBottom: 16 },
});
