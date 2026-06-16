import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, ScrollView
} from 'react-native';
import { assignProjectAPI, getAllEmployeesAPI, getProjectDetailsAPI } from '../../services/api';
import { getApiErrorMessage } from '../../utils/apiError';

export default function ProjectDetailsScreen({ navigation, route }) {
  const project = route.params?.project;
  const readOnly = route.params?.readOnly ?? false;
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assigningEmployeeId, setAssigningEmployeeId] = useState(null);

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

  useEffect(() => {
    if (readOnly) return;
    const loadEmployees = async () => {
      try {
        const res = await getAllEmployeesAPI();
        setEmployees(res.data.filter((e) => e.role === 'employee'));
      } catch (err) {
        Alert.alert('Error', getApiErrorMessage(err, 'Failed to load employees'));
      }
    };
    loadEmployees();
  }, [readOnly]);

  const assignedEmployeeIds = new Set((details?.employees || []).map((emp) => emp.id));
  const availableEmployees = employees.filter((emp) => !assignedEmployeeIds.has(emp.id));

  const handleAssignEmployee = async (employeeId) => {
    if (!details?.id) return;
    setAssigningEmployeeId(employeeId);
    try {
      await assignProjectAPI({ employee_id: employeeId, project_id: details.id });
      Alert.alert('Success', 'Employee assigned to project');
      setAssignModalVisible(false);
      await loadDetails();
    } catch (err) {
      Alert.alert('Error', getApiErrorMessage(err, 'Failed to assign employee'));
    } finally {
      setAssigningEmployeeId(null);
    }
  };

  const renderEmployee = ({ item }) => (
    <View style={styles.employeeCard}>
      <View style={styles.empAvatar}>
        <Text style={styles.empAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View>
        <Text style={styles.empName}>{item.name}</Text>
        <Text style={styles.empMobile}>{item.mobile_number}</Text>
      </View>
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
        {readOnly && <Text style={styles.readOnlyBadge}>View only</Text>}
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
      {!readOnly && (
        <View style={styles.assignActions}>
          <TouchableOpacity style={styles.assignBtn} onPress={() => setAssignModalVisible(true)}>
            <Text style={styles.assignBtnText}>+ Assign Existing Employee</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addEmployeeBtn}
            onPress={() => navigation.navigate('ManageEmployees')}
          >
            <Text style={styles.addEmployeeBtnText}>+ Add New Employee</Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        data={details?.employees || []}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderEmployee}
        contentContainerStyle={{ paddingBottom: 30 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No employees assigned to this project</Text>
        }
      />

      {!readOnly && (
        <Modal visible={assignModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Assign Employee</Text>
              <ScrollView style={{ maxHeight: 320 }}>
                {availableEmployees.length ? availableEmployees.map((emp) => (
                  <TouchableOpacity
                    key={emp.id}
                    style={styles.employeeSelectRow}
                    onPress={() => handleAssignEmployee(emp.id)}
                    disabled={assigningEmployeeId === emp.id}
                  >
                    <View>
                      <Text style={styles.empName}>{emp.name}</Text>
                      <Text style={styles.empMobile}>{emp.mobile_number}</Text>
                    </View>
                    {assigningEmployeeId === emp.id
                      ? <ActivityIndicator size="small" color="#1a237e" />
                      : <Text style={styles.selectText}>Assign</Text>}
                  </TouchableOpacity>
                )) : (
                  <Text style={styles.emptyText}>All employees are already assigned</Text>
                )}
              </ScrollView>
              <TouchableOpacity
                style={styles.addEmployeeBtn}
                onPress={() => {
                  setAssignModalVisible(false);
                  navigation.navigate('ManageEmployees');
                }}
              >
                <Text style={styles.addEmployeeBtnText}>+ Add New Employee</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setAssignModalVisible(false)}>
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
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
  readOnlyBadge: {
    fontSize: 11, color: '#5c6bc0', fontWeight: 'bold',
    marginTop: 6, backgroundColor: '#e8eaf6',
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
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
  assignActions: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  assignBtn: {
    flex: 1, backgroundColor: '#1a237e', borderRadius: 10, padding: 10, alignItems: 'center',
  },
  assignBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  addEmployeeBtn: {
    flex: 1, backgroundColor: '#e8eaf6', borderRadius: 10, padding: 10, alignItems: 'center',
  },
  addEmployeeBtnText: { color: '#1a237e', fontWeight: '700', fontSize: 12 },
  employeeCard: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 14, marginBottom: 8, elevation: 2,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  empAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#1a237e', justifyContent: 'center', alignItems: 'center',
  },
  empAvatarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  empName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  empMobile: { fontSize: 13, color: '#888', marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 20, fontSize: 14 },
  errorText: { fontSize: 16, color: '#666', marginBottom: 16 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  modalCard: {
    width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a237e', marginBottom: 12 },
  employeeSelectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectText: { color: '#1a237e', fontWeight: '700' },
  closeBtn: {
    marginTop: 8, borderRadius: 10, padding: 10, backgroundColor: '#f5f5f5', alignItems: 'center',
  },
  closeBtnText: { color: '#666', fontWeight: '700' },
});
