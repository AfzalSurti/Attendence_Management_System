import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getUser } from '../utils/storage';

// Auth
import LoginScreen from '../screens/auth/LoginScreen';

// Employee
import DashboardScreen from '../screens/employee/DashboardScreen';
import AttendanceScreen from '../screens/employee/AttendanceScreen';
import HistoryScreen from '../screens/employee/HistoryScreen';

// Developer
import DevDashboardScreen from '../screens/developer/DevDashboardScreen';
import ManageEmployeesScreen from '../screens/developer/ManageEmployeesScreen';
import ManageProjectsScreen from '../screens/developer/ManageProjectsScreen';
import EmployeeAttendanceScreen from '../screens/developer/EmployeeAttendanceScreen';

// Admin
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AttendanceReportScreen from '../screens/admin/AttendanceReportScreen';
import HolidayScreen from '../screens/admin/HolidayScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const user = await getUser();
      if (!user) {
        setInitialRoute('Login');
      } else if (user.role === 'admin') {
        setInitialRoute('AdminDashboard');
      } else if (user.role === 'developer') {
        setInitialRoute('DevDashboard');
      } else {
        setInitialRoute('Dashboard');
      }
    } catch {
      setInitialRoute('Login');
    }
  };

  if (!initialRoute) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1a237e" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false }}
      >
        {/* Auth */}
        <Stack.Screen name="Login" component={LoginScreen} />

        {/* Employee */}
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="Attendance" component={AttendanceScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />

        {/* Developer */}
        <Stack.Screen name="DevDashboard" component={DevDashboardScreen} />
        <Stack.Screen name="ManageEmployees" component={ManageEmployeesScreen} />
        <Stack.Screen name="ManageProjects" component={ManageProjectsScreen} />
        <Stack.Screen name="EmployeeAttendance" component={EmployeeAttendanceScreen} />

        {/* Admin */}
        <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
        <Stack.Screen name="AttendanceReport" component={AttendanceReportScreen} />
        <Stack.Screen name="Holidays" component={HolidayScreen} />
      </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});