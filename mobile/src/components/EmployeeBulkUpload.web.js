import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { bulkImportEmployeesAPI } from '../services/api';

const TEMPLATE_URL = '/employee_upload_template.csv';

export default function EmployeeBulkUpload({ onComplete }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleDownloadTemplate = () => {
    const link = document.createElement('a');
    link.href = TEMPLATE_URL;
    link.download = 'employee_upload_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await bulkImportEmployeesAPI(formData);
      const {
        projects_created,
        employees_created,
        assignments_created,
        rows_processed,
        rows_skipped,
        errors,
      } = res.data;

      const summary = [
        `Rows processed: ${rows_processed}`,
        `Projects created: ${projects_created}`,
        `Employees created: ${employees_created}`,
        `Assignments created: ${assignments_created}`,
        rows_skipped ? `Rows skipped: ${rows_skipped}` : null,
        errors?.length ? `Issues: ${errors.slice(0, 3).join('; ')}` : null,
      ].filter(Boolean).join('\n');

      Alert.alert('Upload complete', summary);
      onComplete?.();
    } catch (err) {
      Alert.alert('Upload failed', err.response?.data?.detail || 'Could not import file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.box}>
      <Text style={styles.title}>Bulk Upload (Excel / CSV)</Text>
      <Text style={styles.hint}>
        Columns: Project Name, Project Number, User Name, Mobile Number, Password.
        Existing projects and employees are reused; missing assignments are added.
      </Text>

      <View style={styles.row}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={handleDownloadTemplate}>
          <Text style={styles.secondaryBtnText}>Download sample template</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryBtn, uploading && styles.disabledBtn]}
          onPress={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.primaryBtnText}>Upload Excel / CSV</Text>}
        </TouchableOpacity>
      </View>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#c5cae9',
  },
  title: { fontSize: 15, fontWeight: '700', color: '#1a237e', marginBottom: 6 },
  hint: { fontSize: 12, color: '#666', marginBottom: 12, lineHeight: 18 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  primaryBtn: {
    backgroundColor: '#2e7d32',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 160,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  secondaryBtn: {
    backgroundColor: '#e8eaf6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 160,
  },
  secondaryBtnText: { color: '#1a237e', fontWeight: '700', fontSize: 13 },
  disabledBtn: { opacity: 0.7 },
});
