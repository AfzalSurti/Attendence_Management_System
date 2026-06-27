import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Keyboard
} from 'react-native';
import { isWeb } from '../../utils/platform';
import { loginAPI } from '../../services/api';
import { saveToken, saveUser, clearStorage } from '../../utils/storage';
import { isEmployeeWebBlocked } from '../../utils/platform';
import GeoLoader from '../../components/GeoLoader';

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
    return 'Cannot reach server. Please check your internet connection and try again.';
  }
  return 'Login failed. Try again.';
};

export default function LoginScreen({ navigation }) {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

      if (isEmployeeWebBlocked(role)) {
        await clearStorage();
        Alert.alert(
          'Mobile App Only',
          'Employee attendance is available on the Android app only. Please install the APK on your phone.'
        );
        return;
      }

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
      {loading && (
        <View style={styles.loaderOverlay}>
          <GeoLoader message="Signing in..." />
        </View>
      )}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.card}>
        <Text style={styles.title}>Attendance System</Text>
        <Text style={styles.subtitle}>Geo Designs & Research</Text>
        <Text style={styles.loginHint}>
          {isWeb ? 'Admin & Developer web portal' : 'Login to continue'}
        </Text>
        {isWeb && (
          <Text style={styles.webNote}>
            Employees: please use the mobile Android app for attendance
          </Text>
        )}

        <TextInput
          style={styles.input}
          placeholder="Mobile Number"
          placeholderTextColor="#999"
          keyboardType="number-pad"
          maxLength={10}
          value={mobile}
          onChangeText={handleMobileChange}
        />

        <View style={styles.passwordWrap}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Password"
            placeholderTextColor="#999"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            style={styles.passwordToggle}
            onPress={() => setShowPassword((prev) => !prev)}
          >
            <Text style={styles.passwordToggleText}>
              {showPassword ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
        </View>

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
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
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
    fontSize: 13,
    color: '#1a237e',
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  loginHint: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  webNote: {
    fontSize: 12,
    color: '#5c6bc0',
    textAlign: 'center',
    marginBottom: 20,
    backgroundColor: '#e8eaf6',
    padding: 10,
    borderRadius: 8,
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
  passwordWrap: {
    position: 'relative',
    marginBottom: 16,
  },
  passwordInput: {
    marginBottom: 0,
    paddingRight: 70,
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    top: 14,
  },
  passwordToggleText: {
    color: '#1a237e',
    fontWeight: '700',
    fontSize: 13,
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