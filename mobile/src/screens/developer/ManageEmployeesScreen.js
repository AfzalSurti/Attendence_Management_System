import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal, ScrollView
} from 'react-native';
import {
  getAllEmployeesAPI, createEmployeeAPI,
  updateEmployeeAPI, deleteEmployeeAPI,
  getAllProjectsAPI, getProjectDetailsAPI, removeAssignmentAPI
} from '../../services/api';

export default function ManageEmployeesScreen({ navigation }) {
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [assignedProjects, setAssignedProjects] = useState([]);
  const [loadingAssignedProjects, setLoadingAssignedProjects] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ name: '', mobile_number: '', password: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [empRes, projRes] = await Promise.all([
        getAllEmployeesAPI(),
        getAllProjectsAPI()
      ]);
      setEmployees(empRes.data);
      setProjects(projRes.data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    const cleanName = form.name.trim();
    const cleanMobile = form.mobile_number.trim();
    if (!cleanName || !cleanMobile || !form.password) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    if (!/^\d{10}$/.test(cleanMobile)) {
      Alert.alert('Error', 'Mobile number must be exactly 10 digits');
      return;
    }
    if (form.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    try {
      await createEmployeeAPI({ ...form, name: cleanName, mobile_number: cleanMobile });
      Alert.alert('Success', 'Employee created successfully');
      setModalVisible(false);
      setForm({ name: '', mobile_number: '', password: '' });
      loadData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to create employee');
    }
  };

  const handleUpdate = async () => {
    const cleanName = form.name.trim();
    const cleanMobile = form.mobile_number.trim();
    if (!cleanName || !cleanMobile) {
      Alert.alert('Error', 'Name and mobile number are required');
      return;
    }
    if (!/^\d{10}$/.test(cleanMobile)) {
      Alert.alert('Error', 'Mobile number must be exactly 10 digits');
      return;
    }
    if (form.password && form.password.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }
    try {
      await updateEmployeeAPI(selectedEmployee.id, {
        ...form,
        name: cleanName,
        mobile_number: cleanMobile,
      });
      Alert.alert('Success', 'Employee updated successfully');
      setModalVisible(false);
      setForm({ name: '', mobile_number: '', password: '' });
      loadData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to update employee');
    }
  };

  const handleDelete = (employee) => {
    Alert.alert(
      'Delete Employee',
      `Are you sure you want to delete ${employee.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await deleteEmployeeAPI(employee.id);
              loadData();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete employee');
            }
          }
        }
      ]
    );
  };

  const openEditModal = (employee) => {
    setIsEditing(true);
    setSelectedEmployee(employee);
    setForm({ name: employee.name, mobile_number: employee.mobile_number, password: '' });
    setModalVisible(true);
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setSelectedEmployee(null);
    setForm({ name: '', mobile_number: '', password: '' });
    setModalVisible(true);
  };

  const openProjectsModal = async (employee) => {
    setSelectedEmployee(employee);
    setAssignModalVisible(true);
    setLoadingAssignedProjects(true);
    try {
      const details = await Promise.all(
        projects.map((project) => getProjectDetailsAPI(project.id).catch(() => null))
      );
      const mappedProjects = details
        .map((res) => res?.data)
        .filter((project) =>
          project?.employees?.some((emp) => emp.id === employee.id)
        )
        .map((project) => ({
          id: project.id,
          project_number: project.project_number,
          project_name: project.project_name,
        }));
      setAssignedProjects(mappedProjects);
    } catch (err) {
      Alert.alert('Error', 'Failed to load assigned projects');
      setAssignedProjects([]);
    } finally {
      setLoadingAssignedProjects(false);
    }
  };

  const handleRemoveProject = async (project) => {
    if (!selectedEmployee) return;
    Alert.alert(
      'Remove Project Assignment',
      `Are you sure you want to remove ${selectedEmployee.name} from ${project.project_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeAssignmentAPI(selectedEmployee.id, project.id);
              setAssignedProjects((prev) => prev.filter((p) => p.id !== project.id));
              Alert.alert('Success', 'Project removed');
            } catch (err) {
              Alert.alert('Error', 'Failed to remove project');
            }
          },
        },
      ]
    );
  };

  const closeProjectsModal = () => {
    setAssignModalVisible(false);
    setAssignedProjects([]);
  };

  const renderEmployee = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.empName}>{item.name}</Text>
        <Text style={styles.empMobile}>{item.mobile_number}</Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.attendanceBtn}
          onPress={() => navigation.navigate('EmployeeAttendance', { employee: item })}
        >
          <Text style={styles.attendanceBtnText}>Attendance</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.assignBtn}
          onPress={() => openProjectsModal(item)}
        >
          <Text style={styles.assignBtnText}>Projects</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => openEditModal(item)}
        >
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(item)}
        >
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Manage Employees</Text>
      </View>

      {/* Add Button */}
      <TouchableOpacity style={styles.addBtn} onPress={openCreateModal}>
        <Text style={styles.addBtnText}>+ Add Employee</Text>
      </TouchableOpacity>

      {/* List */}
      <FlatList
        data={employees}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderEmployee}
        contentContainerStyle={{ paddingBottom: 30 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No employees found</Text>
        }
      />

      {/* Create/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {isEditing ? 'Edit Employee' : 'Add Employee'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#999"
              value={form.name}
              onChangeText={(t) => setForm({ ...form, name: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="Mobile Number"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              maxLength={10}
              value={form.mobile_number}
              onChangeText={(t) => setForm({ ...form, mobile_number: t.replace(/\D/g, '') })}
            />
            <TextInput
              style={styles.input}
              placeholder={isEditing ? 'New Password (leave blank to keep)' : 'Password'}
              placeholderTextColor="#999"
              secureTextEntry
              value={form.password}
              onChangeText={(t) => setForm({ ...form, password: t })}
            />
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={isEditing ? handleUpdate : handleCreate}
            >
              <Text style={styles.submitBtnText}>
                {isEditing ? 'Update' : 'Create'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Assign Projects Modal */}
      <Modal visible={assignModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Projects Assigned to {selectedEmployee?.name}
            </Text>
            {loadingAssignedProjects ? (
              <ActivityIndicator size="small" color="#1a237e" />
            ) : (
              <ScrollView style={{ maxHeight: 300 }}>
                {assignedProjects.length ? assignedProjects.map((proj) => (
                  <View key={proj.id} style={styles.projectRow}>
                    <Text style={styles.projectText}>
                      {proj.project_number} — {proj.project_name}
                    </Text>
                    <View style={styles.projectBtns}>
                      <TouchableOpacity
                        style={styles.removeSmallBtn}
                        onPress={() => handleRemoveProject(proj)}
                      >
                        <Text style={styles.removeSmallText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )) : (
                  <Text style={styles.emptyText}>No projects assigned to this employee</Text>
                )}
              </ScrollView>
            )}
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={closeProjectsModal}
            >
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2ff', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginTop: 50, marginBottom: 16 },
  back: { color: '#1a237e', fontSize: 16, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a237e' },
  addBtn: {
    backgroundColor: '#1a237e', padding: 14,
    borderRadius: 12, alignItems: 'center', marginBottom: 16
  },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  card: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 14, marginBottom: 10, elevation: 3
  },
  cardInfo: { marginBottom: 10 },
  empName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  empMobile: { fontSize: 13, color: '#888', marginTop: 2 },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  attendanceBtn: {
    backgroundColor: '#f3e5f5', padding: 8,
    borderRadius: 8, flex: 1, minWidth: '45%', alignItems: 'center',
  },
  attendanceBtnText: { color: '#6a1b9a', fontWeight: 'bold', fontSize: 12 },
  assignBtn: {
    backgroundColor: '#e8eaf6', padding: 8,
    borderRadius: 8, flex: 1, minWidth: '45%', alignItems: 'center'
  },
  assignBtnText: { color: '#1a237e', fontWeight: 'bold', fontSize: 12 },
  editBtn: {
    backgroundColor: '#e3f2fd', padding: 8,
    borderRadius: 8, flex: 1, minWidth: '45%', alignItems: 'center'
  },
  editBtnText: { color: '#1565c0', fontWeight: 'bold', fontSize: 12 },
  deleteBtn: {
    backgroundColor: '#ffebee', padding: 8,
    borderRadius: 8, flex: 1, minWidth: '45%', alignItems: 'center'
  },
  deleteBtnText: { color: '#c62828', fontWeight: 'bold', fontSize: 12 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 20
  },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 24, width: '100%'
  },
  modalTitle: {
    fontSize: 18, fontWeight: 'bold', color: '#1a237e', marginBottom: 16
  },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    padding: 12, fontSize: 14, marginBottom: 12, color: '#333'
  },
  submitBtn: {
    backgroundColor: '#1a237e', padding: 14,
    borderRadius: 10, alignItems: 'center', marginBottom: 8
  },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  cancelBtn: {
    backgroundColor: '#f5f5f5', padding: 14,
    borderRadius: 10, alignItems: 'center'
  },
  cancelBtnText: { color: '#666', fontWeight: 'bold' },
  projectRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: '#eee'
  },
  projectText: { fontSize: 13, color: '#333', flex: 1 },
  projectBtns: { flexDirection: 'row', gap: 6 },
  removeSmallBtn: {
    backgroundColor: '#ffebee', padding: 6,
    borderRadius: 6
  },
  removeSmallText: { color: '#c62828', fontSize: 11, fontWeight: 'bold' },
});