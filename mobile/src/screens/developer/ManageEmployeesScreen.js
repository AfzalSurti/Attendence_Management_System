import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal, ScrollView
} from 'react-native';
import {
  getAllEmployeesAPI, createEmployeeAPI,
  updateEmployeeAPI, deleteEmployeeAPI,
  getAllProjectsAPI, assignProjectAPI, removeAssignmentAPI
} from '../../services/api';

export default function ManageEmployeesScreen({ navigation }) {
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
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
    if (!form.name || !form.mobile_number || !form.password) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    try {
      await createEmployeeAPI(form);
      Alert.alert('Success', 'Employee created successfully');
      setModalVisible(false);
      setForm({ name: '', mobile_number: '', password: '' });
      loadData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to create employee');
    }
  };

  const handleUpdate = async () => {
    try {
      await updateEmployeeAPI(selectedEmployee.id, form);
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

  const handleAssignProject = async (projectId) => {
    try {
      await assignProjectAPI({
        employee_id: selectedEmployee.id,
        project_id: projectId
      });
      Alert.alert('Success', 'Project assigned');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to assign');
    }
  };

  const handleRemoveProject = async (projectId) => {
    try {
      await removeAssignmentAPI(selectedEmployee.id, projectId);
      Alert.alert('Success', 'Project removed');
    } catch (err) {
      Alert.alert('Error', 'Failed to remove project');
    }
  };

  const renderEmployee = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.empName}>{item.name}</Text>
        <Text style={styles.empMobile}>{item.mobile_number}</Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.assignBtn}
          onPress={() => { setSelectedEmployee(item); setAssignModalVisible(true); }}
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
              value={form.name}
              onChangeText={(t) => setForm({ ...form, name: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="Mobile Number"
              keyboardType="phone-pad"
              value={form.mobile_number}
              onChangeText={(t) => setForm({ ...form, mobile_number: t })}
            />
            <TextInput
              style={styles.input}
              placeholder={isEditing ? 'New Password (leave blank to keep)' : 'Password'}
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
              Assign Projects to {selectedEmployee?.name}
            </Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {projects.map((proj) => (
                <View key={proj.id} style={styles.projectRow}>
                  <Text style={styles.projectText}>
                    {proj.project_number} — {proj.project_name}
                  </Text>
                  <View style={styles.projectBtns}>
                    <TouchableOpacity
                      style={styles.assignSmallBtn}
                      onPress={() => handleAssignProject(proj.id)}
                    >
                      <Text style={styles.assignSmallText}>Assign</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeSmallBtn}
                      onPress={() => handleRemoveProject(proj.id)}
                    >
                      <Text style={styles.removeSmallText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setAssignModalVisible(false)}
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
  cardActions: { flexDirection: 'row', gap: 8 },
  assignBtn: {
    backgroundColor: '#e8eaf6', padding: 8,
    borderRadius: 8, flex: 1, alignItems: 'center'
  },
  assignBtnText: { color: '#1a237e', fontWeight: 'bold', fontSize: 12 },
  editBtn: {
    backgroundColor: '#e3f2fd', padding: 8,
    borderRadius: 8, flex: 1, alignItems: 'center'
  },
  editBtnText: { color: '#1565c0', fontWeight: 'bold', fontSize: 12 },
  deleteBtn: {
    backgroundColor: '#ffebee', padding: 8,
    borderRadius: 8, flex: 1, alignItems: 'center'
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
  assignSmallBtn: {
    backgroundColor: '#e8f5e9', padding: 6,
    borderRadius: 6
  },
  assignSmallText: { color: '#2e7d32', fontSize: 11, fontWeight: 'bold' },
  removeSmallBtn: {
    backgroundColor: '#ffebee', padding: 6,
    borderRadius: 6
  },
  removeSmallText: { color: '#c62828', fontSize: 11, fontWeight: 'bold' },
});