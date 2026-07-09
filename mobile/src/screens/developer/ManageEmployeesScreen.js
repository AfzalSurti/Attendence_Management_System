import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal, ScrollView
} from 'react-native';
import {
  getAllEmployeesAPI, createEmployeeAPI,
  updateEmployeeAPI, deleteEmployeeAPI,
  getAllProjectsAPI, getProjectDetailsAPI,
  createProjectAPI, assignProjectAPI, removeAssignmentAPI, getAdminsAPI
} from '../../services/api';
import EmployeeBulkUpload from '../../components/EmployeeBulkUpload';
import DataTable from '../../components/DataTable';
import { getUser } from '../../utils/storage';
import { isWeb } from '../../utils/platform';

const emptyNewProject = () => ({ project_number: '', project_name: '' });

export default function ManageEmployeesScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [selectedAdminId, setSelectedAdminId] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [assignedProjects, setAssignedProjects] = useState([]);
  const [unassignedProjects, setUnassignedProjects] = useState([]);
  const [loadingAssignedProjects, setLoadingAssignedProjects] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ name: '', mobile_number: '', password: '' });
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [newProject, setNewProject] = useState(emptyNewProject());
  const isReadOnlyAdmin = user?.role === 'admin' && user?.admin_permission === 'read_only';

  useEffect(() => {
    bootstrap();
  }, []);

  useEffect(() => {
    if (user && (user.role !== 'developer' || selectedAdminId)) {
      loadData();
    }
  }, [user, selectedAdminId]);

  const bootstrap = async () => {
    const currentUser = await getUser();
    setUser(currentUser);

    if (currentUser?.role === 'developer') {
      try {
        const res = await getAdminsAPI();
        setAdmins(res.data);
        if (res.data.length) {
          setSelectedAdminId(res.data[0].id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to load admin accounts');
        setLoading(false);
      }
      return;
    }

    loadData();
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const params = user?.role === 'developer' && selectedAdminId
        ? { admin_id: selectedAdminId }
        : undefined;
      const [empRes, projRes] = await Promise.all([
        getAllEmployeesAPI(params),
        getAllProjectsAPI(params)
      ]);
      setEmployees(empRes.data);
      setProjects(projRes.data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const resetFormState = () => {
    setForm({ name: '', mobile_number: '', password: '' });
    setSelectedProjectIds([]);
    setNewProject(emptyNewProject());
  };

  const toggleProjectSelection = (projectId) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  };

  const assignProjectsToEmployee = async (employeeId, projectIds) => {
    for (const projectId of projectIds) {
      try {
        await assignProjectAPI({ employee_id: employeeId, project_id: projectId });
      } catch (err) {
        const detail = err.response?.data?.detail;
        if (detail !== 'Project already assigned to this employee') {
          throw err;
        }
      }
    }
  };

  const handleCreate = async () => {
    const cleanName = form.name.trim();
    const cleanMobile = form.mobile_number.trim();
    const cleanProjectNumber = newProject.project_number.trim();
    const cleanProjectName = newProject.project_name.trim();
    const hasPartialNewProject = cleanProjectNumber || cleanProjectName;

    if (!cleanName || !cleanMobile || !form.password) {
      Alert.alert('Error', 'Name, mobile number and password are required');
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
    if (hasPartialNewProject && (!cleanProjectNumber || !cleanProjectName)) {
      Alert.alert('Error', 'Enter both project code and project name to create a new project');
      return;
    }

    setSaving(true);
    try {
      const res = await createEmployeeAPI({
        ...form,
        name: cleanName,
        mobile_number: cleanMobile,
        admin_id: user?.role === 'developer' ? selectedAdminId : undefined,
      });
      const employeeId = res.data.id;
      const projectIds = [...selectedProjectIds];

      if (cleanProjectNumber && cleanProjectName) {
        const projectRes = await createProjectAPI({
          project_number: cleanProjectNumber,
          project_name: cleanProjectName,
          admin_id: user?.role === 'developer' ? selectedAdminId : undefined,
        });
        projectIds.push(projectRes.data.id);
      }

      if (projectIds.length) {
        await assignProjectsToEmployee(employeeId, [...new Set(projectIds)]);
      }

      Alert.alert('Success', 'Employee created successfully');
      setModalVisible(false);
      resetFormState();
      loadData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to create employee');
    } finally {
      setSaving(false);
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

    setSaving(true);
    try {
      await updateEmployeeAPI(selectedEmployee.id, {
        ...form,
        name: cleanName,
        mobile_number: cleanMobile,
      });
      Alert.alert('Success', 'Employee updated successfully');
      setModalVisible(false);
      resetFormState();
      loadData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to update employee');
    } finally {
      setSaving(false);
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
    setSelectedProjectIds([]);
    setNewProject(emptyNewProject());
    setModalVisible(true);
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setSelectedEmployee(null);
    resetFormState();
    setModalVisible(true);
  };

  const loadEmployeeProjects = async (employee) => {
    const details = await Promise.all(
      projects.map((project) => getProjectDetailsAPI(project.id).catch(() => null))
    );
    const assigned = details
      .map((res) => res?.data)
      .filter((project) =>
        project?.employees?.some((emp) => emp.id === employee.id)
      )
      .map((project) => ({
        id: project.id,
        project_number: project.project_number,
        project_name: project.project_name,
      }));
    const assignedIds = new Set(assigned.map((p) => p.id));
    const unassigned = projects.filter((p) => !assignedIds.has(p.id));
    return { assigned, unassigned };
  };

  const openProjectsModal = async (employee) => {
    setSelectedEmployee(employee);
    setAssignModalVisible(true);
    setLoadingAssignedProjects(true);
    try {
      const { assigned, unassigned } = await loadEmployeeProjects(employee);
      setAssignedProjects(assigned);
      setUnassignedProjects(unassigned);
    } catch (err) {
      Alert.alert('Error', 'Failed to load assigned projects');
      setAssignedProjects([]);
      setUnassignedProjects([]);
    } finally {
      setLoadingAssignedProjects(false);
    }
  };

  const handleAssignProject = async (project) => {
    if (!selectedEmployee) return;
    try {
      await assignProjectAPI({
        employee_id: selectedEmployee.id,
        project_id: project.id,
      });
      setAssignedProjects((prev) => [...prev, project]);
      setUnassignedProjects((prev) => prev.filter((p) => p.id !== project.id));
      Alert.alert('Success', 'Project assigned');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to assign project');
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
              setUnassignedProjects((prev) => [...prev, project]);
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
    setUnassignedProjects([]);
  };

  const employeeTableColumns = [
    { key: 'index', label: '#', flex: 0.4 },
    { key: 'name', label: 'Name', flex: 1.4 },
    { key: 'mobile_number', label: 'Mobile', flex: 1 },
    {
      key: 'actions',
      label: 'Actions',
      flex: 2.6,
      render: (row) => (
        <View style={styles.tableActions}>
          <TouchableOpacity
            style={styles.tableBtnPurple}
            onPress={() => navigation.navigate('EmployeeAttendance', { employee: row })}
          >
            <Text style={styles.tableBtnPurpleText}>Attendance</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tableBtnBlue}
            onPress={() => openProjectsModal(row)}
          >
            <Text style={styles.tableBtnBlueText}>Projects</Text>
          </TouchableOpacity>
          {!isReadOnlyAdmin && (
            <>
              <TouchableOpacity
                style={styles.tableBtnEdit}
                onPress={() => openEditModal(row)}
              >
                <Text style={styles.tableBtnEditText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tableBtnDelete}
                onPress={() => handleDelete(row)}
              >
                <Text style={styles.tableBtnDeleteText}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ),
    },
  ];

  const employeeTableRows = employees.map((item, index) => ({
    ...item,
    key: String(item.id),
    index: index + 1,
  }));

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
        {!isReadOnlyAdmin && (
          <>
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
          </>
        )}
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
        <Text style={styles.title}>Manage Employees</Text>
      </View>

      {user?.role === 'developer' && (
        <View style={styles.adminScopeCard}>
          <Text style={styles.adminScopeTitle}>Selected Admin</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.adminChipRow}>
              {admins.map((admin) => {
                const active = selectedAdminId === admin.id;
                return (
                  <TouchableOpacity
                    key={admin.id}
                    style={[styles.adminChip, active && styles.adminChipActive]}
                    onPress={() => setSelectedAdminId(admin.id)}
                  >
                    <Text style={[styles.adminChipText, active && styles.adminChipTextActive]}>
                      {admin.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
          <Text style={styles.adminScopeHint}>
            Employees, projects, and bulk uploads now apply to the selected admin account.
          </Text>
        </View>
      )}

      {isReadOnlyAdmin && (
        <Text style={styles.readOnlyNote}>
          Read-only admin: you can view employee and project data, but you cannot make changes.
        </Text>
      )}

      {!isReadOnlyAdmin && (
        <TouchableOpacity style={styles.addBtn} onPress={openCreateModal}>
          <Text style={styles.addBtnText}>+ Add Employee</Text>
        </TouchableOpacity>
      )}

      {!isReadOnlyAdmin && (
        <EmployeeBulkUpload
          onComplete={loadData}
          adminId={selectedAdminId}
          requiresAdminSelection={user?.role === 'developer'}
        />
      )}

      {isWeb ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
          <DataTable
            columns={employeeTableColumns}
            rows={employeeTableRows}
            emptyMessage="No employees found"
          />
        </ScrollView>
      ) : (
        <FlatList
          data={employees}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderEmployee}
          contentContainerStyle={{ paddingBottom: 30 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No employees found</Text>
          }
        />
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
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

              {!isEditing && (
                <>
                  <Text style={styles.sectionLabel}>Assign Projects</Text>
                  {projects.length ? projects.map((proj) => {
                    const selected = selectedProjectIds.includes(proj.id);
                    return (
                      <TouchableOpacity
                        key={proj.id}
                        style={[styles.projectChip, selected && styles.projectChipSelected]}
                        onPress={() => toggleProjectSelection(proj.id)}
                      >
                        <Text style={[styles.projectChipText, selected && styles.projectChipTextSelected]}>
                          {selected ? '✓ ' : ''}{proj.project_number} — {proj.project_name}
                        </Text>
                      </TouchableOpacity>
                    );
                  }) : (
                    <Text style={styles.helperText}>No projects yet — create one below</Text>
                  )}

                  <Text style={styles.sectionLabel}>Or Create New Project</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Project Code (e.g. PRJ-004)"
                    placeholderTextColor="#999"
                    value={newProject.project_number}
                    onChangeText={(t) => setNewProject({ ...newProject, project_number: t })}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Project Name (e.g. Site Office Building)"
                    placeholderTextColor="#999"
                    value={newProject.project_name}
                    onChangeText={(t) => setNewProject({ ...newProject, project_name: t })}
                  />
                  <Text style={styles.helperText}>
                    New project will be created and assigned to this employee
                  </Text>
                </>
              )}

              {isEditing && (
                <Text style={styles.helperText}>
                  To change project assignments, use the Projects button on the employee card
                </Text>
              )}

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={isEditing ? handleUpdate : handleCreate}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.submitBtnText}>{isEditing ? 'Update' : 'Create'}</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setModalVisible(false); resetFormState(); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={assignModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Projects — {selectedEmployee?.name}
            </Text>
            {loadingAssignedProjects ? (
              <ActivityIndicator size="small" color="#1a237e" />
            ) : (
              <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionLabel}>Assigned Projects</Text>
                {assignedProjects.length ? assignedProjects.map((proj) => (
                  <View key={proj.id} style={styles.projectRow}>
                    <Text style={styles.projectText}>
                      {proj.project_number} — {proj.project_name}
                    </Text>
                    {!isReadOnlyAdmin && (
                      <TouchableOpacity
                        style={styles.removeSmallBtn}
                        onPress={() => handleRemoveProject(proj)}
                      >
                        <Text style={styles.removeSmallText}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )) : (
                  <Text style={styles.helperText}>No projects assigned yet</Text>
                )}

                {isReadOnlyAdmin ? (
                  <Text style={styles.helperText}>
                    Read-only admin cannot change project assignments.
                  </Text>
                ) : (
                  <>
                    <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Assign Project</Text>
                    {unassignedProjects.length ? unassignedProjects.map((proj) => (
                      <View key={proj.id} style={styles.projectRow}>
                        <Text style={styles.projectText}>
                          {proj.project_number} — {proj.project_name}
                        </Text>
                        <TouchableOpacity
                          style={styles.assignSmallBtn}
                          onPress={() => handleAssignProject(proj)}
                        >
                          <Text style={styles.assignSmallText}>Assign</Text>
                        </TouchableOpacity>
                      </View>
                    )) : (
                      <Text style={styles.helperText}>All projects are already assigned</Text>
                    )}
                  </>
                )}
              </ScrollView>
            )}
            <TouchableOpacity style={styles.cancelBtn} onPress={closeProjectsModal}>
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
  adminScopeCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#dbe4ff',
  },
  adminScopeTitle: { fontSize: 13, fontWeight: '700', color: '#1a237e', marginBottom: 8 },
  adminChipRow: { flexDirection: 'row', gap: 8 },
  adminChip: {
    backgroundColor: '#eef2ff',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  adminChipActive: { backgroundColor: '#1a237e' },
  adminChipText: { color: '#1a237e', fontSize: 12, fontWeight: '700' },
  adminChipTextActive: { color: '#fff' },
  adminScopeHint: { fontSize: 12, color: '#64748b', marginTop: 10 },
  readOnlyNote: {
    fontSize: 12,
    color: '#92400e',
    backgroundColor: '#fef3c7',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    fontWeight: '600',
  },
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
  tableActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tableBtnPurple: {
    backgroundColor: '#f3e5f5', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6,
  },
  tableBtnPurpleText: { color: '#6a1b9a', fontSize: 11, fontWeight: '700' },
  tableBtnBlue: {
    backgroundColor: '#e8eaf6', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6,
  },
  tableBtnBlueText: { color: '#1a237e', fontSize: 11, fontWeight: '700' },
  tableBtnEdit: {
    backgroundColor: '#e3f2fd', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6,
  },
  tableBtnEditText: { color: '#1565c0', fontSize: 11, fontWeight: '700' },
  tableBtnDelete: {
    backgroundColor: '#ffebee', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6,
  },
  tableBtnDeleteText: { color: '#c62828', fontSize: 11, fontWeight: '700' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 20
  },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 24, width: '100%', maxHeight: '90%'
  },
  modalTitle: {
    fontSize: 18, fontWeight: 'bold', color: '#1a237e', marginBottom: 16
  },
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: '#1a237e', marginBottom: 8, marginTop: 4,
  },
  helperText: { fontSize: 12, color: '#888', marginBottom: 12 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    padding: 12, fontSize: 14, marginBottom: 12, color: '#333'
  },
  projectChip: {
    borderWidth: 1, borderColor: '#c5cae9', borderRadius: 10,
    padding: 10, marginBottom: 8, backgroundColor: '#fff',
  },
  projectChipSelected: { backgroundColor: '#1a237e', borderColor: '#1a237e' },
  projectChipText: { fontSize: 13, color: '#1a237e' },
  projectChipTextSelected: { color: '#fff', fontWeight: '600' },
  submitBtn: {
    backgroundColor: '#1a237e', padding: 14,
    borderRadius: 10, alignItems: 'center', marginBottom: 8, marginTop: 4,
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
  projectText: { fontSize: 13, color: '#333', flex: 1, marginRight: 8 },
  assignSmallBtn: {
    backgroundColor: '#e8f5e9', padding: 6, borderRadius: 6
  },
  assignSmallText: { color: '#2e7d32', fontSize: 11, fontWeight: 'bold' },
  removeSmallBtn: {
    backgroundColor: '#ffebee', padding: 6, borderRadius: 6
  },
  removeSmallText: { color: '#c62828', fontSize: 11, fontWeight: 'bold' },
});
