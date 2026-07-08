import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal
} from 'react-native';
import {
  getAllProjectsAPI, createProjectAPI,
  updateProjectAPI, deleteProjectAPI, getProjectDetailsAPI
} from '../../services/api';

export default function ManageProjectsScreen({ navigation }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [form, setForm] = useState({ project_number: '', project_name: '' });
  const [search, setSearch] = useState('');

  useEffect(() => { loadProjects(); }, []);

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
      Alert.alert('Error', 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.project_number || !form.project_name) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    try {
      await createProjectAPI(form);
      Alert.alert('Success', 'Project created successfully');
      setModalVisible(false);
      setForm({ project_number: '', project_name: '' });
      loadProjects();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to create project');
    }
  };

  const handleUpdate = async () => {
    try {
      await updateProjectAPI(selectedProject.id, form);
      Alert.alert('Success', 'Project updated successfully');
      setModalVisible(false);
      setForm({ project_number: '', project_name: '' });
      loadProjects();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to update project');
    }
  };

  const handleDelete = (project) => {
    Alert.alert(
      'Delete Project',
      `Are you sure you want to delete ${project.project_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await deleteProjectAPI(project.id);
              loadProjects();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete project');
            }
          }
        }
      ]
    );
  };

  const openEditModal = (project) => {
    setIsEditing(true);
    setSelectedProject(project);
    setForm({
      project_number: project.project_number,
      project_name: project.project_name
    });
    setModalVisible(true);
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setSelectedProject(null);
    setForm({ project_number: '', project_name: '' });
    setModalVisible(true);
  };

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = query
      ? projects.filter((project) =>
          project.project_name.toLowerCase().includes(query) ||
          project.project_number.toLowerCase().includes(query)
        )
      : projects;

    return [...list].sort((a, b) => a.project_name.localeCompare(b.project_name));
  }, [projects, search]);

  const renderProject = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardInfo}
        onPress={() => navigation.navigate('ProjectDetails', { project: item })}
      >
        <Text style={styles.projectCode}>{item.project_number}</Text>
        <Text style={styles.projectName}>{item.project_name}</Text>
        <Text style={styles.empCount}>
          {item.employee_count ?? 0} employee{(item.employee_count ?? 0) !== 1 ? 's' : ''} assigned
        </Text>
        <Text style={styles.viewHint}>Tap to view details →</Text>
      </TouchableOpacity>
      <View style={styles.cardActions}>
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
        <Text style={styles.title}>Manage Projects</Text>
      </View>

      {/* Add Button */}
      <TouchableOpacity style={styles.addBtn} onPress={openCreateModal}>
        <Text style={styles.addBtnText}>+ Add Project</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.searchInput}
        placeholder="Search by project name or code..."
        placeholderTextColor="#94a3b8"
        value={search}
        onChangeText={setSearch}
      />

      <Text style={styles.helperText}>
        Tap a project to view employees assigned to that project.
      </Text>

      {/* List */}
      <FlatList
        data={filteredProjects}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderProject}
        contentContainerStyle={{ paddingBottom: 30 }}
        ListHeaderComponent={
          <Text style={styles.countText}>
            {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
          </Text>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No projects match your search</Text>
        }
      />

      {/* Create/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {isEditing ? 'Edit Project' : 'Add Project'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Project Code (e.g. RD-001)"
              placeholderTextColor="#999"
              value={form.project_number}
              onChangeText={(t) => setForm({ ...form, project_number: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="Project Name (e.g. Road Project A)"
              placeholderTextColor="#999"
              value={form.project_name}
              onChangeText={(t) => setForm({ ...form, project_name: t })}
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
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#dbe4ff',
    color: '#1f2937',
  },
  helperText: { fontSize: 12, color: '#64748b', marginBottom: 10 },
  countText: { fontSize: 13, color: '#64748b', marginBottom: 12 },
  card: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 14, marginBottom: 10, elevation: 3,
  },
  cardInfo: { flex: 1, marginBottom: 10 },
  projectCode: {
    fontSize: 13, fontWeight: 'bold',
    color: '#1a237e', marginBottom: 2
  },
  projectName: { fontSize: 15, color: '#333' },
  empCount: { fontSize: 12, color: '#5c6bc0', marginTop: 4, fontWeight: '600' },
  viewHint: { fontSize: 11, color: '#5c6bc0', marginTop: 6 },
  cardActions: { flexDirection: 'row', gap: 8 },
  editBtn: {
    backgroundColor: '#e3f2fd', padding: 8,
    borderRadius: 8, alignItems: 'center'
  },
  editBtnText: { color: '#1565c0', fontWeight: 'bold', fontSize: 12 },
  deleteBtn: {
    backgroundColor: '#ffebee', padding: 8,
    borderRadius: 8, alignItems: 'center'
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
    fontSize: 18, fontWeight: 'bold',
    color: '#1a237e', marginBottom: 16
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
});