import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Keyboard
} from 'react-native';
import { loginAPI } from '../../services/api';
import { saveToken, saveUser } from '../../utils/storage';

const getLoginErrorMessage = (err) => {
  if (err.response?.data?.detail) {
    return typeof err.response.data.detail === 'string'
      ? err.response.data.detail
      : 'Login failed. Try again.';
  }
  if (err.code === 'ECONNABORTED') {
    return 'Server took too long to respond. Check your network.';
  }
  if (err.message === 'Network Error' || !err.response) {
    return 'Cannot reach server. Use same Wi-Fi and start backend with: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000';
  }
  return 'Login failed. Try again.';
};

export default function LoginScreen({ navigation }) {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleMobileChange = (text) => {
    const digitsOnly = text.replace(/\D/g, '').slice(0, 10);
    setMobile(digitsOnly);
  };

  const handleLogin = async () => {
    if (!mobile || !password) {
      Alert.alert('Error', 'Please enter mobile number and password');
      return;
    }

    if (mobile.length !== 10) {
      Alert.alert('Error', 'Mobile number must be exactly 10 digits');
      return;
    }

    setLoading(true);
    Keyboard.dismiss();
    try {
      console.log('Login attempt:', mobile);
      const res = await loginAPI({
        mobile_number: mobile,
        password: password,
      });

      const { access_token, role, employee_id, name } = res.data;

      // Save token and user info
      await saveToken(access_token);
      await saveUser({ role, employee_id, name });

      // Redirect based on role
      if (role === 'admin') {
        navigation.replace('AdminDashboard');
      } else if (role === 'developer') {
        navigation.replace('DevDashboard');
      } else {
        navigation.replace('Dashboard');
      }

    } catch (err) {
      console.error('Login error:', err.message, err.code, err.response?.status);
      Alert.alert('Login Failed', getLoginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.card}>
        <Text style={styles.title}>Attendance System</Text>
        <Text style={styles.subtitle}>Login to continue</Text>

        <TextInput
          style={styles.input}
          placeholder="Mobile Number"
          placeholderTextColor="#999"
          keyboardType="number-pad"
          maxLength={10}
          value={mobile}
          onChangeText={handleMobileChange}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#999"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Login</Text>
          }
        </TouchableOpacity>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a237e',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  card: {
    backgroundColor: '#fff',
    width: '88%',
    borderRadius: 16,
    padding: 28,
    elevation: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a237e',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 28,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    marginBottom: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#1a237e',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});