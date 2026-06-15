import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { clearStorage } from '../../utils/storage';

export default function DevDashboardScreen({ navigation }) {
  const handleLogout = async () => {
    await clearStorage();
    navigation.replace('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Developer Dashboard</Text>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('ManageEmployees')}>
        <Text style={styles.buttonText}>Manage Employees</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('ManageProjects')}>
        <Text style={styles.buttonText}>Manage Projects</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.logout]} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a237e', marginBottom: 24 },
  button: { backgroundColor: '#1a237e', padding: 16, borderRadius: 10, marginBottom: 12 },
  logout: { backgroundColor: '#c62828', marginTop: 'auto' },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
});
