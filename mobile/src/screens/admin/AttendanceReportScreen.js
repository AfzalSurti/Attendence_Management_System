import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, ScrollView,
} from 'react-native';
import {
  getAllEmployeesAPI, getAllProjectsAPI,
  getProjectDetailsAPI, getAdminAttendanceAPI, getAdminsAPI,
} from '../../services/api';
import { getApiErrorMessage } from '../../utils/apiError';
import { getDateRange, PRESET_LABELS } from '../../utils/dateRanges';
import { exportBulkAttendanceExcel, exportBulkAttendancePdf } from '../../utils/reportExport';
import { getUser } from '../../utils/storage';
import DataTable from '../../components/DataTable';
import { isWeb } from '../../utils/platform';

export default function AttendanceReportScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [selectedAdminId, setSelectedAdminId] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [exportPreset, setExportPreset] = useState('all');

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
        getAllProjectsAPI(params),
      ]);
      const staff = empRes.data.filter((e) => e.role === 'employee');
      const details = await Promise.all(
        projRes.data.map((p) => getProjectDetailsAPI(p.id))
      );

      const map = {};
      details.forEach((res) => {
        const project = res.data;
        project.employees.forEach((emp) => {
          if (!map[emp.id]) map[emp.id] = [];
          map[emp.id].push({
            id: project.id,
            project_number: project.project_number,
            project_name: project.project_name,
          });
        });
      });

      setEmployees(staff);
      setProjects(projRes.data);
      setAssignments(map);
    } catch (err) {
      Alert.alert('Error', getApiErrorMessage(err, 'Failed to load data'));
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    let list = employees;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.mobile_number.includes(q)
      );
    }

    if (selectedProjectId) {
      list = list.filter((e) =>
        (assignments[e.id] || []).some((p) => p.id === selectedProjectId)
      );
    }

    return [...list].sort((a, b) => {
      const projectA = (assignments[a.id]?.[0]?.project_name || 'zzz').toLowerCase();
      const projectB = (assignments[b.id]?.[0]?.project_name || 'zzz').toLowerCase();
      if (projectA !== projectB) return projectA.localeCompare(projectB);
      return a.name.localeCompare(b.name);
    });
  }, [employees, search, selectedProjectId, assignments]);

  const getFilterLabel = () => {
    const parts = [];
    if (search.trim()) parts.push(`Search: "${search.trim()}"`);
    if (selectedProjectId) {
      const proj = projects.find((p) => p.id === selectedProjectId);
      parts.push(`Project: ${proj ? `${proj.project_number} — ${proj.project_name}` : selectedProjectId}`);
    }
    parts.push(`Period: ${PRESET_LABELS[exportPreset] || 'All Time'}`);
    return parts.length ? parts.join(' | ') : 'All employees';
  };

  const fetchFilteredRecords = async () => {
    const params = {};
    if (user?.role === 'developer' && selectedAdminId) params.admin_id = selectedAdminId;
    if (selectedProjectId) params.project_id = selectedProjectId;
    if (exportPreset !== 'all') {
      const range = getDateRange(exportPreset);
      params.date_from = range.date_from;
      params.date_to = range.date_to;
    }

    const res = await getAdminAttendanceAPI(params);
    let records = res.data;

    const visibleNames = new Set(filteredEmployees.map((e) => e.name));
    records = records.filter((r) => visibleNames.has(r.employee_name));

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      records = records.filter((r) =>
        r.employee_name?.toLowerCase().includes(q) ||
        r.mobile_number?.includes(q)
      );
    }

    return records;
  };

  const handleBulkExport = async (type) => {
    if (filteredEmployees.length === 0) {
      Alert.alert('No Data', 'No employees match the current filters');
      return;
    }

    setExporting(type);
    try {
      const records = await fetchFilteredRecords();
      if (records.length === 0) {
        Alert.alert('No Data', 'No attendance records match the current filters');
        return;
      }

      const title = 'Attendance Report — Filtered';
      const filterLabel = getFilterLabel();

      if (type === 'pdf') {
        await exportBulkAttendancePdf(title, records, filterLabel);
      } else {
        await exportBulkAttendanceExcel(title, records, filterLabel);
      }
    } catch (err) {
      Alert.alert('Export Failed', err.message || 'Could not export report');
    } finally {
      setExporting(null);
    }
  };

  const getProjectLabel = (employeeId) => {
    const assigned = assignments[employeeId] || [];
    if (!assigned.length) return 'No project assigned';
    return assigned.map((p) => p.project_number).join(', ');
  };

  const reportTableColumns = [
    { key: 'index', label: '#', flex: 0.4 },
    { key: 'name', label: 'Name', flex: 1.4 },
    { key: 'mobile_number', label: 'Mobile', flex: 1 },
    {
      key: 'projects',
      label: 'Project(s)',
      flex: 1.2,
      render: (row) => (
        <Text style={styles.tableProjectText}>{getProjectLabel(row.id)}</Text>
      ),
    },
    {
      key: 'report',
      label: 'Report',
      flex: 0.8,
      render: (row) => (
        <TouchableOpacity
          style={styles.tableViewBtn}
          onPress={() => navigation.navigate('AdminEmployeeReport', { employee: row })}
        >
          <Text style={styles.tableViewBtnText}>View →</Text>
        </TouchableOpacity>
      ),
    },
  ];

  const reportTableRows = filteredEmployees.map((item, index) => ({
    ...item,
    key: String(item.id),
    index: index + 1,
  }));

  const renderEmployee = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('AdminEmployeeReport', { employee: item })}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.empName}>{item.name}</Text>
        <Text style={styles.empMobile}>{item.mobile_number}</Text>
        <Text style={styles.empProject}>{getProjectLabel(item.id)}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );

  const listHeader = (
    <>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by employee name or mobile..."
        value={search}
        onChangeText={setSearch}
        clearButtonMode="while-editing"
      />

      {user?.role === 'developer' && admins.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>View Data For Admin</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.projectScroll}>
            {admins.map((admin) => (
              <TouchableOpacity
                key={admin.id}
                style={[styles.chip, selectedAdminId === admin.id && styles.chipActive]}
                onPress={() => setSelectedAdminId(admin.id)}
              >
                <Text style={[styles.chipText, selectedAdminId === admin.id && styles.chipTextActive]}>
                  {admin.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      <Text style={styles.sectionLabel}>Filter by Project</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.projectScroll}>
        <TouchableOpacity
          style={[styles.chip, !selectedProjectId && styles.chipActive]}
          onPress={() => setSelectedProjectId(null)}
        >
          <Text style={[styles.chipText, !selectedProjectId && styles.chipTextActive]}>
            All Projects
          </Text>
        </TouchableOpacity>
        {projects.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.chip, selectedProjectId === p.id && styles.chipActive]}
            onPress={() => setSelectedProjectId(p.id)}
          >
            <Text style={[styles.chipText, selectedProjectId === p.id && styles.chipTextActive]}>
              {p.project_number}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.sectionLabel}>Export Period</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
        {['all', '7days', '15days', '30days'].map((preset) => (
          <TouchableOpacity
            key={preset}
            style={[styles.chip, exportPreset === preset && styles.chipActive]}
            onPress={() => setExportPreset(preset)}
          >
            <Text style={[styles.chipText, exportPreset === preset && styles.chipTextActive]}>
              {PRESET_LABELS[preset]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.exportRow}>
        <TouchableOpacity
          style={styles.exportBtn}
          onPress={() => handleBulkExport('pdf')}
          disabled={!!exporting}
        >
          {exporting === 'pdf'
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.exportBtnText}>📄 Export PDF</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.exportBtn, styles.excelBtn]}
          onPress={() => handleBulkExport('excel')}
          disabled={!!exporting}
        >
          {exporting === 'excel'
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.exportBtnText}>📊 Export Excel</Text>}
        </TouchableOpacity>
      </View>

      <Text style={styles.countText}>
        {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''} · sorted by project
      </Text>
    </>
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
        <Text style={styles.title}>Attendance Reports</Text>
        <Text style={styles.subtitle}>Search, filter by project & export</Text>
      </View>

      {isWeb ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
          {listHeader}
          <DataTable
            columns={reportTableColumns}
            rows={reportTableRows}
            emptyMessage="No employees match your search"
          />
        </ScrollView>
      ) : (
        <FlatList
          data={filteredEmployees}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderEmployee}
          contentContainerStyle={{ paddingBottom: 30 }}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No employees match your search</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2ff', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginTop: 50, marginBottom: 12 },
  back: { color: '#1a237e', fontSize: 16, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a237e' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4 },
  searchInput: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    fontSize: 14, marginBottom: 14, borderWidth: 1, borderColor: '#ddd', color: '#333',
  },
  sectionLabel: {
    fontSize: 13, fontWeight: 'bold', color: '#1a237e', marginBottom: 8,
  },
  projectScroll: { marginBottom: 14, maxHeight: 44 },
  presetScroll: { marginBottom: 14, maxHeight: 44 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
    backgroundColor: '#fff', marginRight: 8, elevation: 2,
  },
  chipActive: { backgroundColor: '#1a237e' },
  chipText: { fontSize: 12, fontWeight: 'bold', color: '#1a237e' },
  chipTextActive: { color: '#fff' },
  exportRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  exportBtn: {
    flex: 1, backgroundColor: '#c62828', padding: 12,
    borderRadius: 10, alignItems: 'center',
  },
  excelBtn: { backgroundColor: '#2e7d32' },
  exportBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  countText: { fontSize: 13, color: '#666', marginBottom: 12 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', marginBottom: 10, elevation: 3,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#1a237e', justifyContent: 'center', alignItems: 'center',
    marginRight: 14,
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cardBody: { flex: 1 },
  empName: { fontSize: 16, fontWeight: 'bold', color: '#1a237e' },
  empMobile: { fontSize: 13, color: '#666', marginTop: 2 },
  empProject: { fontSize: 11, color: '#3949ab', marginTop: 4, fontWeight: '600' },
  arrow: { fontSize: 24, color: '#1a237e' },
  tableProjectText: { fontSize: 12, color: '#3949ab', fontWeight: '600' },
  tableViewBtn: {
    backgroundColor: '#e8eaf6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6,
    alignSelf: 'flex-start',
  },
  tableViewBtnText: { color: '#1a237e', fontSize: 12, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },
});
